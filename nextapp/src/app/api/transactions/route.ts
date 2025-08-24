import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { ERC20_TOKENS, TOKEN_USD_PRICE } from "@/config/tokens";

const ENVIO_URL = process.env.ENVIO_URL;
const USD_TO_MXN = Number(process.env.USD_TO_MXN ?? "17.00");
const HIDE_TO_ADDRESS =
  "0xDCaa4667Bf4a8383D02B2Fb95a824778993BB99D".toLowerCase();
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as `0x${string}`;
const APPROVAL_TOPIC =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" as `0x${string}`;

function toNumber(raw: string, decimals: number): number {
  if (!raw) return 0;
  const bn = Number(raw);
  if (!Number.isFinite(bn)) return 0;
  return bn / 10 ** decimals;
}

function toUsd(amount: number, symbol: string): number | undefined {
  const price = TOKEN_USD_PRICE[symbol];
  if (!price) return undefined;
  return amount * price;
}

function isZeroValue(raw: unknown): boolean {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "number") return raw === 0;
  const s = String(raw);
  // handle hex or decimal string without using BigInt literal
  if (s === "0" || s === "0x0" || s === "0x") return true;
  // Fallback numeric parse (may lose precision for huge values, but good enough for zero check)
  const n = Number(s);
  return Number.isFinite(n) ? n === 0 : false;
}

function isMaxUint256Hex(raw: string | undefined): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  return s.length === 66 && /^0x[f]+$/.test(s);
}

function toPaddedTopicAddress(address: string): `0x${string}` {
  const addr = address.startsWith("0x") ? address.slice(2) : address;
  return `0x${"0".repeat(24)}${addr.toLowerCase()}` as `0x${string}`;
}

