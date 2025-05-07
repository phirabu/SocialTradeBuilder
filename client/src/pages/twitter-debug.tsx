import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function TwitterDebugPage() {
  const { toast } = useToast();
  const [botUsername, setBotUsername] = useState("");
  const [latestTweet, setLatestTweet] = useState<any>(null);
  const [isLoadingTweet, setIsLoadingTweet] = useState(false);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);

  // Fetch the latest tweet for the entered bot username
  const fetchLatestTweet = async () => {
    if (!botUsername) {
      toast({
        title: "Missing Bot Username",
        description: "Please enter the bot's Twitter username.",
        variant: "destructive"
      });
      return;
    }
    setIsLoadingTweet(true);
    setLatestTweet(null);
    try {
      const url = `/api/twitter/latest-tweet?username=${encodeURIComponent(botUsername)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        let errorMsg = errorData.message || "Failed to fetch latest tweet";
        if (errorData.status === 429) {
          // Rate limit specific message
          const resetTime = errorData.rateLimitReset
            ? new Date(errorData.rateLimitReset * 1000).toLocaleString()
            : "unknown";
          errorMsg += ` (Rate limit reached. Try again after ${resetTime})`;
        }
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }
      const data = await response.json();
      setLatestTweet(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tweet",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTweet(false);
    }
  };

  // Execute a trade with the bot
  const executeTrade = async () => {
    if (!botUsername) {
      toast({
        title: "Missing Bot Username",
        description: "Please enter the bot's Twitter username.",
        variant: "destructive"
      });
      return;
    }
    setIsExecutingTrade(true);
    try {
      // Example: send a swap command to the bot (simulate a trade)
      const tweetText = `@${botUsername} swap 0.01 SOL for JUP`;
      const response = await fetch('/api/process-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: null, // backend should resolve by username
          tweetId: "debug_" + Date.now(),
          tweetText,
          twitterUsername: "debug_user"
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.twitterReply || data.message || "Error processing trade");
      }
      toast({
        title: data.success ? "Trade Executed" : "Trade Failed",
        description: data.twitterReply || "Trade processed.",
        variant: data.success ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({
        title: "Trade Error",
        description: error.message || "Failed to execute trade",
        variant: "destructive"
      });
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
            <Input
              id="bot-username"
              value={botUsername}
              onChange={e => setBotUsername(e.target.value)}
              placeholder="Enter bot Twitter username (e.g. tradebot)"
              prefix="@"
              autoFocus
            />
            <Button onClick={fetchLatestTweet} disabled={isLoadingTweet}>
              {isLoadingTweet ? "Fetching..." : "Fetch Tweets"}
            </Button>
          </div>

          {/* Always show tweet/instruction window */}
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
            ) : (
              <div className="text-center">
                <div className="text-base font-medium mb-1">No tweet loaded</div>
                <div className="text-xs text-muted-foreground">Please click the button to fetch latest data.</div>
              </div>
            )}
          </div>

          <Button
            onClick={executeTrade}
            disabled={isExecutingTrade || !botUsername}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            {isExecutingTrade ? "Executing..." : "Execute Trade"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}