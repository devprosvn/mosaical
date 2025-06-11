
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying contracts to devpros chainlet with JSON output...');
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "DPSV");

  // Prepare JSON output structure following Solidity compiler spec
  const outputJson = {
    contracts: {},
    sources: {},
    version: "0.8.21"
  };

  // Contract deployment order and dependencies
  const contracts = [
    { name: "MockGameNFT", args: ["Test Game NFT", "TGNFT"] },
    { name: "GovernanceToken", args: ["Devpros Governance", "DPSGOV"] },
    { name: "GameFiOracleV3", args: [] },
    { name: "NFTVaultV3", args: ["oracle"] }, // Will be replaced with actual address
    { name: "MosaicalGovernance", args: ["govToken"] }, // Will be replaced with actual address
    { name: "DPOTokenV3", args: [] },
    { name: "LoanManagerV3", args: ["vault", "dpoToken"] }, // Will be replaced with actual addresses
    { name: "MosaicalSagaBridge", args: ["0xcca6F4EA7e82941535485C2363575404C3061CD2"] }
  ];

  const deployedContracts = {};

  for (const contractInfo of contracts) {
    console.log(`\n📝 Deploying ${contractInfo.name}...`);
    
    try {
      // Get contract factory from the flattened contracts.sol
      const ContractFactory = await hre.ethers.getContractFactory(contractInfo.name, {
        sourceName: "contracts/contracts.sol"
      });
      
      // Replace placeholder args with actual addresses
      let deployArgs = contractInfo.args.map(arg => {
        if (arg === "oracle") return deployedContracts.GameFiOracleV3;
        if (arg === "govToken") return deployedContracts.GovernanceToken;
        if (arg === "vault") return deployedContracts.NFTVaultV3;
        if (arg === "dpoToken") return deployedContracts.DPOTokenV3;
        return arg;
      });

      const contract = await ContractFactory.deploy(...deployArgs);
      await contract.waitForDeployment();
      
      const contractAddress = await contract.getAddress();
      deployedContracts[contractInfo.name] = contractAddress;
      
      console.log(`✅ ${contractInfo.name} deployed to: ${contractAddress}`);

      // Get contract artifact for JSON output from the flattened file
      const artifactPath = path.join(__dirname, `../artifacts/contracts/contracts.sol/${contractInfo.name}.json`);
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Add to contracts output following Solidity compiler format
        if (!outputJson.contracts[`contracts/contracts.sol`]) {
          outputJson.contracts[`contracts/contracts.sol`] = {};
        }
        
        outputJson.contracts[`contracts/contracts.sol`][contractInfo.name] = {
          abi: artifact.abi,
          evm: {
            bytecode: {
              object: artifact.bytecode,
              linkReferences: {},
              sourceMap: artifact.deployedSourceMap || ""
            },
            deployedBytecode: {
              object: artifact.deployedBytecode,
              linkReferences: {},
              sourceMap: artifact.deployedSourceMap || ""
            },
            gasEstimates: {
              creation: {
                codeDepositCost: "0",
                executionCost: "0"
              },
              external: {}
            }
          },
          metadata: JSON.stringify({
            compiler: { version: "0.8.21" },
            language: "Solidity",
            output: {
              abi: artifact.abi,
              devdoc: {},
              userdoc: {}
            },
            settings: {
              compilationTarget: {
                [`contracts/contracts.sol`]: contractInfo.name
              },
              evmVersion: "shanghai",
              libraries: {},
              metadata: {
                bytecodeHash: "ipfs"
              },
              optimizer: {
                enabled: true,
                runs: 200
              },
              remappings: []
            },
            sources: {
              [`contracts/contracts.sol`]: {
                keccak256: "0x0000000000000000000000000000000000000000000000000000000000000000",
                urls: [`contracts/contracts.sol`]
              }
            },
            version: 1
          }),
          // Custom deployment info
          deploymentInfo: {
            address: contractAddress,
            transactionHash: contract.deploymentTransaction()?.hash || "",
            blockNumber: 0,
            deployer: deployer.address,
            constructorArgs: deployArgs,
            timestamp: new Date().toISOString(),
            network: "devpros",
            chainId: 2749656616387000
          }
        };

        // Add source info
        const sourcePath = `contracts/contracts.sol`;
        if (!outputJson.sources[sourcePath]) {
          outputJson.sources[sourcePath] = {
            id: Object.keys(outputJson.sources).length,
            ast: {}
          };
        }
      }

    } catch (error) {
      console.error(`❌ Failed to deploy ${contractInfo.name}:`, error.message);
      continue;
    }
  }

  // Save deployment info in multiple formats
  const deploymentInfo = {
    network: "devpros",
    chainletId: "devpros_2749656616387000-1",
    rpcUrl: "https://devpros-2749656616387000-1.jsonrpc.sagarpc.io",
    blockExplorer: "https://devpros-2749656616387000-1.sagaexplorer.io",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts
  };

  // Save simple deployment info
  const deploymentPath = path.join(__dirname, '../deployments/devpros-deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);

  // Save Solidity compiler format JSON
  const solcOutputPath = path.join(__dirname, '../deployments/devpros-solc-output.json');
  fs.writeFileSync(solcOutputPath, JSON.stringify(outputJson, null, 2));
  console.log(`📄 Solidity compiler JSON output saved to: ${solcOutputPath}`);

  console.log('\n🎉 All contracts deployed successfully!');
  console.log('\n📋 Deployed Contracts:');
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });

  console.log(`\n🔗 Block Explorer: https://devpros-2749656616387000-1.sagaexplorer.io`);
  console.log(`🔗 RPC Endpoint: https://devpros-2749656616387000-1.jsonrpc.sagarpc.io`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
