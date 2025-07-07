import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface EbayAccount {
  id: string;
  username: string;
  isConnected: boolean;
  oauthToken?: string;
  expiresAt?: string;
  policies?: {
    paymentPolicyId?: string;
    returnPolicyId?: string;
    fulfillmentPolicyId?: string;
  };
}

interface EbayState {
  account: EbayAccount | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setAccount: (account: EbayAccount) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAccount: () => void;
}

export const useEbayStore = create<EbayState>()(
  devtools(
    (set) => ({
      account: null,
      isLoading: false,
      error: null,
      
      setAccount: (account) => set({ account, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearAccount: () => set({ account: null, error: null }),
    }),
    { name: 'ebay-store' }
  )
);