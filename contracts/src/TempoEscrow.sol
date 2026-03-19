// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP20} from "../interfaces/ITIP20.sol";

/// @title TempoEscrow - Hybrid Non-Custodial Escrow with Agent-Triggered Release
/// @notice A social-layer agnostic escrow system built on Tempo for TIP-20 stablecoins.
///         Supports non-custodial locks, agent-triggered releases, time-based auto-release,
///         dispute resolution, and optional social verification (Farcaster/X).
/// @dev Funds are locked in the contract but ownership is tracked per-escrow.
///      Only authorized agents or participants can trigger releases.
contract TempoEscrow {
    // ─── Enums ───────────────────────────────────────────────────────────

    enum EscrowStatus {
        Active,       // Funds locked, awaiting release conditions
        Released,     // Funds released to recipient
        Refunded,     // Funds returned to depositor
        Disputed,     // Under dispute resolution
        Expired       // Past deadline, eligible for refund
    }

    enum ReleaseCondition {
        AgentApproval,    // Agent must approve release
        TimeLock,         // Auto-release after timestamp
        MultiSig,         // Multiple agents must approve
        SocialVerified    // Social layer verification required
    }

    // ─── Structs ─────────────────────────────────────────────────────────

    struct Escrow {
        uint256 id;
        address depositor;
        address recipient;
        address token;              // TIP-20 token address
        uint256 amount;
        uint256 createdAt;
        uint256 deadline;           // Auto-refund deadline
        uint256 releaseTime;        // For TimeLock: auto-release timestamp
        EscrowStatus status;
        ReleaseCondition condition;
        bytes32 memo;               // TIP-20 memo for payment reference
        string description;         // Human-readable description
        // Social layer (optional)
        string socialHandle;        // Farcaster/X handle (optional)
        string socialPlatform;      // "farcaster", "x", or ""
        // Multi-sig
        address[] agents;           // Authorized release agents
        uint256 requiredApprovals;  // For MultiSig condition
        uint256 approvalCount;
    }

    // ─── State ───────────────────────────────────────────────────────────

    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    mapping(address => uint256[]) public userEscrows;       // depositor's escrows
    mapping(address => uint256[]) public recipientEscrows;  // recipient's escrows

    // Protocol fee (basis points, e.g., 50 = 0.5%)
    uint256 public constant PROTOCOL_FEE_BPS = 50;
    address public feeCollector;
    address public owner;

    // ─── Events ──────────────────────────────────────────────────────────

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed depositor,
        address indexed recipient,
        address token,
        uint256 amount,
        ReleaseCondition condition,
        bytes32 memo
    );

    event EscrowReleased(
        uint256 indexed escrowId,
        address indexed recipient,
        uint256 amount,
        address releasedBy
    );

    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed depositor,
        uint256 amount
    );

    event EscrowDisputed(
        uint256 indexed escrowId,
        address indexed disputedBy
    );

    event AgentApproved(
        uint256 indexed escrowId,
        address indexed agent,
        uint256 approvalCount,
        uint256 required
    );

    event SocialVerification(
        uint256 indexed escrowId,
        string platform,
        string handle,
        bool verified
    );

    event BountyClaimed(
        uint256 indexed escrowId,
        address indexed claimant,
        uint256 amount,
        address claimedBy
    );

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(escrowId < nextEscrowId, "Escrow does not exist");
        _;
    }

    modifier onlyActive(uint256 escrowId) {
        require(escrows[escrowId].status == EscrowStatus.Active, "Escrow not active");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _feeCollector) {
        owner = msg.sender;
        feeCollector = _feeCollector;
    }

    // ─── Structs (Input) ───────────────────────────────────────────────

    struct CreateEscrowParams {
        address recipient;
        address token;
        uint256 amount;
        uint256 deadline;
        uint256 releaseTime;
        ReleaseCondition condition;
        address[] agents;
        uint256 requiredApprovals;
        bytes32 memo;
        string description;
        string socialHandle;
        string socialPlatform;
    }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @notice Create a new escrow with TIP-20 tokens
    /// @param params The escrow creation parameters
    function createEscrow(CreateEscrowParams calldata params) external returns (uint256 escrowId) {
        // recipient can be address(0) for open bounties
        require(params.amount > 0, "Amount must be > 0");
        require(params.deadline > block.timestamp, "Deadline must be future");
        require(params.token != address(0), "Invalid token");

        if (params.condition == ReleaseCondition.MultiSig) {
            require(params.agents.length >= params.requiredApprovals, "Not enough agents");
            require(params.requiredApprovals > 0, "Need at least 1 approval");
        }

        if (params.condition == ReleaseCondition.AgentApproval) {
            require(params.agents.length > 0, "Need at least 1 agent");
        }

        if (params.condition == ReleaseCondition.TimeLock) {
            require(params.releaseTime > block.timestamp, "Release time must be future");
            require(params.releaseTime <= params.deadline, "Release time must be before deadline");
        }

        // Transfer tokens from depositor to this contract
        ITIP20(params.token).transferFrom(msg.sender, address(this), params.amount);

        escrowId = nextEscrowId++;

        Escrow storage e = escrows[escrowId];
        e.id = escrowId;
        e.depositor = msg.sender;
        e.recipient = params.recipient;
        e.token = params.token;
        e.amount = params.amount;
        e.createdAt = block.timestamp;
        e.deadline = params.deadline;
        e.releaseTime = params.releaseTime;
        e.status = EscrowStatus.Active;
        e.condition = params.condition;
        e.memo = params.memo;
        e.description = params.description;
        e.socialHandle = params.socialHandle;
        e.socialPlatform = params.socialPlatform;
        e.requiredApprovals = params.requiredApprovals;

        for (uint256 i = 0; i < params.agents.length; i++) {
            e.agents.push(params.agents[i]);
        }

        userEscrows[msg.sender].push(escrowId);
        if (params.recipient != address(0)) {
            recipientEscrows[params.recipient].push(escrowId);
        }

        emit EscrowCreated(escrowId, msg.sender, params.recipient, params.token, params.amount, params.condition, params.memo);
    }

    /// @notice Agent approves release of escrowed funds
    /// @param escrowId The escrow to approve
    function approveRelease(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(_isAgent(e, msg.sender), "Not an authorized agent");
        require(!hasApproved[escrowId][msg.sender], "Already approved");

        hasApproved[escrowId][msg.sender] = true;
        e.approvalCount++;

        emit AgentApproved(escrowId, msg.sender, e.approvalCount, e.requiredApprovals);

        // Auto-release on sufficient approvals
        if (e.condition == ReleaseCondition.AgentApproval && e.approvalCount >= 1) {
            _release(escrowId);
        } else if (e.condition == ReleaseCondition.MultiSig && e.approvalCount >= e.requiredApprovals) {
            _release(escrowId);
        }
    }

    /// @notice Release funds for a TimeLock escrow after the release time
    /// @param escrowId The escrow to release
    function releaseTimeLock(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(e.condition == ReleaseCondition.TimeLock, "Not a time-lock escrow");
        require(block.timestamp >= e.releaseTime, "Release time not reached");

        _release(escrowId);
    }

    /// @notice Release with social verification (called by agent after off-chain verification)
    /// @param escrowId The escrow to release
    /// @param verified Whether the social verification passed
    function releaseSocialVerified(uint256 escrowId, bool verified)
        external
        escrowExists(escrowId)
        onlyActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(e.condition == ReleaseCondition.SocialVerified, "Not social-verified escrow");
        require(_isAgent(e, msg.sender), "Not an authorized agent");

        emit SocialVerification(escrowId, e.socialPlatform, e.socialHandle, verified);

        if (verified) {
            _release(escrowId);
        }
    }

    /// @notice Agent assigns a recipient and releases funds for an open bounty
    /// @param escrowId The bounty escrow to claim
    /// @param claimant The address that completed the bounty
    function claimBounty(uint256 escrowId, address claimant)
        external
        escrowExists(escrowId)
        onlyActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(e.recipient == address(0), "Not an open bounty");
        require(claimant != address(0), "Invalid claimant");
        require(_isAgent(e, msg.sender), "Not an authorized agent");

        // Assign recipient and release atomically
        e.recipient = claimant;
        recipientEscrows[claimant].push(escrowId);

        e.status = EscrowStatus.Released;

        uint256 fee = (e.amount * PROTOCOL_FEE_BPS) / 10000;
        uint256 payout = e.amount - fee;

        if (fee > 0) {
            require(ITIP20(e.token).transfer(feeCollector, fee), "Fee transfer failed");
        }
        require(ITIP20(e.token).transferWithMemo(claimant, payout, e.memo), "Payout transfer failed");

        emit BountyClaimed(escrowId, claimant, payout, msg.sender);
        emit EscrowReleased(escrowId, claimant, payout, msg.sender);
    }

    /// @notice Refund expired escrow to depositor
    /// @param escrowId The escrow to refund
    function refundExpired(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(block.timestamp >= e.deadline, "Deadline not reached");

        e.status = EscrowStatus.Expired;
        require(ITIP20(e.token).transfer(e.depositor, e.amount), "Refund transfer failed");

        emit EscrowRefunded(escrowId, e.depositor, e.amount);
    }

    /// @notice Depositor can initiate a dispute
    /// @param escrowId The escrow to dispute
    function dispute(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(
            msg.sender == e.depositor || msg.sender == e.recipient,
            "Not a participant"
        );

        e.status = EscrowStatus.Disputed;
        emit EscrowDisputed(escrowId, msg.sender);
    }

    /// @notice Owner resolves a dispute
    /// @param escrowId The escrow to resolve
    /// @param releaseToRecipient True to release to recipient, false to refund depositor
    function resolveDispute(uint256 escrowId, bool releaseToRecipient)
        external
        onlyOwner
        escrowExists(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.Disputed, "Not disputed");

        if (releaseToRecipient) {
            _release(escrowId);
        } else {
            e.status = EscrowStatus.Refunded;
            require(ITIP20(e.token).transfer(e.depositor, e.amount), "Refund transfer failed");
            emit EscrowRefunded(escrowId, e.depositor, e.amount);
        }
    }

    // ─── Structs (View) ────────────────────────────────────────────────

    struct EscrowInfo {
        uint256 id;
        address depositor;
        address recipient;
        address token;
        uint256 amount;
        uint256 createdAt;
        uint256 deadline;
        uint256 releaseTime;
        EscrowStatus status;
        ReleaseCondition condition;
        bytes32 memo;
        string description;
        uint256 approvalCount;
        uint256 requiredApprovals;
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function getEscrow(uint256 escrowId) external view returns (EscrowInfo memory) {
        Escrow storage e = escrows[escrowId];
        return EscrowInfo({
            id: e.id,
            depositor: e.depositor,
            recipient: e.recipient,
            token: e.token,
            amount: e.amount,
            createdAt: e.createdAt,
            deadline: e.deadline,
            releaseTime: e.releaseTime,
            status: e.status,
            condition: e.condition,
            memo: e.memo,
            description: e.description,
            approvalCount: e.approvalCount,
            requiredApprovals: e.requiredApprovals
        });
    }

    function getEscrowAgents(uint256 escrowId) external view returns (address[] memory) {
        return escrows[escrowId].agents;
    }

    function getEscrowSocial(uint256 escrowId) external view returns (
        string memory socialHandle,
        string memory socialPlatform
    ) {
        Escrow storage e = escrows[escrowId];
        return (e.socialHandle, e.socialPlatform);
    }

    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return userEscrows[user];
    }

    function getRecipientEscrows(address user) external view returns (uint256[] memory) {
        return recipientEscrows[user];
    }

    // ─── Internal Functions ──────────────────────────────────────────────

    function _release(uint256 escrowId) internal {
        Escrow storage e = escrows[escrowId];
        e.status = EscrowStatus.Released;

        uint256 fee = (e.amount * PROTOCOL_FEE_BPS) / 10000;
        uint256 payout = e.amount - fee;

        if (fee > 0) {
            require(ITIP20(e.token).transfer(feeCollector, fee), "Fee transfer failed");
        }
        require(ITIP20(e.token).transferWithMemo(e.recipient, payout, e.memo), "Payout transfer failed");

        emit EscrowReleased(escrowId, e.recipient, payout, msg.sender);
    }

    function _isAgent(Escrow storage e, address addr) internal view returns (bool) {
        for (uint256 i = 0; i < e.agents.length; i++) {
            if (e.agents[i] == addr) return true;
        }
        return false;
    }

    // ─── Admin Functions ─────────────────────────────────────────────────

    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
}
