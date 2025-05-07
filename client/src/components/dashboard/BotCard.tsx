import { useMemo } from "react";
import { Link } from "wouter";
import { TokenBadgeList } from "@/components/ui/token-badge";
import { useQuery } from "@tanstack/react-query";

interface BotCardProps {
  id: number;
  name: string;
  twitterUsername: string;
  createdAt: Date;
  active: boolean;
  wallet?: {
    publicKey: string;
    balance: string;
  };
  transactionCount?: number;
}

interface BotDetailResponse {
  bot: {
    id: number;
    name: string;
    twitterUsername: string;
    createdAt: string;
    active: boolean;
  };
  wallet?: {
    publicKey: string;
    balance: string;
    qrData?: string;
    explorerUrl?: string;
  };
  config?: {
    supportedActions: string[];
    supportedTokens: Array<{symbol: string; name: string; color?: string}>;
    transactionFee: string;
  };
  trades?: any[];
  webhook?: {
    webhookUrl: string;
  };
}

export default function BotCard({ id, name, twitterUsername, createdAt, active, wallet, transactionCount }: BotCardProps) {
  // Fetch additional bot details including wallet explorer URL and token config
  const { data, isLoading } = useQuery<BotDetailResponse>({
    queryKey: [`/api/bots/${id}`],
    retry: false,
    // Only fetch if we need extra info
    enabled: !wallet || !transactionCount
  });
  
  const formattedDate = useMemo(() => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return `${diffDays} days ago`;
    }
  }, [createdAt]);
  
  // Use pre-fetched data from the dashboard or fetch directly if not available
  const botTokens = useMemo(() => {
    if (!data?.config?.supportedTokens) {
      return [
        { symbol: "SOL", name: "SOL" },
        { symbol: "USDC", name: "USDC" },
        { symbol: "JUP", name: "JUP" }
      ];
    }
    return data.config.supportedTokens;
  }, [data]);
  
  const actualTransactionCount = useMemo(() => {
    if (transactionCount !== undefined) return transactionCount;
    if (!data?.trades) return 0;
    return data.trades.length;
  }, [data, transactionCount]);
  
  const walletBalance = useMemo(() => {
    // Prioritize fresh data from the API over passed props
    if (data?.wallet?.balance) return data.wallet.balance;
    if (wallet?.balance) return wallet.balance;
    return "0";
  }, [data, wallet]);
  
  const walletAddress = useMemo(() => {
    const publicKey = wallet?.publicKey || data?.wallet?.publicKey;
    if (!publicKey) return "";
    // Truncate wallet address for display (show first 4 and last 4 characters)
    return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
  }, [data, wallet]);
  
  const walletExplorerUrl = useMemo(() => {
    if (!data?.wallet?.explorerUrl) {
      const publicKey = wallet?.publicKey || data?.wallet?.publicKey;
      if (publicKey) {
        return `https://explorer.solana.com/address/${publicKey}?cluster=devnet`;
      }
      return "#";
    }
    return data.wallet.explorerUrl;
  }, [data, wallet]);
  
  return (
    <div className="bot-card bg-card-bg rounded-xl border border-border-color overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#9945FF]/20 flex items-center justify-center mr-3">
              <i className="fas fa-robot text-[#9945FF]"></i>
            </div>
            <div>
              <h3 className="font-medium text-white">{name}</h3>
              <span className="text-xs text-text-secondary">@{twitterUsername} • Created {formattedDate}</span>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            active 
              ? "bg-green-500/10 text-green-400" 
              : "bg-red-500/10 text-red-400"
          }`}>
            {active ? "Active" : "Paused"}
          </span>
        </div>
        
        {/* Wallet Address Section */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4 border border-border-color/50">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-text-secondary">Wallet Address</p>
            {walletAddress && (
              <a 
                href={walletExplorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-[#9945FF] hover:text-[#9945FF]/80"
              >
                Explorer <i className="fas fa-external-link-alt text-xs ml-1"></i>
              </a>
            )}
          </div>
          <div className="flex items-center">
            <p className="text-sm font-mono bg-gray-900/50 py-1 px-2 rounded flex-grow mr-2">
              {isLoading ? "Loading..." : walletAddress || "No wallet connected"}
            </p>
            {!isLoading && data?.wallet?.publicKey && (
              <button 
                onClick={() => {
                  if (data?.wallet?.publicKey) {
                    navigator.clipboard.writeText(data.wallet.publicKey);
                    // Could add toast notification here
                    alert("Wallet address copied to clipboard!");
                  }
                }}
                className="bg-gray-800 hover:bg-gray-700 p-1 rounded text-white"
                title="Copy wallet address"
              >
                <i className="fas fa-copy"></i>
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">Total Transactions</p>
            <p className="text-lg font-medium text-white">
              {isLoading ? "-" : actualTransactionCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">SOL Balance</p>
            <p className="text-lg font-medium text-white">
              {isLoading && !wallet ? "-" : `${parseFloat(walletBalance).toFixed(6)} SOL`}
            </p>
          </div>
        </div>
        
        <div className="text-xs text-text-secondary mb-2">Supported Tokens</div>
        <TokenBadgeList tokens={botTokens} size="sm" />
      </div>
      
      <div className="border-t border-border-color bg-gray-800/30 px-5 py-3 flex justify-between items-center">
        <Link href={`/trade/${id}`}>
          <div className="text-[#9945FF] hover:text-white text-sm cursor-pointer">
            <i className="fas fa-exchange-alt mr-1"></i> Trade
          </div>
        </Link>
        <div className="flex items-center">
          <Link href={`/portfolio/${id}`}>
            <div className="text-text-secondary hover:text-white text-sm mr-3 cursor-pointer">
              <i className="fas fa-wallet mr-1"></i> Portfolio
            </div>
          </Link>
          <button className={`${
            active ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"
          } text-sm`}>
            <i className={`fas fa-${active ? 'power-off' : 'play'} mr-1`}></i> 
            {active ? "Pause" : "Resume"}
          </button>
        </div>
      </div>
    </div>
  );
}
