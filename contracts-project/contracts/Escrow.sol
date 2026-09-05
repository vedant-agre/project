// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev Decentralized Escrow contract for milestone-based jobs paid in plain ETH.
 */
contract Escrow is ReentrancyGuard {
    enum MilestoneStatus {
        Pending,
        Delivered,
        Approved,
        Disputed,
        Resolved
    }

    struct Milestone {
        string description;
        uint256 amount;
        MilestoneStatus status;
    }

    struct Job {
        uint256 jobId;
        address client;
        address freelancer;
        address arbitrator;
        Milestone[] milestones;
        bool exists;
    }

    uint256 public nextJobId;
    mapping(uint256 => Job) public jobs;

    // Events
    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        address arbitrator,
        uint256 totalAmount
    );
    event MilestoneDelivered(uint256 indexed jobId, uint256 indexed milestoneIndex);
    event MilestoneApproved(uint256 indexed jobId, uint256 indexed milestoneIndex);
    event DisputeRaised(
        uint256 indexed jobId,
        uint256 indexed milestoneIndex,
        address indexed raisedBy
    );
    event DisputeResolved(
        uint256 indexed jobId,
        uint256 indexed milestoneIndex,
        bool paidToFreelancer
    );

    /**
     * @dev Creates a new escrow job with 2 or 3 milestones funded with ETH.
     */
    function createJob(
        address freelancer,
        address arbitrator,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneAmounts
    ) external payable returns (uint256) {
        require(
            milestoneDescriptions.length == milestoneAmounts.length,
            "Array lengths mismatch"
        );
        require(
            milestoneDescriptions.length >= 2 && milestoneDescriptions.length <= 3,
            "Must have between 2 and 3 milestones"
        );
        require(freelancer != address(0), "Invalid freelancer address");
        require(arbitrator != address(0), "Invalid arbitrator address");
        require(freelancer != msg.sender, "Freelancer cannot be client");
        require(arbitrator != msg.sender, "Arbitrator cannot be client");
        require(freelancer != arbitrator, "Freelancer cannot be arbitrator");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            totalAmount += milestoneAmounts[i];
        }
        require(
            totalAmount == msg.value,
            "Milestone amounts sum must equal msg.value"
        );

        uint256 jobId = nextJobId++;
        Job storage job = jobs[jobId];
        job.jobId = jobId;
        job.client = msg.sender;
        job.freelancer = freelancer;
        job.arbitrator = arbitrator;
        job.exists = true;

        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            job.milestones.push(
                Milestone({
                    description: milestoneDescriptions[i],
                    amount: milestoneAmounts[i],
                    status: MilestoneStatus.Pending
                })
            );
        }

        emit JobCreated(jobId, msg.sender, freelancer, arbitrator, msg.value);
        return jobId;
    }

    /**
     * @dev Freelancer marks a pending milestone as delivered.
     */
    function markDelivered(uint256 jobId, uint256 milestoneIndex) external {
        Job storage job = jobs[jobId];
        require(job.exists, "Job does not exist");
        require(msg.sender == job.freelancer, "Only freelancer can mark delivered");
        require(milestoneIndex < job.milestones.length, "Invalid milestone index");
        require(
            job.milestones[milestoneIndex].status == MilestoneStatus.Pending,
            "Milestone must be Pending"
        );

        job.milestones[milestoneIndex].status = MilestoneStatus.Delivered;
        emit MilestoneDelivered(jobId, milestoneIndex);
    }

    /**
     * @dev Client approves a delivered milestone and releases ETH to freelancer.
     */
    function approveMilestone(uint256 jobId, uint256 milestoneIndex)
        external
        nonReentrant
    {
        Job storage job = jobs[jobId];
        require(job.exists, "Job does not exist");
        require(msg.sender == job.client, "Only client can approve milestone");
        require(milestoneIndex < job.milestones.length, "Invalid milestone index");
        require(
            job.milestones[milestoneIndex].status == MilestoneStatus.Delivered,
            "Milestone must be Delivered"
        );

        job.milestones[milestoneIndex].status = MilestoneStatus.Approved;
        uint256 amount = job.milestones[milestoneIndex].amount;

        (bool success, ) = payable(job.freelancer).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit MilestoneApproved(jobId, milestoneIndex);
    }

    /**
     * @dev Client or Freelancer raises a dispute on a delivered milestone.
     */
    function raiseDispute(uint256 jobId, uint256 milestoneIndex) external {
        Job storage job = jobs[jobId];
        require(job.exists, "Job does not exist");
        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Only client or freelancer can raise dispute"
        );
        require(milestoneIndex < job.milestones.length, "Invalid milestone index");
        require(
            job.milestones[milestoneIndex].status == MilestoneStatus.Delivered,
            "Milestone must be Delivered"
        );

        job.milestones[milestoneIndex].status = MilestoneStatus.Disputed;
        emit DisputeRaised(jobId, milestoneIndex, msg.sender);
    }

    /**
     * @dev Arbitrator resolves a disputed milestone.
     */
    function resolveDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        bool payFreelancer
    ) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.exists, "Job does not exist");
        require(msg.sender == job.arbitrator, "Only arbitrator can resolve dispute");
        require(milestoneIndex < job.milestones.length, "Invalid milestone index");
        require(
            job.milestones[milestoneIndex].status == MilestoneStatus.Disputed,
            "Milestone must be Disputed"
        );

        job.milestones[milestoneIndex].status = MilestoneStatus.Resolved;
        uint256 amount = job.milestones[milestoneIndex].amount;
        address recipient = payFreelancer ? job.freelancer : job.client;

        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit DisputeResolved(jobId, milestoneIndex, payFreelancer);
    }

    /**
     * @dev Returns full job details.
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        require(jobs[jobId].exists, "Job does not exist");
        return jobs[jobId];
    }

    /**
     * @dev Returns a specific milestone details.
     */
    function getMilestone(uint256 jobId, uint256 milestoneIndex)
        external
        view
        returns (Milestone memory)
    {
        require(jobs[jobId].exists, "Job does not exist");
        require(
            milestoneIndex < jobs[jobId].milestones.length,
            "Invalid milestone index"
        );
        return jobs[jobId].milestones[milestoneIndex];
    }

    /**
     * @dev Returns the total number of jobs created.
     */
    function getJobCount() external view returns (uint256) {
        return nextJobId;
    }
}
