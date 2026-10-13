include .env
export

.PHONY: deploy verify deploy-verify

deploy:
	@echo "Running deployment script on Monad Testnet..."
	forge script script/Deploy.s.sol --rpc-url monad_testnet --chain 10143 --broadcast
	@node ../web/scripts/sync-deployment.mjs 10143

verify:
	@echo "Verifying contracts via sourcify on blockvision explorer..."
	@node -e "\
		const fs = require('fs'); \
		const run = JSON.parse(fs.readFileSync('broadcast/Deploy.s.sol/10143/run-latest.json', 'utf8')); \
		const core = run.transactions.find(tx => tx.contractName === 'BondlineCore').contractAddress; \
		const factory = run.transactions.find(tx => tx.contractName === 'CircleFactory').contractAddress; \
		const circle = run.transactions.find(tx => tx.contractName === 'Circle').contractAddress; \
		const exec = require('child_process').execSync; \
		const verifyCmd = (addr, pathName) => { \
			console.log('Verifying ' + pathName + ' at ' + addr + '...'); \
			try { \
				exec('forge verify-contract ' + addr + ' ' + pathName + ' --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/', {stdio: 'inherit'}); \
			} catch (e) { \
				console.log('Failed to verify ' + pathName + ' via sourcify. Fallback: run forge verify-contract manually.'); \
			} \
		}; \
		verifyCmd(circle, 'src/Circle.sol:Circle'); \
		verifyCmd(core, 'src/BondlineCore.sol:BondlineCore'); \
		verifyCmd(factory, 'src/CircleFactory.sol:CircleFactory'); \
	"

deploy-verify: deploy verify

deploy-mainnet:
	@echo "Running deployment script on Monad Mainnet..."
	forge script script/Deploy.s.sol --rpc-url monad_mainnet --chain 143 --broadcast
	@node ../web/scripts/sync-deployment.mjs 143

verify-mainnet:
	@echo "Verifying contracts via sourcify on blockvision explorer (mainnet)..."
	@node -e "\
		const fs = require('fs'); \
		const run = JSON.parse(fs.readFileSync('broadcast/Deploy.s.sol/143/run-latest.json', 'utf8')); \
		const core = run.transactions.find(tx => tx.contractName === 'BondlineCore').contractAddress; \
		const factory = run.transactions.find(tx => tx.contractName === 'CircleFactory').contractAddress; \
		const circle = run.transactions.find(tx => tx.contractName === 'Circle').contractAddress; \
		const exec = require('child_process').execSync; \
		const verifyCmd = (addr, pathName, extra) => { \
			console.log('Verifying ' + pathName + ' at ' + addr + '...'); \
			try { \
				exec('forge verify-contract ' + addr + ' ' + pathName + ' --chain 143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/' + (extra || ''), {stdio: 'inherit'}); \
			} catch (e) { \
				console.log('Failed to verify ' + pathName + ' via sourcify. Fallback: run forge verify-contract manually.'); \
			} \
		}; \
		verifyCmd(circle, 'src/Circle.sol:Circle'); \
		verifyCmd(core, 'src/BondlineCore.sol:BondlineCore'); \
		const args = exec('cast abi-encode \"constructor(address,address)\" ' + core + ' ' + circle).toString().trim(); \
		verifyCmd(factory, 'src/CircleFactory.sol:CircleFactory', ' --constructor-args ' + args); \
	"

deploy-verify-mainnet: deploy-mainnet verify-mainnet