import { ERC20_TOKENS } from '@/config/tokens';
import { getUsdPricesForSymbols } from '@/lib/prices';
import { useAppKitAccount } from '@reown/appkit/react';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { erc20Abi, formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';

type User = {
  name: string;
  card: {
    displayName: string;
    expiry: string;
    number: string;
    cvc: string;
  };
};

type Token = {
  symbol: string;
  name: string;
  decimals: number;
  amount: number;
  amountUsd: number;
};

type Portfolio = Array<Token>;

interface UserContext {
  user: User;
  portfolio: Portfolio;
  balance: string;
  isFetchingUser: boolean;
  isFetchingPortfolio: boolean;
}

const initialValue = {
  user: {
    name: '',
    card: {
      displayName: '',
      expiry: '',
      number: '',
      cvc: '',
    },
  },
  balance: '',
  portfolio: [],
  isFetchingUser: false,
  isFetchingPortfolio: false,
};

const UserContext = createContext<UserContext>(initialValue);

const USER_CACHE: Record<string, User> = {};
let BALANCE_CACHE: string = '0';

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(initialValue.user);
  const [isFetchingUser, setIsFetchingUser] = useState<boolean>(false);

  const [balance, setBalance] = useState<string>(BALANCE_CACHE);
  const [portfolio, setPortfolio] = useState<Portfolio>(initialValue.portfolio);
  const [isFetchingPortfolio, setIsFetchingPortfolio] = useState<boolean>(false); //prettier-ignore

  const { address } = useAppKitAccount();
  const publicClient = usePublicClient();

  const fetchUser = useCallback(async () => {
    if (!address) return;

    if (USER_CACHE[address]) {
      setUser(USER_CACHE[address]);
      return;
    }

    try {
      setIsFetchingUser(true);

      const res = await fetch('/api/get-user-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        throw new Error('Fetch user failed :/');
      }

      const data = await res.json();

      setUser(data.user);
      USER_CACHE[address] = data.user;
    } catch (err) {
      console.log(err);
    } finally {
      setIsFetchingUser(false);
    }
  }, [address]);

  const fetchPortfolio = useCallback(async () => {
    if (!address || !publicClient) return;

    try {
      setIsFetchingPortfolio(true);

      const native = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      const nativeAmount = parseFloat(formatUnits(native, 18));

      const items: Portfolio = [];
      if (nativeAmount > 0) {
        items.push({
          symbol: 'MON',
          name: 'Monad',
          decimals: 18,
          amount: nativeAmount,
          amountUsd: 0,
        });
      }

      const erc20Results = await publicClient.multicall({
        allowFailure: true,
        contracts: ERC20_TOKENS.map((t) => ({
          address: t.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [address as `0x${string}`],
        })),
      });

      ERC20_TOKENS.forEach((t, i) => {
        const r = erc20Results[i];

        const bal = r.status === 'success' ? (r.result as bigint) : BigInt(0);
        if (bal === BigInt(0)) return;

        const amount = parseFloat(formatUnits(bal, t.decimals));
        if (amount <= 0) return;

        items.push({
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          amount,
          amountUsd: 0,
        });
      });

      // Fetch dynamic prices via 0x-backed oracle
      const symbols = Array.from(new Set(items.map((i) => i.symbol)));
      const prices = await getUsdPricesForSymbols(symbols);
      for (const it of items) {
        const p = prices[it.symbol.toUpperCase()];
        if (p && Number.isFinite(p)) it.amountUsd = it.amount * p;
      }

      const totalUsd = String(
        items.reduce((s, it) => s + it.amountUsd, 0).toFixed(2)
      );

      BALANCE_CACHE = totalUsd;
      setBalance(totalUsd);
      setPortfolio(items);
    } catch (err) {
      console.log(err);
    } finally {
      setIsFetchingPortfolio(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    if (!address) return;

    fetchUser();
    fetchPortfolio();
  }, [address, fetchUser, fetchPortfolio]);

  useEffect(() => {
    if (!publicClient || !address) return;

    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber: () => {
        fetchPortfolio();
      },
      emitOnBegin: false,
      poll: true,
    });

    return () => {
      unwatch?.();
    };
  }, [publicClient, address, fetchPortfolio]);

  return (
    <UserContext.Provider
      value={{ user, balance, portfolio, isFetchingUser, isFetchingPortfolio }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;

export const useUser = () => {
  return useContext(UserContext);
};
