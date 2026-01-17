const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Voting Contract Tests", function () {
    // Constants
    const ONE_DAY = 24 * 60 * 60;
    const SEVEN_DAYS = 7 * ONE_DAY;

    // Fixture to deploy Voting contract
    async function deployVotingFixture() {
        const [
            owner,
            candidate1,
            candidate2,
            candidate3,
            voter1,
            voter2,
            voter3,
            voter4,
            other,
        ] = await ethers.getSigners();

        const VotingFactory = await ethers.getContractFactory("Voting");
        const voting = await VotingFactory.deploy(owner.address);
        await voting.waitForDeployment();

        return {
            voting,
            owner,
            candidate1,
            candidate2,
            candidate3,
            voter1,
            voter2,
            voter3,
            voter4,
            other,
        };
    }

    // ============================================
    // Deployment & Initialization Tests
    // ============================================

    describe("Deployment & Initialization", function () {
        it("should deploy with correct initial state", async function () {
            const { voting, owner } = await loadFixture(deployVotingFixture);

            assert.equal(await voting.owner(), owner.address);
            assert.equal(await voting.votingStatus(), 0); // NotStarted
            assert.equal(await voting.candidateCount(), 0);
            assert.equal(await voting.getVoterCount(), 0);
            assert.equal(await voting.paused(), false);

            console.log("\n✅ Contract deployed successfully:");
            console.log("  - Owner:", await voting.owner());
            console.log("  - Status: NotStarted");
            console.log("  - Candidates: 0");
            console.log("  - Voters: 0");
        });

        it("should set correct owner from constructor", async function () {
            const { voting, owner } = await loadFixture(deployVotingFixture);
            const contractOwner = await voting.owner();
            assert.equal(contractOwner, owner.address);
        });
    });

    // ============================================
    // Candidate Registration Tests
    // ============================================

    describe("Candidate Registration", function () {
        it("should register a candidate successfully", async function () {
            const { voting, owner, candidate1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");

            assert.equal(await voting.candidateCount(), 1);
            assert.equal(await voting.isCandidate(candidate1.address), true);

            const candidate = await voting.getCandidate(1);
            assert.equal(candidate.id, 1);
            assert.equal(candidate.candidateAddress, candidate1.address);
            assert.equal(candidate.name, "Alice");
            assert.equal(candidate.voteCount, 0);

            console.log("\n✅ Candidate registered:");
            console.log("  - ID:", candidate.id.toString());
            console.log("  - Address:", candidate.candidateAddress);
            console.log("  - Name:", candidate.name);
        });

        it("should register multiple candidates", async function () {
            const { voting, owner, candidate1, candidate2, candidate3 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting
                .connect(owner)
                .registerCandidate(candidate3.address, "Charlie");

            assert.equal(await voting.candidateCount(), 3);

            const allCandidates = await voting.getAllCandidates();
            assert.equal(allCandidates.ids.length, 3);
            assert.equal(allCandidates.names[0], "Alice");
            assert.equal(allCandidates.names[1], "Bob");
            assert.equal(allCandidates.names[2], "Charlie");

            console.log("\n✅ Multiple candidates registered:");
            for (let i = 0; i < allCandidates.names.length; i++) {
                console.log(
                    `  - ${allCandidates.names[i]} (${allCandidates.addresses[i]})`
                );
            }
        });

        it("should revert when non-owner tries to register candidate", async function () {
            const { voting, candidate1, other } = await loadFixture(
                deployVotingFixture
            );

            await expect(
                voting
                    .connect(other)
                    .registerCandidate(candidate1.address, "Alice")
            ).to.be.revertedWithCustomError(
                voting,
                "OwnableUnauthorizedAccount"
            );

            console.log("\n✅ Non-owner blocked from registering candidate");
        });

        it("should revert when registering duplicate candidate", async function () {
            const { voting, owner, candidate1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");

            await expect(
                voting
                    .connect(owner)
                    .registerCandidate(candidate1.address, "Alice Again")
            ).to.be.revertedWithCustomError(voting, "CandidateAlreadyExists");

            console.log("\n✅ Duplicate candidate registration blocked");
        });

        it("should revert when registering with zero address", async function () {
            const { voting, owner } = await loadFixture(deployVotingFixture);

            await expect(
                voting
                    .connect(owner)
                    .registerCandidate(ethers.ZeroAddress, "Invalid")
            ).to.be.revertedWithCustomError(voting, "InvalidAddress");

            console.log("\n✅ Zero address blocked");
        });

        it("should revert when registering with empty name", async function () {
            const { voting, owner, candidate1 } = await loadFixture(
                deployVotingFixture
            );

            await expect(
                voting.connect(owner).registerCandidate(candidate1.address, "")
            ).to.be.revertedWithCustomError(voting, "EmptyName");

            console.log("\n✅ Empty name blocked");
        });

        it("should revert when registering after voting started", async function () {
            const { voting, owner, candidate1, candidate2, voter1 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await expect(
                voting
                    .connect(owner)
                    .registerCandidate(candidate2.address, "Bob")
            ).to.be.revertedWithCustomError(voting, "VotingAlreadyStarted");

            console.log(
                "\n✅ Candidate registration blocked after voting started"
            );
        });
    });

    // ============================================
    // Voter Registration Tests
    // ============================================

    describe("Voter Registration", function () {
        it("should register a voter successfully", async function () {
            const { voting, owner, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerVoter(voter1.address, "Voter One");

            assert.equal(await voting.getVoterCount(), 1);
            assert.equal(await voting.isVoter(voter1.address), true);

            const voter = await voting.getVoter(voter1.address);
            assert.equal(voter.voterAddress, voter1.address);
            assert.equal(voter.name, "Voter One");
            assert.equal(voter.votedCandidateId, 0);
            assert.equal(voter.votedAt, 0);

            console.log("\n✅ Voter registered:");
            console.log("  - Address:", voter.voterAddress);
            console.log("  - Name:", voter.name);
        });

        it("should register multiple voters using batch method", async function () {
            const { voting, owner, voter1, voter2, voter3 } = await loadFixture(
                deployVotingFixture
            );

            const voterAddresses = [
                voter1.address,
                voter2.address,
                voter3.address,
            ];
            const voterNames = ["Alice Voter", "Bob Voter", "Charlie Voter"];

            await voting
                .connect(owner)
                .registerVoterBatch(voterAddresses, voterNames);

            assert.equal(await voting.getVoterCount(), 3);

            const voters = await voting.getVoters(0, 3);
            assert.equal(voters.addresses.length, 3);
            assert.equal(voters.names[0], "Alice Voter");
            assert.equal(voters.names[1], "Bob Voter");
            assert.equal(voters.names[2], "Charlie Voter");

            console.log("\n✅ Batch voter registration:");
            for (let i = 0; i < voters.names.length; i++) {
                console.log(`  - ${voters.names[i]} (${voters.addresses[i]})`);
            }
        });

        it("should revert when registering duplicate voter", async function () {
            const { voting, owner, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerVoter(voter1.address, "Voter One");

            await expect(
                voting
                    .connect(owner)
                    .registerVoter(voter1.address, "Voter One Again")
            ).to.be.revertedWithCustomError(voting, "VoterAlreadyExists");

            console.log("\n✅ Duplicate voter registration blocked");
        });

        it("should revert when batch arrays length mismatch", async function () {
            const { voting, owner, voter1, voter2 } = await loadFixture(
                deployVotingFixture
            );

            await expect(
                voting
                    .connect(owner)
                    .registerVoterBatch(
                        [voter1.address, voter2.address],
                        ["Only One Name"]
                    )
            ).to.be.revertedWithCustomError(voting, "InvalidAddress");

            console.log("\n✅ Batch array length mismatch blocked");
        });

        it("should revert when registering after voting started", async function () {
            const { voting, owner, candidate1, voter1, voter2 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await expect(
                voting.connect(owner).registerVoter(voter2.address, "Voter2")
            ).to.be.revertedWithCustomError(voting, "VotingAlreadyStarted");

            console.log("\n✅ Voter registration blocked after voting started");
        });
    });

    // ============================================
    // Voting Lifecycle Tests
    // ============================================

    describe("Voting Lifecycle", function () {
        it("should start voting successfully", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");

            const tx = await voting.connect(owner).startVoting(SEVEN_DAYS);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            assert.equal(await voting.votingStatus(), 1); // Active

            const startTime = await voting.votingStartTime();
            const endTime = await voting.votingEndTime();

            assert.equal(endTime - startTime, BigInt(SEVEN_DAYS));

            console.log("\n✅ Voting started:");
            console.log("  - Status: Active");
            console.log("  - Duration:", SEVEN_DAYS / ONE_DAY, "days");
            console.log(
                "  - Start:",
                new Date(Number(startTime) * 1000).toISOString()
            );
            console.log(
                "  - End:",
                new Date(Number(endTime) * 1000).toISOString()
            );
        });

        it("should revert when starting without candidates", async function () {
            const { voting, owner, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting.connect(owner).registerVoter(voter1.address, "Voter1");

            await expect(
                voting.connect(owner).startVoting(SEVEN_DAYS)
            ).to.be.revertedWithCustomError(voting, "CandidateNotFound");

            console.log("\n✅ Cannot start voting without candidates");
        });

        it("should revert when starting with zero duration", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");

            await expect(
                voting.connect(owner).startVoting(0)
            ).to.be.revertedWithCustomError(voting, "InvalidTimeRange");

            console.log("\n✅ Cannot start with zero duration");
        });

        it("should allow owner to end voting early", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            // Owner ends early
            await voting.connect(owner).endVoting();

            assert.equal(await voting.votingStatus(), 2); // Ended

            console.log("\n✅ Owner ended voting early");
        });

        it("should allow anyone to end voting after deadline", async function () {
            const { voting, owner, candidate1, voter1, other } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(ONE_DAY);

            // Fast forward time
            await time.increase(ONE_DAY + 1);

            // Anyone can end now
            await voting.connect(other).endVoting();

            assert.equal(await voting.votingStatus(), 2); // Ended

            console.log("\n✅ Non-owner ended voting after deadline");
        });

        it("should revert when non-owner tries to end before deadline", async function () {
            const { voting, owner, candidate1, voter1, other } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await expect(
                voting.connect(other).endVoting()
            ).to.be.revertedWithCustomError(voting, "VotingNotEnded");

            console.log("\n✅ Non-owner cannot end voting before deadline");
        });

        it("should test canEndVoting helper function", async function () {
            const { voting, owner, candidate1, voter1, other } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(ONE_DAY);

            // Owner can end anytime
            let [canEnd, reason] = await voting.connect(owner).canEndVoting();
            assert.equal(canEnd, true);
            console.log("\n✅ Owner canEndVoting:", reason);

            // Non-owner cannot end before deadline
            [canEnd, reason] = await voting.connect(other).canEndVoting();
            assert.equal(canEnd, false);
            console.log("✅ Non-owner canEndVoting (before):", reason);

            // Fast forward
            await time.increase(ONE_DAY + 1);

            // Non-owner can end after deadline
            [canEnd, reason] = await voting.connect(other).canEndVoting();
            assert.equal(canEnd, true);
            console.log("✅ Non-owner canEndVoting (after):", reason);
        });
    });

    // ============================================
    // Voting Tests
    // ============================================

    describe("Voting Functionality", function () {
        it("should cast vote successfully by address", async function () {
            const { voting, owner, candidate1, candidate2, voter1 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).vote(candidate1.address);

            const candidate = await voting.getCandidate(1);
            assert.equal(candidate.voteCount, 1);

            const voter = await voting.getVoter(voter1.address);
            assert.equal(voter.votedCandidateId, 1);
            assert.notEqual(voter.votedAt, 0);

            console.log("\n✅ Vote cast by address:");
            console.log("  - Voter:", voter1.address);
            console.log("  - Candidate:", candidate.name);
            console.log("  - Vote count:", candidate.voteCount.toString());
        });

        it("should cast vote successfully by ID", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).voteById(1);

            const candidate = await voting.getCandidate(1);
            assert.equal(candidate.voteCount, 1);

            console.log("\n✅ Vote cast by ID");
        });

        it("should handle multiple votes correctly", async function () {
            const {
                voting,
                owner,
                candidate1,
                candidate2,
                voter1,
                voter2,
                voter3,
            } = await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting
                .connect(owner)
                .registerVoterBatch(
                    [voter1.address, voter2.address, voter3.address],
                    ["Voter1", "Voter2", "Voter3"]
                );
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).vote(candidate1.address);
            await voting.connect(voter2).vote(candidate1.address);
            await voting.connect(voter3).vote(candidate2.address);

            const c1 = await voting.getCandidate(1);
            const c2 = await voting.getCandidate(2);

            assert.equal(c1.voteCount, 2);
            assert.equal(c2.voteCount, 1);

            console.log("\n✅ Multiple votes:");
            console.log("  - Alice:", c1.voteCount.toString(), "votes");
            console.log("  - Bob:", c2.voteCount.toString(), "votes");
        });

        it("should revert when unregistered voter tries to vote", async function () {
            const { voting, owner, candidate1, other } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await expect(
                voting.connect(other).vote(candidate1.address)
            ).to.be.revertedWithCustomError(voting, "VoterNotFound");

            console.log("\n✅ Unregistered voter blocked");
        });

        it("should revert when voting twice", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).vote(candidate1.address);

            await expect(
                voting.connect(voter1).vote(candidate1.address)
            ).to.be.revertedWithCustomError(voting, "AlreadyVoted");

            console.log("\n✅ Double voting blocked");
        });

        it("should revert when voting for non-existent candidate", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await expect(
                voting.connect(voter1).voteById(999)
            ).to.be.revertedWithCustomError(voting, "InvalidCandidateId");

            console.log("\n✅ Invalid candidate ID blocked");
        });

        it("should revert when voting before start", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");

            await expect(
                voting.connect(voter1).vote(candidate1.address)
            ).to.be.revertedWithCustomError(voting, "VotingNotActive");

            console.log("\n✅ Voting before start blocked");
        });

        it("should revert when voting after end", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(ONE_DAY);

            await time.increase(ONE_DAY + 1);

            await expect(
                voting.connect(voter1).vote(candidate1.address)
            ).to.be.revertedWithCustomError(voting, "VotingNotActive");

            console.log("\n✅ Voting after deadline blocked");
        });
    });

    // ============================================
    // Pause/Unpause Tests
    // ============================================

    describe("Pause Functionality", function () {
        it("should pause and unpause contract", async function () {
            const { voting, owner } = await loadFixture(deployVotingFixture);

            await voting.connect(owner).pause();
            assert.equal(await voting.paused(), true);

            await voting.connect(owner).unpause();
            assert.equal(await voting.paused(), false);

            console.log("\n✅ Pause/Unpause functionality works");
        });

        it("should block voting when paused", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(owner).pause();

            await expect(
                voting.connect(voter1).vote(candidate1.address)
            ).to.be.revertedWithCustomError(voting, "EnforcedPause");

            console.log("\n✅ Voting blocked when paused");
        });

        it("should allow voting after unpause", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "Voter1");
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(owner).pause();
            await voting.connect(owner).unpause();

            await voting.connect(voter1).vote(candidate1.address);

            const candidate = await voting.getCandidate(1);
            assert.equal(candidate.voteCount, 1);

            console.log("\n✅ Voting works after unpause");
        });
    });

    // ============================================
    // Query Functions Tests
    // ============================================

    describe("Query Functions", function () {
        it("should get candidates with pagination", async function () {
            const { voting, owner, candidate1, candidate2, candidate3 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting
                .connect(owner)
                .registerCandidate(candidate3.address, "Charlie");

            const page1 = await voting.getCandidates(0, 2);
            assert.equal(page1.ids.length, 2);
            assert.equal(page1.names[0], "Alice");
            assert.equal(page1.names[1], "Bob");

            const page2 = await voting.getCandidates(2, 2);
            assert.equal(page2.ids.length, 1);
            assert.equal(page2.names[0], "Charlie");

            console.log("\n✅ Pagination works:");
            console.log("  - Page 1:", page1.names.join(", "));
            console.log("  - Page 2:", page2.names.join(", "));
        });

        it("should get winners correctly", async function () {
            const {
                voting,
                owner,
                candidate1,
                candidate2,
                voter1,
                voter2,
                voter3,
            } = await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting
                .connect(owner)
                .registerVoterBatch(
                    [voter1.address, voter2.address, voter3.address],
                    ["V1", "V2", "V3"]
                );
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).vote(candidate1.address);
            await voting.connect(voter2).vote(candidate1.address);
            await voting.connect(voter3).vote(candidate2.address);

            const [winnerIds, winnerAddresses, winnerNames, highestVoteCount] =
                await voting.getWinners();

            assert.equal(winnerIds.length, 1);
            assert.equal(winnerNames[0], "Alice");
            assert.equal(highestVoteCount, 2);

            console.log("\n✅ Winner:");
            console.log("  - Name:", winnerNames[0]);
            console.log("  - Votes:", highestVoteCount.toString());
        });

        it("should handle tie in winners", async function () {
            const { voting, owner, candidate1, candidate2, voter1, voter2 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting
                .connect(owner)
                .registerVoterBatch(
                    [voter1.address, voter2.address],
                    ["V1", "V2"]
                );
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).vote(candidate1.address);
            await voting.connect(voter2).vote(candidate2.address);

            const [winnerIds, winnerAddresses, winnerNames, highestVoteCount] =
                await voting.getWinners();

            assert.equal(winnerIds.length, 2);
            assert.equal(highestVoteCount, 1);

            console.log("\n✅ Tie detected:");
            console.log("  - Winners:", winnerNames.join(", "));
            console.log("  - Votes each:", highestVoteCount.toString());
        });

        it("should get voting statistics", async function () {
            const { voting, owner, candidate1, voter1, voter2, voter3 } =
                await loadFixture(deployVotingFixture);

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerVoterBatch(
                    [voter1.address, voter2.address, voter3.address],
                    ["V1", "V2", "V3"]
                );
            await voting.connect(owner).startVoting(SEVEN_DAYS);

            await voting.connect(voter1).vote(candidate1.address);
            await voting.connect(voter2).vote(candidate1.address);

            const [
                totalVoters,
                totalVotesCast,
                totalCandidates,
                participationRate,
            ] = await voting.getVotingStatistics();

            assert.equal(totalVoters, 3);
            assert.equal(totalVotesCast, 2);
            assert.equal(totalCandidates, 1);
            assert.equal(participationRate, 6666); // 66.66% = 6666/10000

            console.log("\n✅ Voting statistics:");
            console.log("  - Total Voters:", totalVoters.toString());
            console.log("  - Votes Cast:", totalVotesCast.toString());
            console.log(
                "  - Participation:",
                (Number(participationRate) / 100).toFixed(2),
                "%"
            );
        });

        it("should check voting expiration", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "V1");
            await voting.connect(owner).startVoting(ONE_DAY);

            assert.equal(await voting.isVotingExpired(), false);

            await time.increase(ONE_DAY + 1);

            assert.equal(await voting.isVotingExpired(), true);

            console.log("\n✅ Voting expiration check works");
        });

        it("should get remaining time", async function () {
            const { voting, owner, candidate1, voter1 } = await loadFixture(
                deployVotingFixture
            );

            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting.connect(owner).registerVoter(voter1.address, "V1");
            await voting.connect(owner).startVoting(ONE_DAY);

            let remaining = await voting.getRemainingTime();
            assert.isAbove(Number(remaining), 0);

            console.log("\n✅ Remaining time:", Number(remaining), "seconds");

            await time.increase(ONE_DAY + 1);

            remaining = await voting.getRemainingTime();
            assert.equal(remaining, 0);

            console.log("✅ Remaining time after expiry:", Number(remaining));
        });
    });

    // ============================================
    // Ownership Tests
    // ============================================

    describe("Ownership Management", function () {
        it("should transfer ownership", async function () {
            const { voting, owner, other } = await loadFixture(
                deployVotingFixture
            );

            await voting.connect(owner).transferOwnership(other.address);

            assert.equal(await voting.owner(), other.address);

            console.log("\n✅ Ownership transferred:");
            console.log("  - Old owner:", owner.address);
            console.log("  - New owner:", other.address);
        });

        it("should revert when transferring to zero address", async function () {
            const { voting, owner } = await loadFixture(deployVotingFixture);

            await expect(
                voting.connect(owner).transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(voting, "OwnableInvalidOwner");

            console.log(
                "\n✅ Cannot transfer to zero address (OpenZeppelin protection)"
            );
        });
    });

    // ============================================
    // Complete Voting Flow Test
    // ============================================

    describe("Complete Voting Flow", function () {
        it("should execute a complete voting scenario", async function () {
            const {
                voting,
                owner,
                candidate1,
                candidate2,
                candidate3,
                voter1,
                voter2,
                voter3,
                voter4,
            } = await loadFixture(deployVotingFixture);

            console.log("\n========== Complete Voting Scenario ==========");

            // 1. Setup phase
            console.log("\n1. Setup Phase:");
            await voting
                .connect(owner)
                .registerCandidate(candidate1.address, "Alice");
            await voting
                .connect(owner)
                .registerCandidate(candidate2.address, "Bob");
            await voting
                .connect(owner)
                .registerCandidate(candidate3.address, "Charlie");
            console.log("   ✓ 3 candidates registered");

            await voting
                .connect(owner)
                .registerVoterBatch(
                    [
                        voter1.address,
                        voter2.address,
                        voter3.address,
                        voter4.address,
                    ],
                    ["Voter 1", "Voter 2", "Voter 3", "Voter 4"]
                );
            console.log("   ✓ 4 voters registered");

            // 2. Start voting
            console.log("\n2. Voting Active Phase:");
            await voting.connect(owner).startVoting(SEVEN_DAYS);
            console.log("   ✓ Voting started (7 days duration)");

            // 3. Cast votes
            await voting.connect(voter1).vote(candidate1.address);
            await voting.connect(voter2).vote(candidate1.address);
            await voting.connect(voter3).vote(candidate2.address);
            await voting.connect(voter4).vote(candidate1.address);
            console.log("   ✓ 4 votes cast");

            // 4. Check intermediate stats
            const [totalVoters, votesCast, , participationRate] =
                await voting.getVotingStatistics();
            console.log("\n3. Intermediate Statistics:");
            console.log("   - Total Voters:", totalVoters.toString());
            console.log("   - Votes Cast:", votesCast.toString());
            console.log(
                "   - Participation:",
                (Number(participationRate) / 100).toFixed(2),
                "%"
            );

            // 5. Fast forward to end
            console.log("\n4. Fast Forward to End:");
            await time.increase(SEVEN_DAYS + 1);
            console.log("   ✓ 7 days passed");

            // 6. End voting
            await voting.connect(voter1).endVoting(); // Anyone can end now
            console.log("   ✓ Voting ended by non-owner");

            // 7. Get results
            console.log("\n5. Final Results:");
            const [winnerIds, , winnerNames, highestVotes] =
                await voting.getWinners();
            console.log("   - Winner:", winnerNames[0]);
            console.log("   - Votes:", highestVotes.toString());

            const allCandidates = await voting.getAllCandidates();
            console.log("\n   Vote Distribution:");
            for (let i = 0; i < allCandidates.names.length; i++) {
                console.log(
                    `   - ${allCandidates.names[i]}: ${allCandidates.voteCounts[i]} votes`
                );
            }

            // Assertions
            assert.equal(winnerNames[0], "Alice");
            assert.equal(highestVotes, 3);
            assert.equal(await voting.votingStatus(), 2); // Ended

            console.log("\n========== Scenario Complete ==========\n");
        });
    });
});
