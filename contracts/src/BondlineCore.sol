// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BondlineMath} from "./BondlineMath.sol";
import {Circle} from "./Circle.sol";
import {CircleFactory} from "./CircleFactory.sol";

/// @title BondlineCore
/// @notice The central Bond + cosign engine for Bondline. Friends stake MON
///         against their own deadlines; cross the Line and the stake funds their
///         Circle's Pot, beat it and they're refunded once enough of the Circle
///         cosigns.
///
///         All Bonds, cosigns, and resolution live here, keyed by the Circle
///         (a Circle clone) they belong to. The core is the sole address
///         authorized to move any Circle's money — Circles themselves hold only
///         membership, threshold, and balance. This split keeps every Circle's
///         Pot isolated while the cosign logic and threshold math live in one
///         audited place.
contract BondlineCore is ReentrancyGuard {
    using BondlineMath for uint256;

    /// @notice Fixed window opened by declareDone during which the Circle cosigns
    ///         a Bond. Chosen to be short enough to keep momentum but long enough
    ///         that a distributed friend group can weigh in.
    uint64 public constant COSIGN_WINDOW = 24 hours;

    /// @notice Ceiling on a single stake — keeps stake in uint96 for packing and
    ///         guards against fat-finger deposits on an unaudited testnet build.
    uint96 public constant MAX_STAKE = 1_000_000 ether;

    enum Status {
        Active, // staked, deadline running, not yet declared
        PendingCosign, // creator declared met, Circle is cosigning
        Met, // cleared -> creator refunded
        Crossed // objected or lapsed -> stake sent to the Circle's Pot
    }

    struct Bond {
        address creator;
        address circle;
        uint96 stake;
        uint64 deadline;
        uint64 cosignClosesAt; // set when declareDone flips to PendingCosign
        Status status;
        uint32 cosigns;
        uint32 objections;
        string description;
        bytes32 receiptsHash;
        string receiptsUri;
    }

    struct Payout {
        address circle;
        address to;
        uint96 amount;
        bool executed;
        uint32 cosigns;
        string memo;
    }

    CircleFactory public factory;
    address public immutable deployer;

    uint64 public constant PERIOD = 7 days;
    uint64 public constant MAX_DURATION = 30 days;
    enum VerifierType { CircleReview, OnchainBalance, External }
    struct Verification {
        VerifierType kind;
        address verifier;
        uint96 targetBalance;
        bytes32 conditionHash;
        uint64 createdAt;
    }
    mapping(uint256 => Verification) public verification;
    mapping(uint256 => string) public verificationSpec;
    mapping(address => bool) public isTrustedVerifier;
    event VerifierTrustChanged(address indexed verifier, bool trusted);
    function setTrustedVerifier(address verifier, bool trusted) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (verifier == address(0)) revert ZeroAddress();
        isTrustedVerifier[verifier] = trusted;
        emit VerifierTrustChanged(verifier, trusted);
    }
    mapping(uint256 => uint256) public eligibleAtCreation;
    mapping(uint256 => mapping(address => bool)) public hasBacked;
    mapping(uint256 => uint32) public backerCount;
    mapping(address => bool) public isTester;
    uint256 public testerCount;
    uint256 public totalSocialCosigns;
    mapping(address => mapping(address => bool)) public hasSupportedCreator;
    mapping(address => uint256) public uniqueCosigners;
    event TesterJoined(address indexed tester);
    function joinTesterCohort() external {
        if (isTester[msg.sender]) revert AlreadyBacked();
        isTester[msg.sender] = true;
        testerCount += 1;
        emit TesterJoined(msg.sender);
    }
    function _recordSupport(address creator, address supporter) private {
        if (!hasSupportedCreator[creator][supporter]) {
            hasSupportedCreator[creator][supporter] = true;
            uniqueCosigners[creator] += 1;
        }
    }
    mapping(address => uint256) public refundCredit;
    mapping(address => mapping(uint256 => uint256)) public periodPot;
    mapping(address => mapping(uint256 => uint256)) public periodPending;
    mapping(address => mapping(uint256 => uint256)) public periodSuccesses;
    mapping(address => mapping(uint256 => mapping(address => uint256))) public memberSuccesses;
    mapping(address => mapping(uint256 => mapping(address => bool))) public rewardClaimed;
    mapping(address => uint256) public reservedPot;
    mapping(address => mapping(uint256 => uint256)) public rewardPool;
    mapping(address => mapping(uint256 => bool)) public periodClosed;

    event CommitmentBacked(uint256 indexed id, address indexed backer, uint32 count);
    event VerificationConfigured(uint256 indexed id, VerifierType kind, address verifier, bytes32 conditionHash);
    event CommitmentVerified(uint256 indexed id, bool success, bytes32 evidenceHash);
    event PotRewardClaimed(address indexed circle, uint256 indexed period, address indexed member, uint256 amount);
    event PotPeriodClosed(address indexed circle, uint256 indexed period, uint256 amount, uint256 successes);
    event RefundCredited(address indexed creator, uint256 amount);
    error InvalidCondition();
    error WrongVerifier();
    error PeriodNotReady();
    error NoReward();
    error AlreadyBacked();
    error InvalidDescription();
    error DurationTooLong();

    function protocolVersion() external pure returns (uint256) { return 2; }

    Bond[] private _bonds;
    /// @dev bond id => cosigner => responded already (creator excluded from voting)
    mapping(uint256 => mapping(address => bool)) public hasResponded;

    Payout[] private _payouts;
    mapping(uint256 => uint256) public payoutEligible;
    /// @dev payout id => member => cosigned already
    mapping(uint256 => mapping(address => bool)) public hasCosignedPayout;

    // --- errors ---
    error FactoryAlreadySet();
    error FactoryNotSet();
    error OnlyDeployer();
    error ZeroAddress();
    error UnknownCircle();
    error NotCircleMember();
    error StakeRequired();
    error StakeTooLarge();
    error DeadlineInPast();
    error NoSuchBond();
    error NotCreator();
    error NotActive();
    error DeadlinePassed();
    error ReceiptRequired();
    error DeadlineNotReached();
    error NotPending();
    error CreatorCannotCosign();
    error AlreadyResponded();
    error AlreadyCosignedPayout();
    error CosignClosed();
    error CosignStillOpen();
    error TransferFailed();
    error NoSuchPayout();
    error InsufficientPotBalance();
    error AlreadyExecuted();

    // --- events ---
    event BondOpened(
        uint256 indexed id,
        address indexed creator,
        address indexed circle,
        uint256 stake,
        uint64 deadline,
        string description
    );
    event BondDeclared(
        uint256 indexed id, address indexed creator, uint64 cosignClosesAt, bytes32 receiptsHash, string receiptsUri
    );
    event Cosigned(uint256 indexed id, address indexed cosigner, uint32 cosigns);
    event Objected(uint256 indexed id, address indexed objector, uint32 objections);
    event BondResolved(uint256 indexed id, Status status, uint256 stake);

    event PayoutProposed(
        uint256 indexed payoutId, address indexed circle, address indexed to, uint256 amount, string memo
    );
    event PayoutCosigned(uint256 indexed payoutId, address indexed member, uint32 cosigns);
    event PayoutExecuted(uint256 indexed payoutId, address indexed circle, address to, uint256 amount);

    constructor() {
        deployer = msg.sender;
        isTrustedVerifier[msg.sender] = true;
    }

    /// @notice Wire the factory once, after both are deployed (they reference
    ///         each other, so one must learn the other post-construction).
    function setFactory(address factory_) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (address(factory) != address(0)) revert FactoryAlreadySet();
        if (factory_ == address(0)) revert ZeroAddress();
        factory = CircleFactory(factory_);
    }

    // --- Bond lifecycle ---

    /// @notice Stake MON against a personal deadline, tied to a Circle you're in.
    ///         Cross the Line (or fail the cosign) and the stake funds the Pot.
    function openBond(address circle, string calldata description, uint64 deadline)
        public
        payable
        returns (uint256 id)
    {
        if (address(factory) == address(0)) revert FactoryNotSet();
        if (!factory.isCircle(circle)) revert UnknownCircle();
        if (!Circle(circle).isMember(msg.sender)) revert NotCircleMember();
        if (msg.value == 0) revert StakeRequired();
        if (msg.value > MAX_STAKE) revert StakeTooLarge();
        if (deadline <= block.timestamp) revert DeadlineInPast();
        if (deadline > block.timestamp + MAX_DURATION) revert DurationTooLong();
        if (bytes(description).length == 0 || bytes(description).length > 280) revert InvalidDescription();

        id = _bonds.length;
        _bonds.push(
            Bond({
                creator: msg.sender,
                circle: circle,
                stake: uint96(msg.value),
                deadline: deadline,
                cosignClosesAt: 0,
                status: Status.Active,
                cosigns: 0,
                objections: 0,
                description: description,
                receiptsHash: bytes32(0),
                receiptsUri: ""
            })
        );

        eligibleAtCreation[id] = Circle(circle).memberCount() - 1;
        verification[id].createdAt = uint64(block.timestamp);
        periodPending[circle][deadline / PERIOD] += 1;
        emit BondOpened(id, msg.sender, circle, msg.value, deadline, description);
    }

    /// @notice Conditions are bound to escrow at creation and cannot be changed.
    function openVerifiedBond(address circle, string calldata description, uint64 deadline,
        VerifierType kind, address verifier, uint96 targetBalance, string calldata spec)
        external payable returns (uint256 id)
    {
        bytes32 conditionHash = keccak256(bytes(spec));
        if (bytes(spec).length > 512) revert InvalidCondition();
        if (kind == VerifierType.CircleReview) revert InvalidCondition();
        if (kind == VerifierType.OnchainBalance) {
            if (targetBalance == 0 || verifier != address(0)) revert InvalidCondition();
        } else if (verifier == address(0) || verifier == msg.sender || !isTrustedVerifier[verifier] || bytes(spec).length == 0) {
            revert InvalidCondition();
        }
        id = openBond(circle, description, deadline);
        verification[id] = Verification(kind, verifier, targetBalance, conditionHash, uint64(block.timestamp));
        verificationSpec[id] = spec;
        emit VerificationConfigured(id, kind, verifier, conditionHash);
    }

    /// @notice Public encouragement is separate from evidence review and cannot settle funds.
    function backCommitment(uint256 id) external {
        Bond storage b = _get(id);
        if (b.status != Status.Active || block.timestamp >= b.deadline) revert NotActive();
        if (msg.sender == b.creator) revert CreatorCannotCosign();
        if (!Circle(b.circle).isMember(msg.sender)) revert NotCircleMember();
        if (hasBacked[id][msg.sender]) revert AlreadyBacked();
        hasBacked[id][msg.sender] = true;
        backerCount[id] += 1;
        totalSocialCosigns += 1;
        _recordSupport(b.creator, msg.sender);
        emit CommitmentBacked(id, msg.sender, backerCount[id]);
    }

    /// @notice Anyone can prove the configured balance target before the deadline.
    function verifyBalance(uint256 id) external nonReentrant {
        Bond storage b = _get(id);
        if (b.status != Status.Active) revert NotActive();
        if (block.timestamp >= b.deadline) revert DeadlinePassed();
        Verification memory v = verification[id];
        if (v.kind != VerifierType.OnchainBalance) revert WrongVerifier();
        if (b.creator.balance < v.targetBalance) revert InvalidCondition();
        emit CommitmentVerified(id, true, keccak256(abi.encode(b.creator.balance, block.number)));
        _resolve(id, b, true);
    }

    /// @notice External attestor is explicitly trusted, fixed at creation, and cannot be creator.
    ///         Success must be observed before deadline; failure may only finalize after it.
    function attest(uint256 id, bool success, bytes32 conditionHash, bytes32 evidenceHash) external nonReentrant {
        Bond storage b = _get(id);
        Verification memory v = verification[id];
        if (v.kind != VerifierType.External || msg.sender != v.verifier) revert WrongVerifier();
        if (b.status != Status.Active) revert NotActive();
        if (conditionHash != v.conditionHash || evidenceHash == bytes32(0)) revert InvalidCondition();
        if (success && block.timestamp >= b.deadline) revert DeadlinePassed();
        if (!success && block.timestamp < b.deadline) revert DeadlineNotReached();
        b.receiptsHash = evidenceHash;
        emit CommitmentVerified(id, success, evidenceHash);
        _resolve(id, b, success);
    }

    /// @notice Creator declares they are done before the deadline. This is a
    ///         self-report only — it freezes the clock and opens the cosign
    ///         window but does NOT mean the Bond is Met. "Met" is reserved for
    ///         when the Circle's cosigns clear the threshold.
    function declareDone(uint256 id, bytes32 receiptsHash, string calldata receiptsUri) external {
        Bond storage b = _get(id);
        if (msg.sender != b.creator) revert NotCreator();
        if (verification[id].kind != VerifierType.CircleReview) revert WrongVerifier();
        if (b.status != Status.Active) revert NotActive();
        if (block.timestamp >= b.deadline) revert DeadlinePassed();
        if (receiptsHash == bytes32(0) || bytes(receiptsUri).length == 0) revert ReceiptRequired();

        b.status = Status.PendingCosign;
        b.cosignClosesAt = uint64(block.timestamp) + COSIGN_WINDOW;
        b.receiptsHash = receiptsHash;
        b.receiptsUri = receiptsUri;

        emit BondDeclared(id, msg.sender, b.cosignClosesAt, receiptsHash, receiptsUri);
    }

    /// @notice Strictly approve a pending Bond. "Cosign" means endorse — only
    ///         call this if you believe the creator shipped. Resolves immediately
    ///         when the threshold is cleared.
    function cosign(uint256 id) external nonReentrant {
        _review(id, true);
    }

    /// @notice Strictly object to a pending Bond. Resolves immediately if
    ///         objections make the cosign bar unreachable.
    function object(uint256 id) external nonReentrant {
        _review(id, false);
    }

    /// @dev Shared logic for cosign() and object(). confirm=true means approve.
    function _review(uint256 id, bool confirm) private {
        Bond storage b = _get(id);
        if (b.status != Status.PendingCosign) revert NotPending();
        if (block.timestamp >= b.cosignClosesAt) revert CosignClosed();
        if (msg.sender == b.creator) revert CreatorCannotCosign();
        if (!Circle(b.circle).isMember(msg.sender) || Circle(b.circle).memberIndex(msg.sender) > eligibleAtCreation[id] + 1) revert NotCircleMember();
        if (hasResponded[id][msg.sender]) revert AlreadyResponded();

        hasResponded[id][msg.sender] = true;
        if (confirm) {
            b.cosigns += 1;
            _recordSupport(b.creator, msg.sender);
            emit Cosigned(id, msg.sender, b.cosigns);
        } else {
            b.objections += 1;
            emit Objected(id, msg.sender, b.objections);
        }

        uint256 eligible = eligibleAtCreation[id];
        uint256 required = BondlineMath.requiredCosigns(eligible, Circle(b.circle).cosignThresholdBps());

        if (BondlineMath.isCleared(b.cosigns, required)) {
            _resolve(id, b, true);
        } else if (BondlineMath.isUnreachable(eligible, b.objections, required)) {
            _resolve(id, b, false);
        }
    }

    /// @notice Permissionlessly cross a Bond whose creator blew the deadline
    ///         without ever declaring. This is the "cross the Line and your stake
    ///         funds the group" path — without it, a creator who simply never
    ///         declares would trap their own stake in Active forever. Anyone can
    ///         trigger it once the deadline passes.
    function crossMissed(uint256 id) external nonReentrant {
        Bond storage b = _get(id);
        if (b.status != Status.Active) revert NotActive();
        if (block.timestamp < b.deadline) revert DeadlineNotReached();
        _resolve(id, b, false);
    }

    /// @notice Resolve a Bond whose cosign window has closed without an automatic
    ///         resolution. Permissionless. Clears iff cosigns met the bar at
    ///         close; otherwise crosses — ties and under-threshold resolve against
    ///         the creator, consistent with "silence crosses the Line".
    function resolveExpired(uint256 id) external nonReentrant {
        Bond storage b = _get(id);
        if (b.status != Status.PendingCosign) revert NotPending();
        if (block.timestamp < b.cosignClosesAt) revert CosignStillOpen();

        uint256 eligible = eligibleAtCreation[id];
        uint256 required = BondlineMath.requiredCosigns(eligible, Circle(b.circle).cosignThresholdBps());
        _resolve(id, b, BondlineMath.isCleared(b.cosigns, required));
    }

    /// @dev Settle a Bond exactly once. Clearing refunds the creator; crossing
    ///      routes the stake into the Circle's Pot. Effects (status flip) happen
    ///      before the external value move (CEI), and the whole path is
    ///      nonReentrant.
    function _resolve(uint256 id, Bond storage b, bool cleared) private {
        uint256 stake = b.stake;
        uint256 epoch = b.deadline / PERIOD;
        periodPending[b.circle][epoch] -= 1;
        if (cleared) {
            b.status = Status.Met;
            periodSuccesses[b.circle][epoch] += 1;
            memberSuccesses[b.circle][epoch][b.creator] += 1;
            // A rejecting recipient cannot prevent settlement. Credit remains withdrawable to another address.
            (bool ok, ) = payable(b.creator).call{value: stake, gas: 50_000}("");
            if (!ok) {
                refundCredit[b.creator] += stake;
                emit RefundCredited(b.creator, stake);
            }
        } else {
            b.status = Status.Crossed;
            periodPot[b.circle][epoch] += stake;
            reservedPot[b.circle] += stake;
            Circle(b.circle).fundPot{value: stake}();
        }
        emit BondResolved(id, b.status, stake);
    }

    function withdrawRefund(address payable to) external nonReentrant {
        uint256 amount = refundCredit[msg.sender];
        if (amount == 0 || to == address(0)) revert NoReward();
        refundCredit[msg.sender] = 0;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Close a deadline week once every commitment has settled. Equal weight per success.
    ///         Empty-success weeks roll into the following week; rounding dust remains reserved there.
    function closePeriod(address circle, uint256 epoch) public {
        if (epoch >= block.timestamp / PERIOD || periodPending[circle][epoch] != 0) revert PeriodNotReady();
        if (periodClosed[circle][epoch]) revert AlreadyExecuted();
        periodClosed[circle][epoch] = true;
        uint256 pot = periodPot[circle][epoch];
        uint256 successes = periodSuccesses[circle][epoch];
        uint256 pool = successes == 0 ? 0 : (pot / successes) * successes;
        rewardPool[circle][epoch] = pool;
        // Roll forward to the first not-yet-closed current/future week in O(1).
        uint256 next = block.timestamp / PERIOD;
        periodPot[circle][next] += pot - pool;
        emit PotPeriodClosed(circle, epoch, pool, successes);
    }

    function claimReward(address circle, uint256 epoch, address payable to) external nonReentrant {
        if (!periodClosed[circle][epoch]) closePeriod(circle, epoch);
        if (rewardClaimed[circle][epoch][msg.sender] || to == address(0)) revert NoReward();
        uint256 successes = periodSuccesses[circle][epoch];
        uint256 amount = successes == 0 ? 0 : rewardPool[circle][epoch] / successes * memberSuccesses[circle][epoch][msg.sender];
        if (amount == 0) revert NoReward();
        rewardClaimed[circle][epoch][msg.sender] = true;
        reservedPot[circle] -= amount;
        Circle(circle).payout(to, amount);
        emit PotRewardClaimed(circle, epoch, msg.sender, amount);
    }

    // --- Pot payouts (unreserved surplus only) ---

    /// @notice Propose paying out MON from a Circle's Pot. Proposer must be a
    ///         member and auto-cosigns. Requires the Circle to currently hold at
    ///         least `amount`. Gated by the same per-Circle threshold as Bonds,
    ///         but over the full membership (a payout has no "creator" to exclude
    ///         — everyone including the proposer is an eligible cosigner).
    function proposePayout(address circle, address to, uint96 amount, string calldata memo)
        external
        nonReentrant
        returns (uint256 payoutId)
    {
        if (!factory.isCircle(circle)) revert UnknownCircle();
        if (!Circle(circle).isMember(msg.sender)) revert NotCircleMember();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > Circle(circle).balance() - reservedPot[circle]) revert InsufficientPotBalance();

        payoutId = _payouts.length;
        _payouts.push(
            Payout({circle: circle, to: to, amount: amount, executed: false, cosigns: 1, memo: memo})
        );
        payoutEligible[payoutId] = Circle(circle).memberCount();
        hasCosignedPayout[payoutId][msg.sender] = true;
        emit PayoutProposed(payoutId, circle, to, amount, memo);
        emit PayoutCosigned(payoutId, msg.sender, 1);

        _maybeExecutePayout(payoutId, circle);
    }

    /// @notice Cosign a pending payout. Executes automatically once the Circle's
    ///         threshold (over full membership) is cleared.
    function cosignPayout(uint256 payoutId) external nonReentrant {
        if (payoutId >= _payouts.length) revert NoSuchPayout();
        Payout storage p = _payouts[payoutId];
        if (p.executed) revert AlreadyExecuted();
        if (!Circle(p.circle).isMember(msg.sender) || Circle(p.circle).memberIndex(msg.sender) > payoutEligible[payoutId]) revert NotCircleMember();
        if (hasCosignedPayout[payoutId][msg.sender]) revert AlreadyCosignedPayout();

        hasCosignedPayout[payoutId][msg.sender] = true;
        p.cosigns += 1;
        emit PayoutCosigned(payoutId, msg.sender, p.cosigns);

        _maybeExecutePayout(payoutId, p.circle);
    }

    /// @dev Execute the payout when cosigns clear the Circle threshold. Full
    ///      membership is the eligible set for payouts.
    function _maybeExecutePayout(uint256 payoutId, address circle) private {
        Payout storage p = _payouts[payoutId];
        uint256 eligible = payoutEligible[payoutId];
        uint256 required = BondlineMath.requiredCosigns(eligible, Circle(circle).cosignThresholdBps());
        if (!BondlineMath.isCleared(p.cosigns, required)) return;
        if (p.amount > Circle(circle).balance() - reservedPot[circle] - reservedPot[circle]) revert InsufficientPotBalance();

        p.executed = true; // effects before interaction
        Circle(circle).payout(p.to, p.amount);
        emit PayoutExecuted(payoutId, circle, p.to, p.amount);
    }

    // --- views ---

    /// @notice Eligible cosigners on a Bond = Circle members minus the creator.
    function _eligibleCosigners(address circle) private view returns (uint256) {
        return Circle(circle).memberCount() - 1;
    }

    /// @notice Live resolution snapshot for a pending Bond, for the cosign UI:
    ///         eligible cosigners, cosigns required, current confirms/objections,
    ///         and whether either resolution condition is already met.
    function cosignState(uint256 id)
        external
        view
        returns (uint256 eligible, uint256 required, uint32 confirms, uint32 objections, bool clearedNow, bool crossableNow)
    {
        Bond storage b = _get(id);
        eligible = _eligibleCosigners(b.circle);
        required = BondlineMath.requiredCosigns(eligible, Circle(b.circle).cosignThresholdBps());
        confirms = b.cosigns;
        objections = b.objections;
        clearedNow = BondlineMath.isCleared(confirms, required);
        crossableNow = BondlineMath.isUnreachable(eligible, objections, required);
    }

    function bonds(uint256 id)
        external
        view
        returns (
            address creator,
            address circle,
            uint96 stake,
            uint64 deadline,
            uint64 cosignClosesAt,
            Status status,
            uint32 cosigns,
            uint32 objections,
            string memory description,
            bytes32 receiptsHash,
            string memory receiptsUri
        )
    {
        Bond storage b = _get(id);
        return (
            b.creator,
            b.circle,
            b.stake,
            b.deadline,
            b.cosignClosesAt,
            b.status,
            b.cosigns,
            b.objections,
            b.description,
            b.receiptsHash,
            b.receiptsUri
        );
    }

    function bondCount() external view returns (uint256) {
        return _bonds.length;
    }

    function payouts(uint256 id)
        external
        view
        returns (address circle, address to, uint96 amount, bool executed, uint32 cosigns, string memory memo)
    {
        if (id >= _payouts.length) revert NoSuchPayout();
        Payout storage p = _payouts[id];
        return (p.circle, p.to, p.amount, p.executed, p.cosigns, p.memo);
    }

    function payoutCount() external view returns (uint256) {
        return _payouts.length;
    }

    function _get(uint256 id) private view returns (Bond storage) {
        if (id >= _bonds.length) revert NoSuchBond();
        return _bonds[id];
    }
}
