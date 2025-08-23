import VaultFactoryArtifact from "./contracts/VaultFactory.json";
import VaultArtifact from "./contracts/Vault.json";
import type { Abi } from "viem";

export const VAULT_FACTORY_ADDRESS = (process.env
  .NEXT_PUBLIC_VAULT_FACTORY_ADDRESS || "") as `0x${string}`;

// ABI for VaultFactory (sourced from compiled artifact)
export const VAULT_FACTORY_ABI = VaultFactoryArtifact.abi as Abi;
export const VAULT_ABI = VaultArtifact.abi as Abi;

// Minimal ERC20 ABI bits that we might need
export const ERC20_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
