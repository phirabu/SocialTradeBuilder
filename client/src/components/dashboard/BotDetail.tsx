import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, Loader2, TwitterIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenBadge, TokenBadgeList } from "@/components/ui/token-badge";
import TradeLog from "./TradeLog";
import { createSolanaAddressUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TwitterIntegrationCard, TwitterInteractionsTable } from "@/components/twitter";

interface BotDetailProps {
  botId: number;
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

export default function BotDetail({ botId }: BotDetailProps) {
  const { data, isLoading, error } = useQuery<BotDetailResponse>({
    queryKey: [`/api/bots/${botId}`],
    retry: false,
  });
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  const requestAirdrop = async () => {
    if (!data?.wallet?.publicKey) {
      toast({
        title: "Error",
        description: "Wallet not found",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Airdrop Requested",
      description: "Requesting 1 SOL from Devnet faucet...",
    });
    
    try {
      // In a real app, we would call the API to request an airdrop
      // For this example, we'll just simulate a successful airdrop
      setTimeout(() => {
        toast({
          title: "Airdrop Successful",
          description: "1 SOL has been added to your wallet",
        });
      }, 2000);
    } catch (err: any) {
      toast({
        title: "Airdrop Failed",
        description: err.message || "Failed to request SOL from faucet",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-[#9945FF]" />
      </div>
    );
  }
  
  if (error || !data) {
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
  
  const { bot, wallet, config, trades } = data;
  
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
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-[#9945FF]/20 flex items-center justify-center mr-4">
              <i className="fas fa-robot text-[#9945FF] text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bot.name}</h1>
              <p className="text-text-secondary">@{bot.twitterUsername}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${
              bot.active 
                ? "bg-green-500/10 text-green-400" 
                : "bg-red-500/10 text-red-400"
            }`}>
              {bot.active ? "Active" : "Paused"}
            </span>
            
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
              <i className="fas fa-power-off mr-2"></i>
              {bot.active ? "Pause Bot" : "Activate Bot"}
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
          <TabsTrigger value="twitter" className="flex items-center gap-1">
            <TwitterIcon className="h-4 w-4" />
            Twitter
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Wallet Card */}
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <i className="fas fa-wallet text-[#14F195] mr-2"></i>
                  Wallet
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Public Key</p>
                    <div className="flex items-center mb-2">
                      <div className="font-mono text-sm truncate bg-gray-800/60 rounded px-2 py-1 flex-grow">
                        {wallet?.publicKey}
                      </div>
                      {wallet?.explorerUrl && (
                        <a 
                          href={wallet.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[#9945FF] hover:underline text-xs px-2 py-1 rounded bg-[#9945FF]/10"
                        >
                          <i className="fas fa-external-link-alt mr-1"></i> Explorer
                        </a>
                      )}
                    </div>
                    
                    {/* QR Code section for wallet */}
                    {wallet?.qrData && (
                      <div className="mt-2 mb-4 flex flex-col items-center bg-gray-800/30 rounded-md p-3 border border-gray-700/50">
                        <p className="text-xs text-text-secondary mb-2">Scan to fund wallet manually</p>
                        <div className="w-32 h-32 bg-white p-2 rounded mb-1">
                          {/* Use a QR code library or a QR code image here */}
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${wallet.publicKey}`} 
                            alt="Wallet QR Code" 
                            className="w-full h-full" 
                          />
                        </div>
                        <p className="text-[10px] text-center text-text-secondary mt-1">
                          This QR code contains your wallet address for funding
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-t border-gray-700/50 pt-4">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">SOL Balance</p>
                      <p className="text-2xl font-semibold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
                        {wallet ? `${parseFloat(wallet.balance).toFixed(4)} SOL` : "0 SOL"}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-4 lg:mt-0">
                      <Button 
                        onClick={requestAirdrop}
                        className="bg-[#14F195] hover:bg-[#14F195]/90 text-black"
                      >
                        <i className="fas fa-coins mr-2"></i>
                        Request SOL
                      </Button>
                      
                      <a 
                        href="https://faucet.solana.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700"
                      >
                        <i className="fas fa-external-link-alt mr-2"></i>
                        Solana Faucet
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Stats Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <i className="fas fa-chart-pie text-[#9945FF] mr-2"></i>
                  Stats
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Total Trades</p>
                    <p className="text-2xl font-semibold">{trades?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Transaction Fee</p>
                    <p className="text-md font-medium">{config?.transactionFee || "0.01"} SOL</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Created</p>
                    <p className="text-md font-medium">
                      {new Date(bot.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Configuration Card */}
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <i className="fas fa-sliders-h text-[#9945FF] mr-2"></i>
                  Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-text-secondary mb-2">Supported Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {config?.supportedActions.map((action) => (
                        <span 
                          key={action} 
                          className="px-3 py-1 rounded-md bg-[#9945FF]/10 text-[#9945FF] text-sm capitalize"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-text-secondary mb-2">Supported Tokens</p>
                    {config?.supportedTokens && (
                      <TokenBadgeList tokens={config.supportedTokens} size="md" />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-text-secondary mb-2">Command Format</p>
                    <p className="font-mono text-sm bg-gray-800 rounded-md p-3">
                      @{bot.twitterUsername} [action] [amount] [token] of [token]
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Example: @{bot.twitterUsername} buy 0.1 SOL of JUP
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Webhook Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <i className="fas fa-link text-[#9945FF] mr-2"></i>
                  Webhook
                </h3>
                <div>
                  <p className="text-sm text-text-secondary mb-2">Webhook URL</p>
                  <p className="font-mono text-xs bg-gray-800 rounded-md p-3 break-all">
                    {data.webhook?.webhookUrl || "No webhook configured"}
                  </p>
                  <p className="text-xs text-text-secondary mt-2">
                    For the devnet demo, this URL simulates Twitter API integration.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trades">
          <TradeLog botId={botId} />
        </TabsContent>
        
        <TabsContent value="twitter">
          <div className="space-y-8">
            <TwitterIntegrationCard
              botName={bot.name}
              twitterUsername={bot.twitterUsername}
              webhookUrl={data.webhook?.webhookUrl}
              isActive={bot.active}
              onToggleActive={(active) => {
                toast({
                  title: active ? "Bot Activated" : "Bot Paused",
                  description: active 
                    ? "Your bot is now listening for Twitter commands" 
                    : "Your bot will no longer respond to Twitter commands",
                });
                // In a real app, we would call the API to toggle bot status
              }}
              onRegenerateWebhook={() => {
                toast({
                  title: "Webhook Regenerated",
                  description: "A new webhook URL has been generated for your bot",
                });
                // In a real app, we would call the API to regenerate the webhook
              }}
              onTestConnection={() => {
                toast({
                  title: "Testing Twitter Connection",
                  description: "Checking if your bot can connect to Twitter...",
                });
                // In a real app, we would call the API to test the connection
                setTimeout(() => {
                  toast({
                    title: "Connection Successful",
                    description: "Your bot is successfully connected to Twitter",
                  });
                }, 1500);
              }}
            />
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Recent Twitter Interactions</h3>
              
              <TwitterInteractionsTable
                interactions={[
                  // These would come from the API in a real app
                  {
                    id: "1",
                    tweetId: "1234567890",
                    tweetText: "@" + bot.twitterUsername + " buy 0.1 SOL of USDC",
                    twitterUsername: "crypto_trader",
                    commandType: "buy",
                    status: "completed",
                    timestamp: new Date().toISOString(),
                    transactionSignature: "5UfiU89jnVkrJZiWy"
                  },
                  {
                    id: "2",
                    tweetId: "1234567891",
                    tweetText: "@" + bot.twitterUsername + " swap 5 USDC for JUP",
                    twitterUsername: "defi_investor",
                    commandType: "swap",
                    status: "pending",
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                  },
                  {
                    id: "3",
                    tweetId: "1234567892",
                    tweetText: "@" + bot.twitterUsername + " sell all SOL",
                    twitterUsername: "new_trader",
                    commandType: "sell",
                    status: "failed",
                    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                    responseText: "Invalid command format. Please specify an amount."
                  }
                ]}
                onViewTweet={(tweetId) => {
                  window.open(`https://twitter.com/i/web/status/${tweetId}`, '_blank');
                }}
                onViewUser={(username) => {
                  window.open(`https://twitter.com/${username}`, '_blank');
                }}
              />
              
              <div className="flex justify-center pt-4">
                <Button variant="outline" className="text-muted-foreground">
                  Load More
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
