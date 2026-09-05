import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Running sanity check on network:", hre.network.name);

  const contractInfoPath = path.join(__dirname, "../../frontend/src/contractInfo.json");
  if (!fs.existsSync(contractInfoPath)) {
    throw new Error("contractInfo.json not found! Please run deploy.js first.");
  }

  const { address, abi } = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"));
  console.log("Connecting to contract at address:", address);

  const [signer] = await hre.ethers.getSigners();
  console.log("Connected using signer:", signer ? signer.address : "No signer");

  const escrow = new hre.ethers.Contract(address, abi, signer || hre.ethers.provider);

  const jobCount = await escrow.getJobCount();

  console.log("\n==========================================");
  console.log("Sanity Check Passed!");
  console.log("Live Contract Address:", address);
  console.log("Current Total Jobs Count:", jobCount.toString());
  console.log("==========================================\n");
}

main().catch((error) => {
  console.error("Sanity check failed:", error);
  process.exitCode = 1;
});
