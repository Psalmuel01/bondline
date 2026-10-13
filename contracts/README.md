# Bondline contracts

The v2 suite implements native MON escrow, Circle-reviewed and configured automatic verification, separate social backing, frozen evidence-review eligibility, isolated Circle Pots, and reserved deadline-week rewards. Contract code has not been independently audited.

## Source

- `BondlineCore.sol`: commitments, escrow, evidence, verification, settlement, refund credits, and reward accounting.
- `Circle.sol`: member invitations/acceptance, threshold, and the Circle’s own Pot.
- `CircleFactory.sol`: clone deployment and the Circle registry.
- `BondlineMath.sol`: shared threshold calculation.

The current v2 public manifest is [monad-testnet.json](../docs/deployments/monad-testnet.json), chain 10143. The historical v1 mainnet deployment uses different Pot rules and addresses.

## Build and test

Install Foundry through its [official guide](https://book.getfoundry.sh/). From the repository root:

```bash
forge build --root contracts --offline
forge test --root contracts --offline
```

Offline commands require the configured Solidity compiler to already be installed. Tests cover commitment lifecycle, thresholds, access control, reentrancy, frozen reviewers, backing separate from evidence, reserved reward pools, and failed refund handling.

## Deployment commands

These commands broadcast transactions and spend the configured deployer’s funds. Review `.env`, the target chain, balance, script, and fees before running. No deployment is required to change the website.

```bash
cd contracts
cp .env.example .env
# Configure the intended funded signing account without committing the file.
make deploy          # Monad testnet, explicit chain 10143
make verify
```

The Makefile runs `web/scripts/sync-deployment.mjs` after deployment. The helper updates the matching chain, RPCs, addresses, protocol version, deployment block, and public receipt manifest while preserving unrelated `.env.local` values. Back up configuration and inspect the resulting diff before deploying the frontend.

`make deploy-mainnet` and `make verify-mainnet` target chain 143 and use real MON. Do not run them accidentally as a local setup step. Do not combine new addresses with an old cursor or database from another chain.

After deployment, verify source on the matching explorer, review receipt status, record the manifest, authorize only intended external verifiers, and initialize the event pipeline from the deployment block. The application and server RPC must agree with the manifest.

## Trust model

Core settlement code is not an upgradeable proxy over escrow. The administrator manages the external-verifier registry; Circle decisions depend on eligible peers, and external outcomes depend on the chosen attestor. Contract tests, source verification, and immutable bytecode do not eliminate bugs or make the system audited.

See the [security guide](https://bondline-circle.vercel.app/docs/security), [contract reference](https://bondline-circle.vercel.app/docs/contracts), and [developer setup](https://bondline-circle.vercel.app/docs/environment).
