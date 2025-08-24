import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { maxUint256, type Address } from "viem";

import { erc20Abi } from "viem";
import type { KnownErc20Token } from "@/config/tokens";
import { Config } from "wagmi";

export type CardholderBody = {
  user: { name: string; address: string; provider: string };
  cardholder: {
    name: string;
    individual: {
      first_name: string;
      last_name: string;
      dob: { day: number; month: number; year: number };
    };
    billing: {
      address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: "GB";
      };
    };
    email?: string;
    phone_number?: string;
    metadata?: Record<string, string>;
  };
};

export function generateDOBWithinAgeRange(minAge: number, maxAge: number) {
  const now = new Date();
  const latestDOB = new Date(now);
  latestDOB.setFullYear(now.getFullYear() - minAge);
  const earliestDOB = new Date(now);
  earliestDOB.setFullYear(now.getFullYear() - maxAge);

  const randomTime =
    earliestDOB.getTime() +
    Math.random() * (latestDOB.getTime() - earliestDOB.getTime());
  const d = new Date(randomTime);
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

export function buildCardholderBody(args: {
  address: string;
  name: string;
  firstName: string;
  lastName: string;
  dob: { day: number; month: number; year: number };
  billing: { line1: string; city: string; state: string; postal_code: string };
  email?: string;
  phone?: string;
}): CardholderBody {
  const { address, name, firstName, lastName, dob, billing, email, phone } =
    args;

  return {
    user: {
      name: `${firstName} ${lastName}`,
      address: address as Address,
      provider: "wallet",
    },
    cardholder: {
      name: name.trim(),
      individual: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob,
      },
      billing: {
        address: {
          line1: billing.line1.trim(),
          line2: undefined,
          city: billing.city.trim(),
          state: billing.state.trim(),
          postal_code: billing.postal_code.trim(),
          country: "GB",
        },
      },
      email: (email ?? "").trim() || undefined,
      phone_number: (phone ?? "").trim() || undefined,
      metadata: undefined,
    },
  };
}

export async function ensureTokenApprovals(args: {
  config: Config;
  owner: Address;
  spender: Address;
  tokens: KnownErc20Token[];
}) {
  const { config, owner, spender, tokens } = args;

  for (const token of tokens) {
    const allowance = (await readContract(config, {
      address: token.address as Address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
    })) as bigint;
    if (allowance >= maxUint256 / BigInt(2)) continue;

    const txHash = await writeContract(config, {
      account: owner,
      address: token.address as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
    });

    // Ensure the approval is mined before continuing so downstream checks/readContract see the updated allowance
    await waitForTransactionReceipt(config, { hash: txHash });
  }
}

export async function createUser(body: CardholderBody): Promise<void> {
  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Failed to create user";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") {
        message = data.error;
      } else if (typeof data?.message === "string") {
        message = data.message;
      } else if (data) {
        message = JSON.stringify(data);
      }
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(message);
  }
}
