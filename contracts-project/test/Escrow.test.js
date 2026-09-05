import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("Escrow Contract", function () {
  let escrow;
  let owner, client, freelancer, arbitrator, randomUser;

  const desc1 = "Milestone 1: Design";
  const desc2 = "Milestone 2: Development";
  const desc3 = "Milestone 3: Deployment";

  const amount1 = ethers.parseEther("1.0");
  const amount2 = ethers.parseEther("2.0");
  const amount3 = ethers.parseEther("1.5");

  const totalAmount2 = amount1 + amount2; // 3.0 ETH

  beforeEach(async function () {
    [owner, client, freelancer, arbitrator, randomUser] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();
  });

  describe("Job Creation", function () {
    it("1. Creating a job locks the correct total ETH in the contract and stores milestone data correctly", async function () {
      const descriptions = [desc1, desc2];
      const amounts = [amount1, amount2];

      const tx = await escrow.connect(client).createJob(
        freelancer.address,
        arbitrator.address,
        descriptions,
        amounts,
        { value: totalAmount2 }
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Contract balance check
      const contractBalance = await ethers.provider.getBalance(await escrow.getAddress());
      expect(contractBalance).to.equal(totalAmount2);

      // Job count check
      const jobCount = await escrow.getJobCount();
      expect(jobCount).to.equal(1n);

      // Job details check
      const job = await escrow.getJob(0);
      expect(job.jobId).to.equal(0n);
      expect(job.client).to.equal(client.address);
      expect(job.freelancer).to.equal(freelancer.address);
      expect(job.arbitrator).to.equal(arbitrator.address);
      expect(job.exists).to.be.true;

      expect(job.milestones.length).to.equal(2);
      expect(job.milestones[0].description).to.equal(desc1);
      expect(job.milestones[0].amount).to.equal(amount1);
      expect(job.milestones[0].status).to.equal(0n); // Pending

      expect(job.milestones[1].description).to.equal(desc2);
      expect(job.milestones[1].amount).to.equal(amount2);
      expect(job.milestones[1].status).to.equal(0n); // Pending
    });

    it("2. createJob reverts if milestone amounts don't sum to msg.value", async function () {
      const descriptions = [desc1, desc2];
      const amounts = [amount1, amount2];
      const wrongValue = ethers.parseEther("2.5"); // expected 3.0

      await expect(
        escrow.connect(client).createJob(
          freelancer.address,
          arbitrator.address,
          descriptions,
          amounts,
          { value: wrongValue }
        )
      ).to.be.revertedWith("Milestone amounts sum must equal msg.value");
    });

    it("3. createJob reverts with fewer than 2 or more than 3 milestones", async function () {
      // 1 milestone
      await expect(
        escrow.connect(client).createJob(
          freelancer.address,
          arbitrator.address,
          [desc1],
          [amount1],
          { value: amount1 }
        )
      ).to.be.revertedWith("Must have between 2 and 3 milestones");

      // 4 milestones
      const desc4 = [desc1, desc2, desc3, "Milestone 4"];
      const amount4 = [amount1, amount2, amount3, amount1];
      const total4 = amount1 + amount2 + amount3 + amount1;

      await expect(
        escrow.connect(client).createJob(
          freelancer.address,
          arbitrator.address,
          desc4,
          amount4,
          { value: total4 }
        )
      ).to.be.revertedWith("Must have between 2 and 3 milestones");
    });
  });

  describe("Marking Delivered", function () {
    beforeEach(async function () {
      await escrow.connect(client).createJob(
        freelancer.address,
        arbitrator.address,
        [desc1, desc2],
        [amount1, amount2],
        { value: totalAmount2 }
      );
    });

    it("4. Only the freelancer can call markDelivered; reverts if called by client or a random address", async function () {
      // Revert if called by client
      await expect(
        escrow.connect(client).markDelivered(0, 0)
      ).to.be.revertedWith("Only freelancer can mark delivered");

      // Revert if called by random user
      await expect(
        escrow.connect(randomUser).markDelivered(0, 0)
      ).to.be.revertedWith("Only freelancer can mark delivered");

      // Success if called by freelancer
      await expect(escrow.connect(freelancer).markDelivered(0, 0))
        .to.emit(escrow, "MilestoneDelivered")
        .withArgs(0n, 0n);

      const milestone = await escrow.getMilestone(0, 0);
      expect(milestone.status).to.equal(1n); // Delivered
    });
  });

  describe("Approving Milestones", function () {
    beforeEach(async function () {
      await escrow.connect(client).createJob(
        freelancer.address,
        arbitrator.address,
        [desc1, desc2],
        [amount1, amount2],
        { value: totalAmount2 }
      );
    });

    it("5. Only the client can call approveMilestone, and only when status is Delivered; approving releases correct ETH amount to freelancer", async function () {
      // Cannot approve while Pending
      await expect(
        escrow.connect(client).approveMilestone(0, 0)
      ).to.be.revertedWith("Milestone must be Delivered");

      // Freelancer delivers milestone 0
      await escrow.connect(freelancer).markDelivered(0, 0);

      // Random user cannot approve
      await expect(
        escrow.connect(randomUser).approveMilestone(0, 0)
      ).to.be.revertedWith("Only client can approve milestone");

      // Freelancer cannot approve
      await expect(
        escrow.connect(freelancer).approveMilestone(0, 0)
      ).to.be.revertedWith("Only client can approve milestone");

      // Client approves milestone 0
      const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);
      const tx = await escrow.connect(client).approveMilestone(0, 0);
      await tx.wait();
      const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);

      expect(freelancerBalAfter - freelancerBalBefore).to.equal(amount1);

      const milestone = await escrow.getMilestone(0, 0);
      expect(milestone.status).to.equal(2n); // Approved
    });
  });

  describe("Raising Disputes", function () {
    beforeEach(async function () {
      await escrow.connect(client).createJob(
        freelancer.address,
        arbitrator.address,
        [desc1, desc2],
        [amount1, amount2],
        { value: totalAmount2 }
      );
    });

    it("6. raiseDispute works from both client and freelancer, but not from a random address or when not Delivered", async function () {
      // Revert if milestone is Pending
      await expect(
        escrow.connect(client).raiseDispute(0, 0)
      ).to.be.revertedWith("Milestone must be Delivered");

      // Deliver milestone 0
      await escrow.connect(freelancer).markDelivered(0, 0);

      // Revert for random user
      await expect(
        escrow.connect(randomUser).raiseDispute(0, 0)
      ).to.be.revertedWith("Only client or freelancer can raise dispute");

      // Client can raise dispute
      await expect(escrow.connect(client).raiseDispute(0, 0))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(0n, 0n, client.address);

      const milestone0 = await escrow.getMilestone(0, 0);
      expect(milestone0.status).to.equal(3n); // Disputed

      // Deliver milestone 1 and test freelancer raising dispute
      await escrow.connect(freelancer).markDelivered(0, 1);
      await expect(escrow.connect(freelancer).raiseDispute(0, 1))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(0n, 1n, freelancer.address);

      const milestone1 = await escrow.getMilestone(0, 1);
      expect(milestone1.status).to.equal(3n); // Disputed
    });
  });

  describe("Resolving Disputes", function () {
    beforeEach(async function () {
      await escrow.connect(client).createJob(
        freelancer.address,
        arbitrator.address,
        [desc1, desc2],
        [amount1, amount2],
        { value: totalAmount2 }
      );
      await escrow.connect(freelancer).markDelivered(0, 0);
      await escrow.connect(client).raiseDispute(0, 0);

      await escrow.connect(freelancer).markDelivered(0, 1);
      await escrow.connect(freelancer).raiseDispute(0, 1);
    });

    it("7. Only the arbitrator can call resolveDispute; test both payFreelancer=true and payFreelancer=false paths and confirm correct balances after", async function () {
      // Non-arbitrator revert
      await expect(
        escrow.connect(client).resolveDispute(0, 0, true)
      ).to.be.revertedWith("Only arbitrator can resolve dispute");

      await expect(
        escrow.connect(freelancer).resolveDispute(0, 0, true)
      ).to.be.revertedWith("Only arbitrator can resolve dispute");

      // Path A: payFreelancer = true
      const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);
      await escrow.connect(arbitrator).resolveDispute(0, 0, true);
      const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);
      expect(freelancerBalAfter - freelancerBalBefore).to.equal(amount1);

      const milestone0 = await escrow.getMilestone(0, 0);
      expect(milestone0.status).to.equal(4n); // Resolved

      // Path B: payFreelancer = false (refund client)
      const clientBalBefore = await ethers.provider.getBalance(client.address);
      await escrow.connect(arbitrator).resolveDispute(0, 1, false);
      const clientBalAfter = await ethers.provider.getBalance(client.address);
      expect(clientBalAfter - clientBalBefore).to.equal(amount2);

      const milestone1 = await escrow.getMilestone(0, 1);
      expect(milestone1.status).to.equal(4n); // Resolved
    });
  });

  describe("State Immutability Checks", function () {
    beforeEach(async function () {
      await escrow.connect(client).createJob(
        freelancer.address,
        arbitrator.address,
        [desc1, desc2],
        [amount1, amount2],
        { value: totalAmount2 }
      );
    });

    it("8. A milestone that's already Approved cannot be delivered, disputed, or approved again", async function () {
      await escrow.connect(freelancer).markDelivered(0, 0);
      await escrow.connect(client).approveMilestone(0, 0);

      // Cannot deliver again
      await expect(
        escrow.connect(freelancer).markDelivered(0, 0)
      ).to.be.revertedWith("Milestone must be Pending");

      // Cannot dispute
      await expect(
        escrow.connect(client).raiseDispute(0, 0)
      ).to.be.revertedWith("Milestone must be Delivered");

      // Cannot approve again
      await expect(
        escrow.connect(client).approveMilestone(0, 0)
      ).to.be.revertedWith("Milestone must be Delivered");
    });

    it("9. A milestone that's already Resolved cannot be acted on again", async function () {
      await escrow.connect(freelancer).markDelivered(0, 0);
      await escrow.connect(client).raiseDispute(0, 0);
      await escrow.connect(arbitrator).resolveDispute(0, 0, true);

      // Cannot deliver
      await expect(
        escrow.connect(freelancer).markDelivered(0, 0)
      ).to.be.revertedWith("Milestone must be Pending");

      // Cannot dispute again
      await expect(
        escrow.connect(client).raiseDispute(0, 0)
      ).to.be.revertedWith("Milestone must be Delivered");

      // Cannot approve
      await expect(
        escrow.connect(client).approveMilestone(0, 0)
      ).to.be.revertedWith("Milestone must be Delivered");

      // Cannot resolve again
      await expect(
        escrow.connect(arbitrator).resolveDispute(0, 0, false)
      ).to.be.revertedWith("Milestone must be Disputed");
    });
  });
});
