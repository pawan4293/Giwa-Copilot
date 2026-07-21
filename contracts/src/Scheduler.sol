// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Scheduler
/// @notice Trustless recurring payment scheduler for GIWA Sepolia.
///         Anyone can call `release()` when payment is due (keeper pattern).
///         Only the original owner can `cancel()` and recover remaining funds.
contract Scheduler {
    // ──────────────────────────────────────────────────────────────
    // Data types
    // ──────────────────────────────────────────────────────────────

    struct Schedule {
        address owner;           // wallet that deposited
        address recipient;       // payment destination
        uint256 amountPerRelease;// wei per interval
        uint256 interval;        // seconds between releases
        uint256 occurrences;     // total releases initially scheduled
        uint256 released;        // how many have been released so far
        uint256 nextReleaseAt;   // unix timestamp of the next allowed release
        uint256 endsAt;          // hard deadline — no release after this
        bool    active;          // false once cancelled or fully paid
    }

    // ──────────────────────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────────────────────

    mapping(uint256 => Schedule) public schedules;
    uint256 public nextId;

    // ──────────────────────────────────────────────────────────────
    // Events (all fields needed for a history UI)
    // ──────────────────────────────────────────────────────────────

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

    event Released(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        uint256 releaseIndex,   // 0-based index of this release
        uint256 timestamp
    );

    event Cancelled(
        uint256 indexed id,
        address indexed owner,
        uint256 refundAmount,
        uint256 timestamp
    );

    // ──────────────────────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────────────────────

    error WrongValue(uint256 sent, uint256 expected);
    error NotDueYet(uint256 nextReleaseAt, uint256 currentTime);
    error ScheduleInactive(uint256 id);
    error NotOwner(address caller, address owner);
    error TransferFailed();
    error ZeroOccurrences();
    error ZeroInterval();
    error ZeroAmount();
    error ZeroRecipient();

    // ──────────────────────────────────────────────────────────────
    // External functions
    // ──────────────────────────────────────────────────────────────

    /// @notice Deposit ETH for a recurring payment schedule.
    /// @param recipient        Address that will receive each periodic payment.
    /// @param amountPerRelease Wei to send on each release.
    /// @param interval         Seconds between consecutive releases.
    /// @param occurrences      Total number of releases to schedule.
    /// @param endsAt           Hard deadline; releases after this time are skipped.
    /// @return id              Unique schedule ID.
    function deposit(
        address recipient,
        uint256 amountPerRelease,
        uint256 interval,
        uint256 occurrences,
        uint256 endsAt
    ) external payable returns (uint256 id) {
        if (recipient == address(0)) revert ZeroRecipient();
        if (amountPerRelease == 0)   revert ZeroAmount();
        if (interval == 0)           revert ZeroInterval();
        if (occurrences == 0)        revert ZeroOccurrences();

        uint256 required = amountPerRelease * occurrences;
        if (msg.value != required)   revert WrongValue(msg.value, required);

        id = nextId++;
        uint256 firstReleaseAt = block.timestamp + interval;

        schedules[id] = Schedule({
            owner:            msg.sender,
            recipient:        recipient,
            amountPerRelease: amountPerRelease,
            interval:         interval,
            occurrences:      occurrences,
            released:         0,
            nextReleaseAt:    firstReleaseAt,
            endsAt:           endsAt,
            active:           true
        });

        emit Deposited(
            id,
            msg.sender,
            recipient,
            amountPerRelease,
            interval,
            occurrences,
            msg.value,
            firstReleaseAt,
            endsAt
        );
    }

    /// @notice Trigger the next scheduled payment. Callable by anyone (keeper pattern).
    ///         Follows checks-effects-interactions.
    /// @param id Schedule ID to release.
    function release(uint256 id) external {
        Schedule storage s = schedules[id];

        // Checks
        if (!s.active) revert ScheduleInactive(id);
        if (block.timestamp < s.nextReleaseAt) revert NotDueYet(s.nextReleaseAt, block.timestamp);
        if (block.timestamp > s.endsAt) revert ScheduleInactive(id);

        uint256 releaseIndex = s.released;
        address recipient    = s.recipient;
        uint256 amount       = s.amountPerRelease;

        // Effects
        s.released        += 1;
        s.nextReleaseAt   += s.interval;

        if (s.released >= s.occurrences) {
            s.active = false;
        }

        // Interactions
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Released(id, recipient, amount, releaseIndex, block.timestamp);
    }

    /// @notice Cancel the schedule and refund all unpaid ETH to the owner.
    ///         Only the original owner may call this.
    ///         Follows checks-effects-interactions.
    /// @param id Schedule ID to cancel.
    function cancel(uint256 id) external {
        Schedule storage s = schedules[id];

        // Checks
        if (!s.active) revert ScheduleInactive(id);
        if (s.owner != msg.sender) revert NotOwner(msg.sender, s.owner);

        uint256 remaining   = s.occurrences - s.released;
        uint256 refundAmount = remaining * s.amountPerRelease;
        address owner        = s.owner;

        // Effects — mark inactive BEFORE external call
        s.active = false;

        // Interactions
        (bool ok,) = owner.call{value: refundAmount}("");
        if (!ok) revert TransferFailed();

        emit Cancelled(id, owner, refundAmount, block.timestamp);
    }

    // ──────────────────────────────────────────────────────────────
    // View helpers
    // ──────────────────────────────────────────────────────────────

    /// @notice Returns the remaining unpaid balance for a schedule.
    function remainingBalance(uint256 id) external view returns (uint256) {
        Schedule storage s = schedules[id];
        return (s.occurrences - s.released) * s.amountPerRelease;
    }
}
