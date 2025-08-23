import VaultFactoryArtifact from "./contracts/VaultFactory.json";
import VaultArtifact from "./contracts/Vault.json";
import PointsTokenArtifact from "./contracts/PointsToken.json";
import AdminMinterLeaderboardArtifact from "./contracts/AdminMinterLeaderboard.json";
import type { Abi } from "viem";

export const VAULT_FACTORY_ADDRESS = (process.env
  .NEXT_PUBLIC_VAULT_FACTORY_ADDRESS || "") as `0x${string}`;

// ABI for VaultFactory (sourced from compiled artifact)
export const VAULT_FACTORY_ABI = VaultFactoryArtifact.abi as Abi;
export const VAULT_ABI = VaultArtifact.abi as Abi;

// Points / AdminMinterLeaderboard
export const POINTS_TOKEN_ADDRESS = (process.env
  .NEXT_PUBLIC_POINTS_TOKEN_ADDRESS || "") as `0x${string}`;
export const AML_ADDRESS = (process.env.NEXT_PUBLIC_AML_ADDRESS ||
  "") as `0x${string}`;

export const POINTS_TOKEN_ABI = PointsTokenArtifact.abi as Abi;
export const AML_ABI = AdminMinterLeaderboardArtifact.abi as Abi;

export const DELEGATOR_ADDRESS = (process.env.NEXT_PUBLIC_DELEGATOR_ADDRESS ||
  "") as `0x${string}`;
