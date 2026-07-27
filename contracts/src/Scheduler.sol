// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Scheduler
/// @notice Trustless recurring payment scheduler for GIWA Sepolia.
contract Scheduler {
    struct Schedule {
        address owner;
        address recipient;
        uint256 amountPerRelease;
        uint256 remainingBalance;
        uint256 interval;
        uint256 occurrences;
        uint256 released;
        uint256 nextReleaseAt;
        uint256 endsAt;
        bool active;
    }

    mapping(uint256 => Schedule) public schedules;
    uint256 public nextId;

    event Deposited(
        uint256 indexed id,
        address indexed owner,
        address indexed recipient,
        uint256 amountPerRelease,
        uint256 interval,
        uint256 occurrences,
        uint256 totalDeposited,
        uint256 firstReleaseAt,
        uint256 endsAt
    );
    event Released(uint256 indexed id, address indexed recipient, uint256 amount, uint256 releaseIndex, uint256 timestamp);
    event Cancelled(uint256 indexed id, address indexed owner, uint256 refundAmount, uint256 timestamp);

    error ScheduleInactive(uint256 id);
    error NotOwner(address caller, address owner);
    error NotDue();
    error TransferFailed();

    /// @param firstDelay Seconds to wait before the FIRST release (lets the user pick an exact start time)
    /// @param interval Seconds between each release AFTER the first one
    function deposit(
        address recipient,
        uint256 amountPerRelease,
        uint256 firstDelay,
        uint256 interval,
        uint256 occurrences,
        uint256 endsAt
    ) external payable returns (uint256 id) {
        require(msg.value == amountPerRelease * occurrences, "deposit must match amountPerRelease * occurrences");
        require(occurrences > 0, "occurrences must be > 0");

        id = nextId++;
        uint256 firstReleaseAt = block.timestamp + firstDelay;

        schedules[id] = Schedule({
            owner: msg.sender,
            recipient: recipient,
            amountPerRelease: amountPerRelease,
            remainingBalance: msg.value,
            interval: interval,
            occurrences: occurrences,
            released: 0,
            nextReleaseAt: firstReleaseAt,
            endsAt: endsAt,
            active: true
        });

        emit Deposited(id, msg.sender, recipient, amountPerRelease, interval, occurrences, msg.value, firstReleaseAt, endsAt);
    }

    function release(uint256 id) external {
        Schedule storage s = schedules[id];
        if (!s.active) revert ScheduleInactive(id);
        if (block.timestamp < s.nextReleaseAt) revert NotDue();

        uint256 amount = s.amountPerRelease;
        s.remainingBalance -= amount;
        s.released += 1;
        s.nextReleaseAt += s.interval;

        if (s.released >= s.occurrences || block.timestamp >= s.endsAt) {
            s.active = false;
        }

        (bool ok, ) = s.recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Released(id, s.recipient, amount, s.released - 1, block.timestamp);
    }

    function cancel(uint256 id) external {
        Schedule storage s = schedules[id];
        if (msg.sender != s.owner) revert NotOwner(msg.sender, s.owner);
        if (!s.active) revert ScheduleInactive(id);

        uint256 refund = s.remainingBalance;
        s.remainingBalance = 0;
        s.active = false;

        (bool ok, ) = s.owner.call{value: refund}("");
        if (!ok) revert TransferFailed();

        emit Cancelled(id, s.owner, refund, block.timestamp);
    }
}