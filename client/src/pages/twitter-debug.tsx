
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Bot = {
  id: number;
  twitterUsername: string;
};

export default function TwitterDebugPage() {
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [bots, setBots] = useState<Bot[]>([]);
  const [latestTweet, setLatestTweet] = useState<any>(null);
  const [isLoadingTweet, setIsLoadingTweet] = useState(false);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null);

  // Fetch bots on component mount
  useEffect(() => {
    const fetchBots = async () => {
      try {
        const response = await fetch('/api/bots');
        const data = await response.json();
        setBots(data.bots);
      } catch (error) {
        console.error('Failed to fetch bots:', error);
      }
    };
    fetchBots();
  }, []);

  // Calculate time remaining until rate limit reset
  const getRateLimitTimeRemaining = (resetTimestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = resetTimestamp - now;
    
    if (remaining <= 0) return "Rate limit expired";
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}m ${seconds}s remaining`;
  };

  // Fetch the latest tweet for the selected bot
  const fetchLatestTweet = async () => {
    if (!selectedBotId) {
      toast({
        title: "No Bot Selected",
        description: "Please select a bot first.",
        variant: "destructive"
      });
      return;
    }

    const selectedBot = bots.find(bot => bot.id.toString() === selectedBotId);
    if (!selectedBot) return;

    setIsLoadingTweet(true);
    setLatestTweet(null);
    setError(null);
    setRateLimitReset(null);

    try {
      const url = `/api/twitter/latest-tweet?username=${encodeURIComponent(selectedBot.twitterUsername)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        let errorMsg = data.message || "Failed to fetch latest tweet";
        if (data.error === "rate_limited") {
          setRateLimitReset(data.rateLimitReset || null);
          if (data.rateLimitReset) {
            const resetTime = new Date(data.rateLimitReset * 1000).toLocaleString();
            const timeRemaining = getRateLimitTimeRemaining(data.rateLimitReset);
            errorMsg = `Rate limit reached (${timeRemaining})\nReset at: ${resetTime}`;
          } else {
            errorMsg = "Rate limit reached. Please try again later.";
          }
        }
        setError(errorMsg);
        return;
      }

      // Update tweet with bot ID
      if (data && !data.botId) {
        await fetch(`/api/tweets/${data.id}/update-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: parseInt(selectedBotId) })
        });
      }

      setLatestTweet(data);
      
      // Clear any existing rate limit error
      if (rateLimitReset) {
        setRateLimitReset(null);
        setError(null);
      }
    } catch (error: any) {
      setError(error.message || "Failed to fetch tweet");
    } finally {
      setIsLoadingTweet(false);
    }
  };

  // Execute a trade for the selected bot
  const executeTrade = async () => {
    if (!selectedBotId || !latestTweet) {
      toast({
        title: "Missing Requirements",
        description: "Please select a bot and fetch a tweet first.",
        variant: "destructive"
      });
      return;
    }

    setIsExecutingTrade(true);
    try {
      const response = await fetch('/api/process-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: parseInt(selectedBotId),
          tweetId: latestTweet.tweetId,
          tweetText: latestTweet.tweetText,
          twitterUsername: latestTweet.authorUsername
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.twitterReply || data.message || "Error processing trade");
      }

      const toastMessage = data.success
        ? `Successfully executed trade:\n${data.swap?.inAmount} ${data.trade?.inToken} → ${data.swap?.outAmount} ${data.trade?.outToken}`
        : `Trade failed: ${data.error || 'Unknown error'}`;

      toast({
        title: data.success ? "Trade Executed" : "Trade Failed",
        description: toastMessage,
        variant: data.success ? "default" : "destructive"
      });

      if (data.success) {
        // Show transaction details in UI
        setLatestTweet(prev => ({
          ...prev!,
          processingStatus: 'completed',
          transactionSignature: data.transaction?.signature,
          explorerUrl: data.transaction?.explorerUrl,
          twitterReply: data.twitterReply
        }));
      } else {
        setLatestTweet(prev => ({
          ...prev!,
          processingStatus: 'failed',
          error: data.error
        }));
      }
    } catch (error: any) {
      toast({
        title: "Trade Error",
        description: error.message || "Failed to execute trade",
        variant: "destructive"
      });
      
      setLatestTweet(prev => ({
        ...prev!,
        processingStatus: 'failed',
        error: error.message
      }));
    } finally {
      setIsExecutingTrade(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Twitter Bot Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Select value={selectedBotId} onValueChange={setSelectedBotId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bot" />
              </SelectTrigger>
              <SelectContent>
                {bots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id.toString()}>
                    @{bot.twitterUsername} (ID: {bot.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBotId && (
              <div className="text-sm text-muted-foreground mt-1">
                Selected Bot ID: {selectedBotId}
              </div>
            )}

            <Button onClick={fetchLatestTweet} disabled={isLoadingTweet || !selectedBotId}>
              {isLoadingTweet ? "Fetching..." : "Fetch Tweets"}
            </Button>
          </div>

          {error && (
            <div className="bg-red-900/80 text-red-200 rounded-md p-4 text-center flex flex-col items-center">
              <div className="font-semibold">Error</div>
              <div className="text-sm mt-1">{error}</div>
              {rateLimitReset && (
                <div className="text-xs mt-2">
                  Reset at: {new Date(rateLimitReset * 1000).toLocaleString()}
                </div>
              )}
              <Button variant="outline" className="mt-3" onClick={fetchLatestTweet} disabled={isLoadingTweet}>
                Retry
              </Button>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-md min-h-[80px] flex flex-col justify-center">
            {isLoadingTweet ? (
              <div className="text-center text-sm text-muted-foreground">Loading latest tweet...</div>
            ) : latestTweet ? (
              <>
                <div className="text-sm">{latestTweet.tweetText || "No tweet text found."}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {latestTweet.createdAt
                    ? new Date(latestTweet.createdAt).toLocaleString()
                    : "Date unknown"}
                </div>
                {latestTweet.processingStatus && (
                  <div className={`text-xs mt-2 rounded px-2 py-1 inline-block ${
                    latestTweet.processingStatus === "completed"
                      ? "bg-green-500/10 text-green-600"
                      : latestTweet.processingStatus === "pending"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-red-500/10 text-red-600"
                  }`}>
                    Status: {latestTweet.processingStatus}
                  </div>
                )}
              </>
            ) : !error ? (
              <div className="text-center">
                <div className="text-base font-medium mb-1">No tweet loaded</div>
                <div className="text-xs text-muted-foreground">Please select a bot and fetch the latest tweet.</div>
              </div>
            ) : null}
          </div>

          <Button
            onClick={executeTrade}
            disabled={isExecutingTrade || !selectedBotId || !latestTweet}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            {isExecutingTrade ? "Executing..." : "Execute Trade"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
