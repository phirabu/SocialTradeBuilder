import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ExternalLink, History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { TokenBadge } from "@/components/ui/token-badge";
import { useToast } from "@/hooks/use-toast";

interface PortfolioParams {
  id: string;
}

export default function Portfolio() {
  const params = useParams<PortfolioParams>();
  const botId = params?.id ? parseInt(params.id) : undefined;
  const [activeTab, setActiveTab] = useState("assets");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch bot data
  const { data, isLoading, refetch } = useQuery({
    queryKey: botId ? [`/api/bots/${botId}`] : [],
    enabled: !!botId,
    staleTime: 1000 * 5, // Consider data stale after 5 seconds to auto-refresh
    queryFn: async ({ queryKey }) => {
      // Use a custom query function to allow passing the refresh param
      const botId = queryKey[0].split('/').pop();
      const response = await fetch(`/api/bots/${botId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bot data');
      }
      const data = await response.json();
      console.log('[DEBUG] Portfolio: Bot data fetched successfully:', data);
      console.log('[DEBUG] Portfolio: Wallet balance:', data?.wallet?.balance);
      return data;
    }
  });
  
  const { bot, wallet, config } = data || {};
  
  // Fetch token balances
  const { data: tokenBalancesData, refetch: refetchTokenBalances } = useQuery({
    queryKey: wallet?.id ? [`/api/wallet/${wallet.id}/token-balances`] : [],
    queryFn: async () => {
      if (!wallet?.id) return { tokenBalances: [] };
      const response = await fetch(`/api/wallet/${wallet.id}/token-balances`);
      if (!response.ok) {
        throw new Error('Failed to fetch token balances');
      }
      const result = await response.json();
      console.log('[DEBUG] Token balances fetched:', result);
      return result;
    },
    enabled: !!wallet?.id,
    staleTime: 1000 * 5 // Consider data stale after 5 seconds
  });
  const tokens = config?.supportedTokens || [];
  
  // State for tracking refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch transaction history from Solana
  const { 
    data: txHistoryData, 
    isLoading: isLoadingTxHistory,
    refetch: refetchTxHistory 
  } = useQuery({
    queryKey: ['/api/wallet', wallet?.publicKey, 'transactions'],
    queryFn: async () => {
      if (!wallet?.publicKey) return { transactions: [] };
      const response = await fetch(`/api/wallet/${wallet.publicKey}/transactions?limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      return response.json();
    },
    enabled: !!wallet?.publicKey && !!data,
    staleTime: 1000 * 5, // Consider data stale after 5 seconds
  });
  
  // Function to handle refresh of all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First directly fetch the bot data with refresh=true to force balance update
      console.log(`[DEBUG] Directly fetching fresh bot data from /api/bots/${botId}?refresh=true`);
      const botResponse = await fetch(`/api/bots/${botId}?refresh=true`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (botResponse.ok) {
        const freshBotData = await botResponse.json();
        console.log('[DEBUG] Fresh bot data received:', freshBotData);
        console.log('[DEBUG] Fresh wallet balance:', freshBotData.wallet?.balance);
        
        // If wallet is available, also refresh transaction history
        if (freshBotData.wallet?.publicKey) {
          console.log('[DEBUG] Refreshing transaction history for wallet:', freshBotData.wallet.publicKey);
          const txResponse = await fetch(`/api/wallet/${freshBotData.wallet.publicKey}/transactions?refresh=true`);
          if (txResponse.ok) {
            console.log('[DEBUG] Refreshed blockchain transaction data successfully');
          }
        }
        
        // Refresh token balances if wallet is available
        if (freshBotData.wallet?.id) {
          console.log('[DEBUG] Refreshing token balances for wallet ID:', freshBotData.wallet.id);
          const tokenBalancesResponse = await fetch(`/api/wallet/${freshBotData.wallet.id}/token-balances?refresh=true`);
          if (tokenBalancesResponse.ok) {
            console.log('[DEBUG] Refreshed token balances successfully');
          }
        }
        
        // Force invalidate query caches to ensure data is refreshed
        queryClient.invalidateQueries({
          queryKey: [`/api/bots/${botId}`]
        });
        
        queryClient.invalidateQueries({
          queryKey: ['/api/bots']
        });
        
        if (freshBotData.wallet?.id) {
          queryClient.invalidateQueries({
            queryKey: [`/api/wallet/${freshBotData.wallet.id}/token-balances`]
          });
        }
        
        // Then refetch all the data to update the UI
        await Promise.all([
          refetch(),
          refetchTxHistory(),
          refetchTokenBalances()
        ]);
        
        toast({
          title: "Data refreshed",
          description: `Latest balance: ${parseFloat(freshBotData.wallet?.balance || "0").toFixed(6)} SOL`
        });
      } else {
        throw new Error('Failed to fetch fresh bot data');
      }
    } catch (error) {
      console.error('[DEBUG] Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh blockchain data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  if (!botId) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Invalid Bot</h3>
          <p>No bot ID was provided.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-[#9945FF]" />
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Error Loading Bot</h3>
          <p>Could not load bot details. Please try again later.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Portfolio: {bot?.name}</h1>
            <p className="text-text-secondary">View your assets and transaction history</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${
              bot?.active 
                ? "bg-green-500/10 text-green-400" 
                : "bg-red-500/10 text-red-400"
            }`}>
              {bot?.active ? "Active" : "Paused"}
            </span>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9"
              title="Refresh data from blockchain"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assets" className="space-y-6">
          {/* Overall Portfolio Value */}
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-4">
              <CardTitle>Portfolio Value</CardTitle>
              <CardDescription>Total value of your assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
                {parseFloat(wallet?.balance || "0").toFixed(6)} SOL
              </div>
              
              <div className="text-sm text-text-secondary mb-4">
                ≈ ${(parseFloat(wallet?.balance || "0") * 180.5).toFixed(2)} USD
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Asset Allocation</span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#9945FF] rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-text-secondary">
                    <span>SOL 100%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Assets List */}
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-4">
              <CardTitle>Your Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SOL Token */}
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center">
                  <TokenBadge 
                    symbol="SOL"
                    name="Solana"
                    color="#14F195" 
                    size="md"
                  />
                  <div className="ml-3">
                    <div className="font-medium">Solana</div>
                    <div className="text-sm text-text-secondary">SOL</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{parseFloat(wallet?.balance || "0").toFixed(6)}</div>
                  <div className="text-sm text-text-secondary">
                    ${(parseFloat(wallet?.balance || "0") * 180.5).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {/* Other tokens with their balances */}
              {tokens?.filter((t: any) => t.symbol !== 'SOL').map((token: any) => {
                // Find token balance if it exists
                const tokenBalance = tokenBalancesData?.tokenBalances?.find(
                  (tb: any) => tb.token.toLowerCase() === token.symbol.toLowerCase()
                );
                const balance = tokenBalance ? parseFloat(tokenBalance.balance) : 0;
                const hasBalance = balance > 0;
                
                return (
                  <div 
                    key={token.symbol} 
                    className={`flex items-center justify-between p-3 bg-gray-800/50 rounded-lg ${hasBalance ? '' : 'opacity-50'}`}
                  >
                    <div className="flex items-center">
                      <TokenBadge 
                        symbol={token.symbol}
                        name={token.name}
                        color={token.color}
                        size="md"
                      />
                      <div className="ml-3">
                        <div className="font-medium">{token.name}</div>
                        <div className="text-sm text-text-secondary">{token.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{balance.toFixed(6)}</div>
                      <div className="text-sm text-text-secondary">
                        ${(balance * (token.symbol === 'USDC' ? 1 : 0.15)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-2">
                <Link href={`/trade/${botId}`}>
                  <Button className="w-full bg-[#9945FF] hover:bg-[#9945FF]/90">
                    Trade Tokens
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          {/* Transaction History */}
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>Recent trades and transactions</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh transactions from blockchain"
                  className="h-8 px-2"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTxHistory ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-[#9945FF]" />
                </div>
              ) : txHistoryData?.transactions?.length > 0 ? (
                <div className="space-y-4">
                  {txHistoryData.transactions.map((tx: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            tx.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {tx.type === 'buy' ? (
                              <ArrowDownLeft className={`h-4 w-4 text-green-500`} />
                            ) : (
                              <ArrowUpRight className={`h-4 w-4 text-red-500`} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {tx.type === 'buy' ? 'Receive' : 'Send'} {tx.toToken}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {formatDate(tx.timestamp)}
                            </div>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          tx.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-text-secondary mb-1">From</div>
                          <div className="flex items-center">
                            <TokenBadge 
                              symbol={tx.fromToken}
                              size="sm"
                            />
                            <span className="ml-2 font-medium">{tx.fromAmount} {tx.fromToken}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-secondary mb-1">To</div>
                          <div className="flex items-center">
                            <TokenBadge 
                              symbol={tx.toToken}
                              size="sm"
                            />
                            <span className="ml-2 font-medium">{tx.toAmount} {tx.toToken}</span>
                          </div>
                        </div>
                      </div>
                      
                      {tx.signature && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-secondary truncate max-w-[180px] md:max-w-xs">
                            {tx.signature.substring(0, 8)}...{tx.signature.substring(tx.signature.length - 8)}
                          </span>
                          <a 
                            href={tx.explorerUrl || `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#9945FF] hover:underline flex items-center"
                          >
                            Explorer <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-800/50 inline-flex p-4 rounded-full mb-4">
                    <History className="h-6 w-6 text-text-secondary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Your transaction history will appear here once you start trading tokens.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Trading Stats */}
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-4">
              <CardTitle>Trading Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-sm text-text-secondary mb-1">Total Trades</div>
                  <div className="text-2xl font-bold">{txHistoryData?.transactions?.length || 0}</div>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-sm text-text-secondary mb-1">Success Rate</div>
                  <div className="text-2xl font-bold">
                    {txHistoryData?.transactions?.length
                      ? Math.round((txHistoryData.transactions.filter((tx: any) => tx.status === 'completed').length / txHistoryData.transactions.length) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-text-secondary mb-1">Most Used Pair</div>
                <div className="flex items-center">
                  <TokenBadge 
                    symbol="SOL" 
                    size="sm"
                  />
                  <span className="mx-2">→</span>
                  <TokenBadge 
                    symbol="USDC" 
                    size="sm"
                  />
                  <span className="ml-2">SOL/USDC</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}