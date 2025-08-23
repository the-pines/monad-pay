import type { Address, Hex } from "viem";

export type ForwardRequest = {
  from: Address;
  to: Address;
  value: string; // decimal string
  gas: string; // decimal string
  nonce: string; // decimal string
  deadline: string; // unix timestamp seconds as decimal string
  data: Hex;
};

export type Eip712Domain = {
  name: "ERC2771Forwarder";
  version: "0.0.1";
  chainId: number;
  verifyingContract: Address;
};

export const FORWARD_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
} as const;

export type ForwardTypes = typeof FORWARD_TYPES;
