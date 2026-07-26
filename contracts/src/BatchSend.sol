// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title BatchSend
/// @notice Sends ETH to multiple recipients in a single transaction.
/// @dev Sender must send exactly the sum of all amounts as msg.value.
contract BatchSend {
    event BatchSent(address indexed sender, uint256 totalAmount, uint256 recipientCount);

    error LengthMismatch();
    error IncorrectValue();
    error TransferFailed(address recipient);

    /// @notice Send different amounts to different recipients in one transaction.
    /// @param recipients List of recipient addresses.
    /// @param amounts List of amounts (in wei) matching each recipient, same order.
    function batchSend(address[] calldata recipients, uint256[] calldata amounts) external payable {
        if (recipients.length != amounts.length) revert LengthMismatch();

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (msg.value != total) revert IncorrectValue();

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = payable(recipients[i]).call{value: amounts[i]}("");
            if (!success) revert TransferFailed(recipients[i]);
        }

        emit BatchSent(msg.sender, total, recipients.length);
    }
}