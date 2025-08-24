import { useAppKitAccount } from '@reown/appkit/react';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type User = {
  name: string;
  balance: string;
  card: {
    displayName: string;
    expMonth: string;
    expYear: string;
    number: string;
    cvc: string;
  };
};

type Portfolio = {
  tokens: Array<string>;
};

interface UserContext {
  user: User;
  portfolio: Portfolio;
}

const initialValue = {
  user: {
    name: '',
    balance: '',
    card: {
      displayName: '',
      expMonth: '',
      expYear: '',
      number: '',
      cvc: '',
    },
  },
  portfolio: {
    tokens: [],
  },
};

const UserContext = createContext<UserContext>(initialValue);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User>(initialValue.user);
  const [portfolio, setPortfolio] = useState<Portfolio>(initialValue.portfolio);

  const { address } = useAppKitAccount();

  const fetchUser = useCallback(async () => {
    try {
      if (!address) return;

      const res = await fetch('/api/get-user-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        throw new Error('Fetch user failed :/');
      }

      const user: User = await res.json();

      setUser(user);
    } catch (err) {
      console.log(err);
    }
  }, [address]);

  // const fetchUserPortfolio = useCallback(() => {}, []);

  useEffect(() => {
    window.addEventListener('fetch_user', fetchUser as EventListener);

    return () =>
      window.removeEventListener('fetch_user', fetchUser as EventListener);
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, portfolio }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
