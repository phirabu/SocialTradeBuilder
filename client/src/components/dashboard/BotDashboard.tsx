import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BotCard from "./BotCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bot {
  id: number;
  name: string;
  twitterUsername: string;
  createdAt: string;
  active: boolean;
}

interface BotsResponse {
  bots: Bot[];
}

export default function BotDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Force a refresh when the dashboard mounts to ensure we have the latest data
  useEffect(() => {
    queryClient.invalidateQueries({queryKey: ['/api/bots']});
  }, [queryClient]);
  
  const { data: botData, isLoading, refetch, isRefetching } = useQuery<BotsResponse>({
    queryKey: ['/api/bots'],
    retry: 2,
    refetchOnWindowFocus: true,
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
  });

  // Function to handle refreshing all blockchain data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First get list of bots
      if (!botData?.bots || botData.bots.length === 0) {
        await refetch();
        setIsRefreshing(false);
        return;
      }
      
      console.log('[DEBUG] Dashboard: Refreshing all bots...');
      
      // Refresh blockchain data for each bot with a wallet
      const refreshPromises = botData.bots.map(async (bot) => {
        try {
          // First get the bot details with the refresh=true parameter to force balance update
          console.log(`[DEBUG] Dashboard: Getting fresh data for bot ${bot.id}`);
          const botResponse = await fetch(`/api/bots/${bot.id}?refresh=true`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (!botResponse.ok) {
            console.error(`[DEBUG] Dashboard: Failed to refresh bot ${bot.id}`);
            return;
          }
          
          const botDetails = await botResponse.json();
          console.log(`[DEBUG] Dashboard: Fresh data for bot ${bot.id}:`, botDetails);
          
          if (!botDetails.wallet?.publicKey) {
            console.log(`[DEBUG] Dashboard: Bot ${bot.id} has no wallet`);
            return;
          }
          
          // Also refresh transaction history
          const txResponse = await fetch(`/api/wallet/${botDetails.wallet.publicKey}/transactions?refresh=true`);
          if (txResponse.ok) {
            console.log(`[DEBUG] Dashboard: Refreshed transactions for bot ${bot.id}`);
          }
          
          return botDetails;
        } catch (err) {
          console.error(`[DEBUG] Dashboard: Error refreshing bot ${bot.id}:`, err);
          return null;
        }
      });
      
      const results = await Promise.all(refreshPromises);
      console.log('[DEBUG] Dashboard: All bots refreshed, clearing cache...');
      
      // Clear all bot caches from React Query
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      
      // Also invalidate each individual bot cache
      botData.bots.forEach(bot => {
        queryClient.invalidateQueries({ queryKey: [`/api/bots/${bot.id}`] });
      });
      
      // Finally, refetch the dashboard data
      await refetch();
      
      // Show the toast with balance info if available
      const updatedBots = results.filter(Boolean);
      if (updatedBots.length > 0) {
        toast({
          title: "Data refreshed",
          description: "Latest blockchain data loaded for all bots",
        });
      } else {
        toast({
          title: "Data refreshed",
          description: "No changes detected",
        });
      }
    } catch (error) {
      console.error('[DEBUG] Dashboard: Error refreshing blockchain data:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh blockchain data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#9945FF]" />
      </div>
    );
  }
  
  const bots: Bot[] = botData?.bots || [];
  
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Trading Bots</h1>
          <p className="text-text-secondary">Manage and monitor your tweet-to-trade bots</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isRefetching}
            title="Refresh blockchain data for all bots"
            className="text-sm"
          >
            {isRefreshing || isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Data
          </Button>
          <Link href="/wizard">
            <div>
              <Button className="bg-[#9945FF] hover:bg-[#9945FF]/90">
                <i className="fas fa-plus mr-2"></i> Create Bot
              </Button>
            </div>
          </Link>
        </div>
      </header>
      
      {bots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bots.map((bot: Bot) => (
            <BotCard
              key={bot.id}
              id={bot.id}
              name={bot.name}
              twitterUsername={bot.twitterUsername}
              createdAt={new Date(bot.createdAt)}
              active={bot.active}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card-bg/30 rounded-xl border border-border-color p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4 w-16 h-16 rounded-full bg-[#9945FF]/10 flex items-center justify-center mx-auto">
              <i className="fas fa-robot text-2xl text-[#9945FF]"></i>
            </div>
            <h3 className="text-xl font-medium mb-2">No Trading Bots Yet</h3>
            <p className="text-text-secondary mb-6">
              Create your first trading bot to start executing Solana transactions via Twitter.
            </p>
            <Link href="/wizard">
              <div>
                <Button className="bg-[#9945FF] hover:bg-[#9945FF]/90">
                  <i className="fas fa-plus mr-2"></i> Create Bot
                </Button>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
