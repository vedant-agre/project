import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying Escrow contract to network:", hre.network.name);

  const EscrowFactory = await hre.ethers.getContractFactory("Escrow");
  const escrow = await EscrowFactory.deploy();

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  const txHash = escrow.deploymentTransaction().hash;

  console.log("\n==========================================");
  console.log("Escrow Contract Deployed Successfully!");
  console.log("Contract Address:", address);
  console.log("Transaction Hash:", txHash);
  console.log("==========================================\n");

  // Read artifact ABI
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/Escrow.sol/Escrow.json"
  );
  const artifactRaw = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw);

  const contractInfo = {
    address: address,
    abi: artifact.abi,
  };

  // Write contractInfo.json to frontend/src/contractInfo.json
  const targetDir = path.join(__dirname, "../../frontend/src");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, "contractInfo.json");
  fs.writeFileSync(targetPath, JSON.stringify(contractInfo, null, 2));

  console.log("Wrote contract address & ABI to:", targetPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