function topicToAddress(topic: string | undefined): `0x${string}` | undefined {
  if (!topic || !topic.startsWith("0x") || topic.length !== 66)
    return undefined;
  return `0x${topic.slice(26)}` as `0x${string}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address") || "";
    const limit = Number(url.searchParams.get("limit") || "200");
    const fromBlock = Number(url.searchParams.get("fromBlock") || "15362000");
    if (!address) return NextResponse.json([], { status: 200 });

    const getTransactions = unstable_cache(
      async () => {
        // Build HyperSync query (native tx + ERC20 Transfer & Approval logs involving this address)
        const hypersyncBody = {
          from_block: Number.isFinite(fromBlock) ? fromBlock : 0,
          transactions: [{ from: [address] }, { to: [address] }],
          logs: [
            {
              topics: [[TRANSFER_TOPIC], [], [toPaddedTopicAddress(address)]],
            },
            {
              topics: [[TRANSFER_TOPIC], [toPaddedTopicAddress(address)], []],
            },
            {
              topics: [[APPROVAL_TOPIC], [toPaddedTopicAddress(address)], []],
            },
            {
              topics: [[APPROVAL_TOPIC], [], [toPaddedTopicAddress(address)]],
            },
          ],
          field_selection: {
            block: ["number", "timestamp", "hash"],
            log: [
              "block_number",
              "log_index",
              "transaction_index",
              "data",
              "address",
              "topic0",
              "topic1",
              "topic2",
              "topic3",
            ],
            transaction: [
              "block_number",
              "transaction_index",
              "hash",
              "from",
              "to",
              "value",
              "input",
            ],
          },
        } as const;

        const endpoint =
          ENVIO_URL || "https://monad-testnet.hypersync.xyz/query";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(hypersyncBody),
          // Cache the upstream response briefly to avoid hammering provider
          next: { revalidate: 30 },
        });
        if (!res.ok) return [] as unknown[];

        type HypersyncTransaction = {
          block_number: number | string;
          transaction_index: number | string;
          hash: string;
          from: string;
          to?: string | null;
          value?: string | number;
        };
        type HypersyncBlock = {
          number: number | string;
          timestamp: number | string; // seconds
          hash: string;
        };
        type HypersyncLog = {
          block_number: number | string;
          log_index: number | string;
          transaction_index: number | string;
          data?: `0x${string}`;
          address: `0x${string}`;
          topic0?: `0x${string}`;
          topic1?: `0x${string}`;
          topic2?: `0x${string}`;
          topic3?: `0x${string}`;
        };

        type HypersyncBatch = {
          transactions?: HypersyncTransaction[];
          logs?: HypersyncLog[];
          blocks?: HypersyncBlock[];
        };

        const payload = (await res.json()) as { data?: HypersyncBatch[] };
        const batches: HypersyncBatch[] = payload.data ?? [];
        const txs: HypersyncTransaction[] = batches.flatMap(
          (b) => b.transactions ?? []
        );
        const logs: HypersyncLog[] = batches.flatMap((b) => b.logs ?? []);
        const blocks: HypersyncBlock[] = batches.flatMap((b) => b.blocks ?? []);

        const blockNumberToTimestamp = new Map<number, number>();
        for (const b of blocks) {
          const num = Number(b.number);
          const ts = Number(b.timestamp);
          if (Number.isFinite(num) && Number.isFinite(ts)) {
            blockNumberToTimestamp.set(num, ts);
          }
        }

        const native = txs
          .filter(
            (t) =>
              !isZeroValue(t.value) &&
              (t.to || "").toLowerCase() !== HIDE_TO_ADDRESS
          )
          .map((t) => {
            const isOut =
              (t.from || "").toLowerCase() === address.toLowerCase();
            const amountMon = toNumber(String(t.value ?? "0"), 18);
            const amountUsd =
              toUsd(amountMon, "MON") ?? toUsd(amountMon, "WMON");
            const amountPrimary =
              amountUsd !== undefined
                ? amountUsd * USD_TO_MXN
                : amountMon * USD_TO_MXN;
            const blockTsSec = blockNumberToTimestamp.get(
              Number(t.block_number)
            );
            const datetime = blockTsSec
              ? new Date(blockTsSec * 1000).toISOString()
              : new Date().toISOString();
            return {
              id: `${t.hash}`,
              title: isOut ? "Sent MON" : "Received MON",
              note: isOut ? t.to || undefined : t.from,
              amountPrimary,
              amountUsd: amountUsd ?? undefined,
              direction: isOut ? "out" : "in",
              datetime,
            };
          });

        const knownErc20ByAddress = new Map(
          ERC20_TOKENS.map((t) => [t.address.toLowerCase(), t])
        );

        const erc20 = logs
          .filter((l) => l.topic0 === TRANSFER_TOPIC)
          .map((l) => {
            const fromAddr = topicToAddress(l.topic1)?.toLowerCase();
            const toAddr = topicToAddress(l.topic2)?.toLowerCase();
            const isOut = fromAddr === address.toLowerCase();
            const token = knownErc20ByAddress.get(l.address.toLowerCase());
            const decimals = token?.decimals ?? 18;
            const symbol = token?.symbol ?? "TOKEN";
            const raw = l.data ?? ("0x0" as `0x${string}`);
            let amount = 0;
            try {
              amount = Number(BigInt(raw)) / 10 ** decimals;
            } catch {
              amount = 0;
            }
            if (amount === 0) return null;
            const amountUsd = toUsd(amount, symbol);
            const amountPrimary =
              amountUsd !== undefined
                ? amountUsd * USD_TO_MXN
                : amount * USD_TO_MXN;
            const blockTsSec = blockNumberToTimestamp.get(
              Number(l.block_number)
            );
            const datetime = blockTsSec
              ? new Date(blockTsSec * 1000).toISOString()
              : new Date().toISOString();
            return {
              id: `${l.block_number}-${l.log_index}-erc20`,
              title: `${isOut ? "Sent" : "Received"} ${symbol}`,
              note: isOut ? toAddr : fromAddr,
              amountPrimary,
              amountUsd: amountUsd ?? undefined,
              direction: isOut ? "out" : "in",
              datetime,
            };
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x));

        const approvals = logs
          .filter((l) => l.topic0 === APPROVAL_TOPIC)
          .map((l) => {
            const ownerAddr = topicToAddress(l.topic1)?.toLowerCase();
            const spenderAddr = topicToAddress(l.topic2)?.toLowerCase();
            const isOut = ownerAddr === address.toLowerCase();
            const token = knownErc20ByAddress.get(l.address.toLowerCase());
            const symbol = token?.symbol ?? "TOKEN";
            const raw = l.data ?? ("0x0" as `0x${string}`);
            const unlimited = isMaxUint256Hex(raw);
            const amountUsd = undefined as number | undefined;
            const amountPrimary = 0;
            const blockTsSec = blockNumberToTimestamp.get(
              Number(l.block_number)
            );
            const datetime = blockTsSec
              ? new Date(blockTsSec * 1000).toISOString()
              : new Date().toISOString();
            return {
              id: `${l.block_number}-${l.log_index}-approval`,
              title: isOut
                ? `Approved ${symbol}${unlimited ? " (unlimited)" : ""}`
                : `Received approval ${symbol}${
                    unlimited ? " (unlimited)" : ""
                  }`,
              note: isOut ? spenderAddr : ownerAddr,
              amountPrimary,
              amountUsd: amountUsd ?? undefined,
              direction: isOut ? "out" : "in",
              datetime,
            };
          });

        const sorted = [...native, ...erc20, ...approvals].sort(
          (a, b) =>
            new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
        );
        const limited = Number.isFinite(limit)
          ? sorted.slice(0, limit)
          : sorted;

        return limited;
      },
      ["transactions", address.toLowerCase(), String(limit), String(fromBlock)],
      { revalidate: 30, tags: [`transactions:${address.toLowerCase()}`] }
    );

    const data = await getTransactions();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
