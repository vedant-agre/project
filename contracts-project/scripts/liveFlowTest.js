import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statusNames = ["Pending", "Delivered", "Approved", "Disputed", "Resolved"];

async function main() {
  console.log("=================================================");
  console.log("Starting Live Sepolia Escrow End-to-End Test Flow");
  console.log("Network:", hre.network.name);
  console.log("=================================================\n");

  const clientKey = process.env.CLIENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const freelancerKey = process.env.FREELANCER_PRIVATE_KEY;
  const arbitratorKey = process.env.ARBITRATOR_PRIVATE_KEY;

  if (!clientKey || !freelancerKey || !arbitratorKey) {
    throw new Error(
      "Missing required environment variables in .env.\n" +
      "Please ensure CLIENT_PRIVATE_KEY, FREELANCER_PRIVATE_KEY, and ARBITRATOR_PRIVATE_KEY are set."
    );
  }

  const provider = hre.ethers.provider;
  const clientSigner = new hre.ethers.Wallet(clientKey, provider);
  const freelancerSigner = new hre.ethers.Wallet(freelancerKey, provider);
  const arbitratorSigner = new hre.ethers.Wallet(arbitratorKey, provider);

  // Step 1 & 2: Connect to deployed contract and set up signers
  const contractInfoPath = path.join(__dirname, "../../frontend/src/contractInfo.json");
  if (!fs.existsSync(contractInfoPath)) {
    throw new Error("frontend/src/contractInfo.json not found!");
  }
  const { address, abi } = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"));
  const escrow = new hre.ethers.Contract(address, abi, provider);

  console.log("Connected to Escrow Contract at:", address);
  console.log("Client Wallet Address:    ", clientSigner.address);
  console.log("Freelancer Wallet Address:", freelancerSigner.address);
  console.log("Arbitrator Wallet Address:", arbitratorSigner.address);
  console.log("-------------------------------------------------\n");

  const escrowClient = escrow.connect(clientSigner);
  const escrowFreelancer = escrow.connect(freelancerSigner);
  const escrowArbitrator = escrow.connect(arbitratorSigner);

  // Step 3: CLIENT calls createJob()
  console.log("Step 3: CLIENT creating job with 3 milestones...");
  const descriptions = [
    "Milestone 0: UI Mockups",
    "Milestone 1: Smart Contracts",
    "Milestone 2: Final Integration"
  ];
  const amountPerMilestone = hre.ethers.parseEther("0.001");
  const amounts = [amountPerMilestone, amountPerMilestone, amountPerMilestone];
  const totalAmount = hre.ethers.parseEther("0.003");

  const tx3 = await escrowClient.createJob(
    freelancerSigner.address,
    arbitratorSigner.address,
    descriptions,
    amounts,
    { value: totalAmount }
  );
  console.log("Transaction sent. Waiting for confirmation...");
  await tx3.wait();

  console.log("Job Created Successfully!");
  console.log("Transaction Hash:", tx3.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx3.hash);

  const jobCount = await escrow.getJobCount();
  const jobId = jobCount - 1n;
  console.log("Assigned Job ID:", jobId.toString());
  console.log("-------------------------------------------------\n");

  // Step 4: FREELANCER calls markDelivered() on milestone 0
  console.log("Step 4: FREELANCER marking milestone 0 as Delivered...");
  const tx4 = await escrowFreelancer.markDelivered(jobId, 0);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx4.wait();
  console.log("Milestone 0 Delivered!");
  console.log("Transaction Hash:", tx4.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx4.hash);
  console.log("-------------------------------------------------\n");

  // Step 5: CLIENT calls approveMilestone() on milestone 0
  console.log("Step 5: CLIENT approving milestone 0...");
  const freeBalBefore5 = await provider.getBalance(freelancerSigner.address);
  console.log("Freelancer balance BEFORE approval:", hre.ethers.formatEther(freeBalBefore5), "ETH");

  const tx5 = await escrowClient.approveMilestone(jobId, 0);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx5.wait();

  const freeBalAfter5 = await provider.getBalance(freelancerSigner.address);
  console.log("Freelancer balance AFTER approval: ", hre.ethers.formatEther(freeBalAfter5), "ETH");
  console.log("Difference Received:             ", hre.ethers.formatEther(freeBalAfter5 - freeBalBefore5), "ETH");
  console.log("Transaction Hash:", tx5.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx5.hash);
  console.log("-------------------------------------------------\n");

  // Step 6: FREELANCER calls markDelivered() on milestone 1
  console.log("Step 6: FREELANCER marking milestone 1 as Delivered...");
  const tx6 = await escrowFreelancer.markDelivered(jobId, 1);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx6.wait();
  console.log("Milestone 1 Delivered!");
  console.log("Transaction Hash:", tx6.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx6.hash);
  console.log("-------------------------------------------------\n");

  // Step 7: CLIENT calls raiseDispute() on milestone 1
  console.log("Step 7: CLIENT raising dispute on milestone 1...");
  const tx7 = await escrowClient.raiseDispute(jobId, 1);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx7.wait();
  console.log("Milestone 1 Dispute Raised!");
  console.log("Transaction Hash:", tx7.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx7.hash);
  console.log("-------------------------------------------------\n");

  // Step 8: ARBITRATOR calls resolveDispute() on milestone 1 with payFreelancer = true
  console.log("Step 8: ARBITRATOR resolving dispute on milestone 1 (payFreelancer = true)...");
  const freeBalBefore8 = await provider.getBalance(freelancerSigner.address);
  console.log("Freelancer balance BEFORE resolution:", hre.ethers.formatEther(freeBalBefore8), "ETH");

  const tx8 = await escrowArbitrator.resolveDispute(jobId, 1, true);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx8.wait();

  const freeBalAfter8 = await provider.getBalance(freelancerSigner.address);
  console.log("Freelancer balance AFTER resolution: ", hre.ethers.formatEther(freeBalAfter8), "ETH");
  console.log("Difference Received:                ", hre.ethers.formatEther(freeBalAfter8 - freeBalBefore8), "ETH");
  console.log("Transaction Hash:", tx8.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx8.hash);
  console.log("-------------------------------------------------\n");

  // Step 9: FREELANCER calls markDelivered() on milestone 2
  console.log("Step 9: FREELANCER marking milestone 2 as Delivered...");
  const tx9 = await escrowFreelancer.markDelivered(jobId, 2);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx9.wait();
  console.log("Milestone 2 Delivered!");
  console.log("Transaction Hash:", tx9.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx9.hash);
  console.log("-------------------------------------------------\n");

  // Step 10: CLIENT calls raiseDispute() on milestone 2
  console.log("Step 10: CLIENT raising dispute on milestone 2...");
  const tx10 = await escrowClient.raiseDispute(jobId, 2);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx10.wait();
  console.log("Milestone 2 Dispute Raised!");
  console.log("Transaction Hash:", tx10.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx10.hash);
  console.log("-------------------------------------------------\n");

  // Step 11: ARBITRATOR calls resolveDispute() on milestone 2 with payFreelancer = false (refund to client)
  console.log("Step 11: ARBITRATOR resolving dispute on milestone 2 (payFreelancer = false - refund to client)...");
  const clientBalBefore11 = await provider.getBalance(clientSigner.address);
  console.log("Client balance BEFORE resolution:", hre.ethers.formatEther(clientBalBefore11), "ETH");

  const tx11 = await escrowArbitrator.resolveDispute(jobId, 2, false);
  console.log("Transaction sent. Waiting for confirmation...");
  await tx11.wait();

  const clientBalAfter11 = await provider.getBalance(clientSigner.address);
  console.log("Client balance AFTER resolution: ", hre.ethers.formatEther(clientBalAfter11), "ETH");
  console.log("Difference Refunded:             ", hre.ethers.formatEther(clientBalAfter11 - clientBalBefore11), "ETH");
  console.log("Transaction Hash:", tx11.hash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/tx/" + tx11.hash);
  console.log("-------------------------------------------------\n");

  // Step 12: Final State Verification
  console.log("Step 12: Fetching final job state...");
  const finalJob = await escrow.getJob(jobId);
  console.log("\n================ Final Job Summary ================");
  console.log("Job ID:     ", finalJob.jobId.toString());
  console.log("Client:     ", finalJob.client);
  console.log("Freelancer: ", finalJob.freelancer);
  console.log("Arbitrator: ", finalJob.arbitrator);
  console.log("Milestones Status Summary:");
  finalJob.milestones.forEach((m, idx) => {
    const statusStr = statusNames[Number(m.status)] || m.status.toString();
    console.log(
      `  [Milestone ${idx}] "${m.description}" | Amount: ${hre.ethers.formatEther(m.amount)} ETH | Status: ${statusStr} (${m.status})`
    );
  });
  console.log("===================================================\n");
  console.log("All 12 steps completed successfully!");
}

main().catch((err) => {
  console.error("\nLive Flow Test Error:", err);
  process.exitCode = 1;
});
