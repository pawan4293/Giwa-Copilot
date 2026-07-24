import { parseAbi } from "viem";

// ────────────────────────────────────────────────────────────────────────────
// Contract addresses — GIWA Sepolia Testnet (chain ID 91342)
// Source: https://docs.giwa.io/network-information/contracts
// ────────────────────────────────────────────────────────────────────────────

export const CONTRACTS = {
  // Dojang / Verified Address
  DOJANG_SCROLL:             "0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9",
  EAS:                       "0x4200000000000000000000000000000000000021",
  EAS_SCHEMA_REGISTRY:       "0x4200000000000000000000000000000000000020",

  // OP Stack precompiles / system contracts
  WETH9:                     "0x4200000000000000000000000000000000000006",
  L2_STANDARD_BRIDGE:        "0x4200000000000000000000000000000000000010",
  L2_CROSS_DOMAIN_MESSENGER: "0x4200000000000000000000000000000000000007",

  // ENS-compatible name registry (.up.id)
  UP_NAME_REGISTRY:          "0x091D00004f21eb2Fc30964A8a4995692d9b49628",

  // Pyth price oracle
  PYTH:                      "0x2880aB155794e7179c9eE2e38200202908C17B43",
} as const;


export const ATTESTATION_INDEXER = "0x9C9Bf29880448aB39795a11b669e22A0f1d790ec" as const;
export const VERIFIED_ADDRESS_SCHEMA = "0x072d75e18b2be4f89a13a7147240477481c4b526d5795802acba59046b426e08" as const;
export const PLAYGROUND_ATTESTER = "0x63CCe2b569A7bC35895ee24306c1512fefc06121" as const;

export const ATTESTATION_INDEXER_ABI = parseAbi([
  "function getAttestationUid(bytes32 schemaUid, address attester, address recipient) external view returns (bytes32)",
]);


export const UP_NAME_REGISTRY_ABI = parseAbi([
  "function ownedTokenId(address owner) external view returns (uint256)",
  "function getLabel(bytes32 tokenId) external view returns (string)",
]);

// Dojang attester IDs
export const ATTESTER_IDS = {
  // keccak256("dojang.dojangattesterids.upbitkorea") — production attester
  UPBIT_KOREA:
    "0xd99b42e778498aa3c9c1f6a012359130252780511687a35982e8e52735453034" as const,
  // Testnet-only: GIWA Sepolia Playground self-serve attester.
  // Confirmed via on-chain EAS log (attester = 0x63CCe2b569A7bC35895ee24306c1512fefc06121)
  // that Playground issues test Verified Address attestations under a different
  // attesterId than production. Remove before mainnet.
  PLAYGROUND_TESTNET:
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const, // placeholder, see note below
} as const;

// ────────────────────────────────────────────────────────────────────────────
// ABIs — minimal, only the functions actually used by this app
// ────────────────────────────────────────────────────────────────────────────

// DojangScroll — verified address checks
export const DOJANG_SCROLL_ABI = parseAbi([
  "function isVerified(address addr, bytes32 attesterId) external view returns (bool)",
  "function getVerifiedAddressAttestationUid(address addr, bytes32 attesterId) external view returns (bytes32)",
]);

// Scheduler — deployed separately (address comes from SCHEDULER_CONTRACT_ADDRESS env var)
export const SCHEDULER_ABI = parseAbi([
  "function deposit(address recipient, uint256 amountPerRelease, uint256 interval, uint256 occurrences, uint256 endsAt) external payable returns (uint256 id)",
  "function release(uint256 id) external",
  "function cancel(uint256 id) external",
  "function remainingBalance(uint256 id) external view returns (uint256)",
  "function nextId() external view returns (uint256)",
  "function schedules(uint256 id) external view returns (address owner, address recipient, uint256 amountPerRelease, uint256 interval, uint256 occurrences, uint256 released, uint256 nextReleaseAt, uint256 endsAt, bool active)",
  "event Deposited(uint256 indexed id, address indexed owner, address indexed recipient, uint256 amountPerRelease, uint256 interval, uint256 occurrences, uint256 totalDeposited, uint256 firstReleaseAt, uint256 endsAt)",
  "event Released(uint256 indexed id, address indexed recipient, uint256 amount, uint256 releaseIndex, uint256 timestamp)",
  "event Cancelled(uint256 indexed id, address indexed owner, uint256 refundAmount, uint256 timestamp)",
]);

// EAS — minimal subset used for attestation reads
export const EAS_ABI = parseAbi([
  "function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))",
  "function isAttestationValid(bytes32 uid) external view returns (bool)",
]);

// Helper: get scheduler address from env (server-side) or return zero address
export function getSchedulerAddress(): `0x${string}` {
  const addr = process.env.SCHEDULER_CONTRACT_ADDRESS;
  if (!addr || addr === "0x0000000000000000000000000000000000000000") {
    return "0x0000000000000000000000000000000000000000";
  }
  return addr as `0x${string}`;
}
