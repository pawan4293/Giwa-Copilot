// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Scheduler.sol";

contract SchedulerTest is Test {
    Scheduler public scheduler;

    address constant OWNER     = address(0x1);
    address constant RECIPIENT = address(0x2);
    address constant STRANGER  = address(0x3);

    uint256 constant AMOUNT_PER  = 0.01 ether;
    uint256 constant INTERVAL    = 1 days;
    uint256 constant OCCURRENCES = 5;

    function setUp() public {
        scheduler = new Scheduler();
        vm.deal(OWNER, 100 ether);
        vm.deal(STRANGER, 1 ether);
    }

    // ──────────────────────────────────────────
    // Deposit tests
    // ──────────────────────────────────────────

    function test_deposit_correctMath() public {
        uint256 total = AMOUNT_PER * OCCURRENCES;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        uint256 id = scheduler.deposit{value: total}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );

        (
            address owner,
            address recipient,
            uint256 amountPerRelease,
            uint256 interval,
            uint256 occurrences,
            uint256 released,
            uint256 nextReleaseAt,
            ,
            bool active
        ) = scheduler.schedules(id);

        assertEq(owner,            OWNER);
        assertEq(recipient,        RECIPIENT);
        assertEq(amountPerRelease, AMOUNT_PER);
        assertEq(interval,         INTERVAL);
        assertEq(occurrences,      OCCURRENCES);
        assertEq(released,         0);
        assertEq(nextReleaseAt,    block.timestamp + INTERVAL);
        assertTrue(active);
        assertEq(address(scheduler).balance, total);
    }

    function test_deposit_wrongValue_reverts() public {
        uint256 wrongValue = AMOUNT_PER * OCCURRENCES - 1;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        vm.expectRevert(
            abi.encodeWithSelector(
                Scheduler.WrongValue.selector,
                wrongValue,
                AMOUNT_PER * OCCURRENCES
            )
        );
        scheduler.deposit{value: wrongValue}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );
    }

    // ──────────────────────────────────────────
    // Release-too-early test
    // ──────────────────────────────────────────

    function test_release_tooEarly_reverts() public {
        uint256 total  = AMOUNT_PER * OCCURRENCES;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        uint256 id = scheduler.deposit{value: total}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );

        // Warp to just before the first release is due
        vm.warp(block.timestamp + INTERVAL - 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                Scheduler.NotDueYet.selector,
                block.timestamp + 1,
                block.timestamp
            )
        );
        scheduler.release(id);
    }

    // ──────────────────────────────────────────
    // Full release cycle
    // ──────────────────────────────────────────

    function test_fullReleaseCycle_zeroBalance() public {
        uint256 total  = AMOUNT_PER * OCCURRENCES;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        uint256 id = scheduler.deposit{value: total}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );

        uint256 recipientBefore = RECIPIENT.balance;

        for (uint256 i = 0; i < OCCURRENCES; i++) {
            vm.warp(block.timestamp + INTERVAL);
            scheduler.release(id);
        }

        assertEq(address(scheduler).balance, 0);
        assertEq(RECIPIENT.balance, recipientBefore + total);

        // schedule should be inactive
        (,,,,,,,, bool active) = scheduler.schedules(id);
        assertFalse(active);
    }

    // ──────────────────────────────────────────
    // Owner-only cancel
    // ──────────────────────────────────────────

    function test_cancel_nonOwner_reverts() public {
        uint256 total  = AMOUNT_PER * OCCURRENCES;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        uint256 id = scheduler.deposit{value: total}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );

        vm.prank(STRANGER);
        vm.expectRevert(
            abi.encodeWithSelector(
                Scheduler.NotOwner.selector,
                STRANGER,
                OWNER
            )
        );
        scheduler.cancel(id);
    }

    // ──────────────────────────────────────────
    // Partial refund on mid-schedule cancel
    // ──────────────────────────────────────────

    function test_cancel_midSchedule_correctRefund() public {
        uint256 total  = AMOUNT_PER * OCCURRENCES;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        uint256 id = scheduler.deposit{value: total}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );

        // Release 2 out of 5
        for (uint256 i = 0; i < 2; i++) {
            vm.warp(block.timestamp + INTERVAL);
            scheduler.release(id);
        }

        uint256 ownerBefore = OWNER.balance;

        // Cancel — should refund remaining 3 releases
        vm.prank(OWNER);
        scheduler.cancel(id);

        uint256 expectedRefund = (OCCURRENCES - 2) * AMOUNT_PER;
        assertEq(OWNER.balance, ownerBefore + expectedRefund);
        assertEq(address(scheduler).balance, 0);

        // Schedule must be inactive
        (,,,,,,,, bool active) = scheduler.schedules(id);
        assertFalse(active);
    }

    // ──────────────────────────────────────────
    // Double-cancel guard
    // ──────────────────────────────────────────

    function test_cancel_inactive_reverts() public {
        uint256 total  = AMOUNT_PER * OCCURRENCES;
        uint256 endsAt = block.timestamp + 365 days;

        vm.prank(OWNER);
        uint256 id = scheduler.deposit{value: total}(
            RECIPIENT, AMOUNT_PER, INTERVAL, OCCURRENCES, endsAt
        );

        vm.prank(OWNER);
        scheduler.cancel(id);

        vm.prank(OWNER);
        vm.expectRevert(
            abi.encodeWithSelector(Scheduler.ScheduleInactive.selector, id)
        );
        scheduler.cancel(id);
    }
}
