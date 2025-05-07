import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { 
  ArrowDown, 
  ChevronLeft, 
  Loader2, 
  RefreshCw,
  ArrowLeftRight
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenBadge } from "@/components/ui/token-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface TradeToken {
  symbol: string;
  name: string;
  color?: string;
  balance?: string;
}

interface TradeParams {
  id: string;
}

interface BotData {
  bot?: {
    id: number;
    name: string;
    twitterUsername: string;
    active: boolean;
  };
  wallet?: {
    id: number;
    botId: number;
    publicKey: string;
    balance: string;
  };
  config?: {
    supportedTokens: TradeToken[];
    transactionFee: string;
  };
}

export default function Trade() {
  const params = useParams<TradeParams>();
  const botId = params?.id ? parseInt(params.id) : undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch bot and token data
  const { data, isLoading, refetch } = useQuery<BotData>({
    queryKey: botId ? [`/api/bots/${botId}`] : [],
    enabled: !!botId,
    staleTime: 1000 * 5, // Consider data stale after 5 seconds to auto-refresh
  });
  
  // Fetch token balances if we have a wallet
  const { data: tokenBalancesData, refetch: refetchTokenBalances } = useQuery({
    queryKey: data?.wallet?.id ? [`/api/wallet/${data.wallet.id}/token-balances`] : [],
    queryFn: async () => {
      if (!data?.wallet?.id) return { tokenBalances: [] };
      const response = await fetch(`/api/wallet/${data.wallet.id}/token-balances`);
      if (!response.ok) {
        throw new Error('Failed to fetch token balances');
      }
      const result = await response.json();
      console.log('[DEBUG] Token balances fetched:', result);
      return result;
    },
    enabled: !!data?.wallet?.id,
    staleTime: 1000 * 5 // Consider data stale after 5 seconds
  });
  
  // Function to handle refreshing blockchain data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // If we have a wallet, refresh its blockchain data first
      if (data?.wallet?.publicKey) {
        console.log('Refreshing blockchain data for wallet:', data.wallet.publicKey);
        const response = await fetch(`/api/wallet/${data.wallet.publicKey}/transactions?refresh=true`);
        if (response.ok) {
          console.log('Refreshed blockchain transaction data successfully');
          
          // Force invalidate the bot data query to get fresh wallet balance
          queryClient.invalidateQueries({
            queryKey: [`/api/bots/${botId}`]
          });
          
          // Also invalidate the global bot list which contains balances
          queryClient.invalidateQueries({
            queryKey: ['/api/bots']
          });
        }
        
        // Refresh token balances if wallet is available
        if (data.wallet?.id) {
          console.log('Refreshing token balances for wallet ID:', data.wallet.id);
          const tokenBalancesResponse = await fetch(`/api/wallet/${data.wallet.id}/token-balances?refresh=true`);
          if (tokenBalancesResponse.ok) {
            console.log('Refreshed token balances successfully');
            
            // Invalidate token balances query
            queryClient.invalidateQueries({
              queryKey: [`/api/wallet/${data.wallet.id}/token-balances`]
            });
          }
        }
      }
      
      // Then refetch the data
      await Promise.all([
        refetch(),
        refetchTokenBalances()
      ]);
      
      // Success notification
      toast({
        title: "Data refreshed",
        description: "Latest blockchain data loaded",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Could not get latest blockchain data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const [fromToken, setFromToken] = useState<TradeToken | null>(null);
  const [toToken, setToToken] = useState<TradeToken | null>(null);
  const [amount, setAmount] = useState("");
  const [estimatedReceive, setEstimatedReceive] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  
  // Initialize from/to tokens once data is loaded
  useEffect(() => {
    if (data?.config?.supportedTokens && data.config.supportedTokens.length >= 2) {
      const tokens = data.config.supportedTokens;
      setFromToken(tokens[0]);
      setToToken(tokens[1]);
    }
  }, [data]);
  
  // Fetch real price quote from Jupiter API
  useEffect(() => {
    // Skip the fetch if we don't have valid tokens and amount
    if (!fromToken || !toToken || !amount) {
      setEstimatedReceive("");
      return;
    }
    
    // Convert the amount to a number and validate
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setEstimatedReceive("");
      return;
    }
    
    // Use a debounce timer to avoid making too many requests
    const timer = setTimeout(() => {
      setIsPriceLoading(true);
      
      // Use Jupiter API via our backend
      const fetchQuote = async () => {
        try {
          if (!botId) return;
          
          // Would typically call directly to Jupiter API in a production app
          // For our demo, we'll use our backend as a proxy for simplicity
          const response = await fetch(`/api/quote?inputToken=${fromToken.symbol}&outputToken=${toToken.symbol}&amount=${amount}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch quote');
          }
          
          const data = await response.json();
          if (data.outAmount) {
            setEstimatedReceive(data.outAmount);
          } else {
            setEstimatedReceive("0");
          }
        } catch (error) {
          console.error('Error fetching quote:', error);
          // Only show toast for real errors, not while user is typing
          if (amountValue > 0.001) {
            toast({
              title: "Error",
              description: "Failed to get price quote. Please try again.",
              variant: "destructive"
            });
          }
          setEstimatedReceive("0");
        } finally {
          setIsPriceLoading(false);
        }
      };
      
      // Call the real API
      fetchQuote();
    }, 500); // 500ms debounce
    
    // Cleanup function to clear the timeout
    return () => clearTimeout(timer);
  }, [fromToken, toToken, amount, botId, toast]);
  
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };
  
  const handleSwap = async () => {
    if (!botId || !fromToken || !toToken || !amount) {
      toast({
        title: "Error",
        description: "Missing required information for swap",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Swap Initiated",
      description: `Swapping ${amount} ${fromToken.symbol} for approximately ${estimatedReceive} ${toToken.symbol}`,
    });
    
    try {
      // Prepare trade object
      const trade = {
        botId,
        action: "swap",
        inToken: fromToken.symbol,
        outToken: toToken.symbol,
        amount,
        slippageBps: slippage * 100 // Convert percent to basis points
      };
      
      // Execute swap via API
      const response = await fetch('/api/execute-swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trade)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Swap failed');
      }
      
      const responseData = await response.json();
      
      toast({
        title: "Swap Successful",
        description: `You received ${responseData.swap.outAmount} ${toToken.symbol}`,
      });
      
      // Refresh data from the blockchain
      handleRefresh();
    } catch (error: any) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Failed",
        description: error.message || "An error occurred during the swap",
        variant: "destructive"
      });
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
  
  const { bot, wallet, config } = data;
  const tokens = config?.supportedTokens || [];
  const tokenBalances = tokenBalancesData?.tokenBalances || [];
  
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
            <h1 className="text-2xl font-bold">Trade with {bot?.name}</h1>
            <p className="text-text-secondary">Swap tokens using your Twitter bot</p>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-4">
              <CardTitle>Swap Tokens</CardTitle>
              <CardDescription>
                Trade tokens directly from your wallet
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* From Token Section */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">From</label>
                  {wallet && (
                    <span className="text-sm text-text-secondary">
                      Balance: {parseFloat(wallet.balance || "0").toFixed(6)} SOL
                    </span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Select
                    value={fromToken?.symbol || ""}
                    onValueChange={(value) => {
                      const selected = tokens.find((t: TradeToken) => t.symbol === value);
                      if (selected) setFromToken(selected);
                    }}
                  >
                    <SelectTrigger className="w-[140px] bg-gray-800">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token: TradeToken) => (
                        <SelectItem 
                          key={token.symbol} 
                          value={token.symbol}
                          disabled={token.symbol === toToken?.symbol}
                        >
                          <div className="flex items-center">
                            <TokenBadge 
                              symbol={token.symbol}
                              name={token.name}
                              color={token.color}
                              size="sm"
                            />
                            <span className="ml-2">{token.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-gray-800"
                  />
                </div>
              </div>
              
              {/* Swap Direction Button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSwapTokens}
                  className="rounded-full bg-gray-800 hover:bg-gray-700 h-10 w-10"
                >
                  <ArrowDown className="h-5 w-5" />
                </Button>
              </div>
              
              {/* To Token Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <div className="flex gap-3">
                  <Select
                    value={toToken?.symbol || ""}
                    onValueChange={(value) => {
                      const selected = tokens.find((t: TradeToken) => t.symbol === value);
                      if (selected) setToToken(selected);
                    }}
                  >
                    <SelectTrigger className="w-[140px] bg-gray-800">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token: TradeToken) => (
                        <SelectItem 
                          key={token.symbol} 
                          value={token.symbol}
                          disabled={token.symbol === fromToken?.symbol}
                        >
                          <div className="flex items-center">
                            <TokenBadge 
                              symbol={token.symbol}
                              name={token.name}
                              color={token.color}
                              size="sm"
                            />
                            <span className="ml-2">{token.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={estimatedReceive}
                      disabled
                      className="bg-gray-800"
                    />
                    {isPriceLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Price Information */}
              {fromToken && toToken && estimatedReceive && (
                <div className="bg-gray-800/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Rate</span>
                    <span className="text-sm">
                      1 {fromToken.symbol} ≈ {(parseFloat(estimatedReceive) / parseFloat(amount)).toFixed(6)} {toToken.symbol}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Fee</span>
                    <span className="text-sm">
                      {config?.transactionFee || "0.01"} SOL
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Slippage Tolerance</span>
                    <span className="text-sm">{slippage}%</span>
                  </div>
                </div>
              )}
              
              {/* Slippage Setting */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Slippage Tolerance: {slippage}%</label>
                <Slider
                  value={[slippage]}
                  min={0.1}
                  max={5}
                  step={0.1}
                  onValueChange={(values) => setSlippage(values[0])}
                />
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>0.1%</span>
                  <span>5%</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleSwap}
                disabled={!fromToken || !toToken || !amount || !estimatedReceive || isPriceLoading}
                className="w-full bg-[#9945FF] hover:bg-[#9945FF]/90 text-white"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Swap Tokens
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="space-y-4">
          {/* Wallet Card */}
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Wallet</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh wallet balance"
                  className="h-8 px-2"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* SOL Token balance */}
                <div className="flex justify-between items-center">
                  <TokenBadge 
                    symbol="SOL"
                    name="Solana"
                    color="#14F195"
                    size="md"
                  />
                  <span className="font-medium">
                    {wallet ? parseFloat(wallet.balance || "0").toFixed(6) : "0"} SOL
                  </span>
                </div>
                
                {/* Other token balances */}
                {tokens?.filter((t: TradeToken) => t.symbol !== 'SOL').map((token: TradeToken) => {
                  // Find token balance if it exists
                  const tokenBalance = tokenBalances.find(
                    (tb: any) => tb.token.toLowerCase() === token.symbol.toLowerCase()
                  );
                  const balance = tokenBalance ? parseFloat(tokenBalance.balance) : 0;
                  const hasBalance = balance > 0;
                  
                  return (
                    <div 
                      key={token.symbol} 
                      className={`flex justify-between items-center ${hasBalance ? '' : 'opacity-50'}`}
                    >
                      <TokenBadge 
                        symbol={token.symbol}
                        name={token.name}
                        color={token.color}
                        size="md"
                      />
                      <span className="font-medium">
                        {balance.toFixed(6)} {token.symbol}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Trade Information */}
          <Card className="border-border-color bg-card-bg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">About Trading</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>
                Trades execute on Solana's Jupiter aggregator for the best prices across multiple DEXs.
              </p>
              <p>
                A small transaction fee of {config?.transactionFee || "0.01"} SOL is applied to cover network costs.
              </p>
              <p>
                You can also trade by tweeting:
              </p>
              <div className="bg-gray-800 p-3 rounded-lg text-xs font-mono">
                @{bot?.twitterUsername} buy 0.1 SOL of USDC
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}