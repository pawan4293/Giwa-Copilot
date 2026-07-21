// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IDojangScroll
/// @notice Minimal interface for the GIWA DojangScroll verified-address contract
/// @dev Deployed at 0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9 on GIWA Sepolia
interface IDojangScroll {
    /// @notice Check whether an address holds a valid Verified Address attestation
    /// @param addr      The wallet address to check
    /// @param attesterId The attester's bytes32 ID (e.g. Upbit Korea attester)
    /// @return True if the address is currently verified by the given attester
    function isVerified(address addr, bytes32 attesterId) external view returns (bool);
}
