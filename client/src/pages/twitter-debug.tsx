import React, { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { 
  ArrowLeft, 
  RefreshCw, 
  Send,
  Play,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { TwitterCommandsGuide, TwitterInteractionsTable } from "@/components/twitter";
import { formatTweetUrl, generateTweetIntent, generateTradeCommandIntent } from "@/lib/twitter-utils";

// Process Twitter command function that calls the real API endpoint
const processTwitterCommand = async (username: string, tweetText: string): Promise<any> => {
  try {
    // First get the bot ID for the mentioned bot in the tweet
    const botMatch = tweetText.match(/@(\w+)/);
    if (!botMatch || !botMatch[1]) {
      return {
        id: Date.now().toString(),
        tweetId: "error_" + Date.now(),
        tweetText,
        twitterUsername: username,
        commandType: "unknown",
        status: "failed",
        timestamp: new Date().toISOString(),
        responseText: "No bot mentioned in the tweet. Please use format: @botname command"
      };
    }
    
    // Get the bot Twitter username from the tweet
    const botTwitterUsername = botMatch[1];
    
    // Find all bots first
    const botsResponse = await fetch('/api/bots');
    if (!botsResponse.ok) {
      throw new Error('Failed to fetch bots');
    }
    
    const botsData = await botsResponse.json();
    
    // Find the bot with matching Twitter username (case insensitive)
    const bot = botsData.bots.find((b: any) => 
      b.twitterUsername.toLowerCase() === botTwitterUsername.toLowerCase()
    );
    
    if (!bot) {
      return {
        id: Date.now().toString(),
        tweetId: "error_" + Date.now(),
        tweetText,
        twitterUsername: username,
        commandType: "unknown",
        status: "failed",
        timestamp: new Date().toISOString(),
        responseText: `Bot @${botTwitterUsername} not found. Please check the bot name.`
      };
    }
    
    // Now call the process-command endpoint with the real bot ID
    const response = await fetch('/api/process-command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botId: bot.id,
        tweetId: "debug_" + Date.now(),
        tweetText,
        twitterUsername: username
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        id: Date.now().toString(),
        tweetId: "error_" + Date.now(),
        tweetText,
        twitterUsername: username,
        commandType: "unknown",
        status: "failed",
        timestamp: new Date().toISOString(),
        responseText: errorData.twitterReply || errorData.message || "Error processing command"
      };
    }
    
    const responseData = await response.json();
    
    // Map the API response to our expected format
    return {
      id: Date.now().toString(),
      tweetId: "debug_" + Date.now(),
      tweetText,
      twitterUsername: username,
      commandType: responseData.action || "unknown",
      status: responseData.success ? "completed" : "failed",
      timestamp: new Date().toISOString(),
      responseText: responseData.twitterReply || "Command processed",
      transactionSignature: responseData.transactionSignature
    };
  } catch (error: any) {
    console.error("Error processing command:", error);
    return {
      id: Date.now().toString(),
      tweetId: "error_" + Date.now(),
      tweetText,
      twitterUsername: username,
      commandType: "unknown",
      status: "failed",
      timestamp: new Date().toISOString(),
      responseText: error.message || "An unexpected error occurred"
    };
  }
};

export default function TwitterDebugPage() {
  const { toast } = useToast();
  const [botUsername, setBotUsername] = useState("phirabudigital");
  const [tweetText, setTweetText] = useState("");
  const [userUsername, setUserUsername] = useState("crypto_trader");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingTweet, setIsProcessingTweet] = useState(false);
  const [latestTweet, setLatestTweet] = useState<any>(null);
  const [isLoadingTweet, setIsLoadingTweet] = useState(false);
  const [botId, setBotId] = useState<number | null>(null);
  // Load interactions from localStorage on component mount
  const [interactions, setInteractions] = useState<any[]>(() => {
    // Try to get stored interactions from localStorage
    try {
      const storedInteractions = localStorage.getItem('twitter-debug-interactions');
      return storedInteractions ? JSON.parse(storedInteractions) : [];
    } catch (error) {
      console.error("Failed to load interactions from localStorage:", error);
      return [];
    }
  });
  
  // Save interactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('twitter-debug-interactions', JSON.stringify(interactions));
    } catch (error) {
      console.error("Failed to save interactions to localStorage:", error);
    }
  }, [interactions]);
  
  // Function to fetch latest tweet
  const fetchLatestTweet = async (forceRefresh = false) => {
    setIsLoadingTweet(true);
    try {
      // Add force=true parameter to bypass cache when specifically refreshing
      const url = `/api/twitter/latest-tweet?username=phirabudigital${forceRefresh ? '&force=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.rateLimited 
            ? "Twitter API rate limit exceeded. Please try again later." 
            : (errorData.message || 'Failed to fetch latest tweet')
        );
      }
      
      const data = await response.json();
      setLatestTweet(data);
      
      // Show special notice if we're getting a cached result due to rate limits
      if (data._notice) {
        toast({
          title: "Rate Limited",
          description: data._notice,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: data.processingStatus === "pending" 
            ? "Tweet fetched successfully and is pending processing" 
            : "Tweet fetched successfully",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Error fetching latest tweet:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tweet",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTweet(false);
    }
  };
  
  const handleSendTweet = async () => {
    if (!tweetText || !userUsername) {
      toast({
        title: "Missing Information",
        description: "Please provide both tweet text and Twitter username",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await processTwitterCommand(userUsername, tweetText);
      setInteractions([result, ...interactions]);
      
      toast({
        title: result.status === "completed" ? "Command Executed" : "Command Failed",
        description: result.responseText,
        variant: result.status === "completed" ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({
        title: "Processing Error",
        description: error.message || "An error occurred while processing the command",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to force real blockchain transactions instead of simulations
  const handleForceRealTransaction = async () => {
    if (!tweetText || !userUsername) {
      toast({
        title: "Missing Information",
        description: "Please provide both tweet text and Twitter username",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // First get the bot ID for the mentioned bot in the tweet
      const botMatch = tweetText.match(/@(\w+)/);
      if (!botMatch || !botMatch[1]) {
        toast({
          title: "Invalid Tweet",
          description: "No bot mentioned in the tweet. Please use format: @botname command",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // Get the bot Twitter username from the tweet
      const botTwitterUsername = botMatch[1];
      
      // Find all bots first
      const botsResponse = await fetch('/api/bots');
      if (!botsResponse.ok) {
        throw new Error('Failed to fetch bots');
      }
      
      const botsData = await botsResponse.json();
      
      // Find the bot with matching Twitter username (case insensitive)
      const bot = botsData.bots.find((b: any) => 
        b.twitterUsername.toLowerCase() === botTwitterUsername.toLowerCase()
      );
      
      if (!bot) {
        toast({
          title: "Bot Not Found",
          description: `Bot @${botTwitterUsername} not found. Please check the bot name.`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      toast({
        title: "Processing Transaction",
        description: "Attempting to execute a real blockchain transaction...",
      });
      
      // Call a special endpoint to force a real transaction
      const response = await fetch('/api/execute-swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: bot.id,
          tweetId: "debug_" + Date.now(),
          tweetText,
          twitterUsername: userUsername,
          forceReal: true // This flag tells the backend to skip simulation
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to execute transaction");
      }
      
      const responseData = await response.json();
      
      // Add to interactions
      const result = {
        id: Date.now().toString(),
        tweetId: "debug_" + Date.now(),
        tweetText,
        twitterUsername: userUsername,
        commandType: responseData.action || "swap",
        status: responseData.success ? "completed" : "failed",
        timestamp: new Date().toISOString(),
        responseText: responseData.message || "Transaction submitted to blockchain",
        transactionSignature: responseData.signature
      };
      
      setInteractions([result, ...interactions]);
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction successfully submitted! Signature: ${responseData.signature}`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Transaction Error",
        description: error.message || "An error occurred while executing the transaction",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to get bot ID by username
  const fetchBotId = async (username: string) => {
    try {
      const response = await fetch('/api/bots');
      if (!response.ok) {
        throw new Error('Failed to fetch bots');
      }
      
      const data = await response.json();
      const bot = data.bots.find((b: any) => 
        b.twitterUsername.toLowerCase() === username.toLowerCase()
      );
      
      if (bot) {
        setBotId(bot.id);
        return bot.id;
      } else {
        console.error(`Bot with username @${username} not found`);
        toast({
          title: "Bot Not Found",
          description: `Bot @${username} not found. Please check the bot name.`,
          variant: "destructive"
        });
        return null;
      }
    } catch (error: any) {
      console.error("Error fetching bot ID:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch bot ID",
        variant: "destructive"
      });
      return null;
    }
  };
  
  // Function to process the pending tweets
  const processPendingTweet = async () => {
    if (!latestTweet) {
      toast({
        title: "No Tweet",
        description: "No tweet available to process. Please fetch a tweet first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessingTweet(true);
    
    try {
      // Get the bot ID if we don't have it
      const currentBotId = botId || await fetchBotId(botUsername);
      
      if (!currentBotId) {
        setIsProcessingTweet(false);
        return;
      }
      
      // First check if we need to update the tweet with botId
      // This is to fix any tweets that might not have the botId set
      if (latestTweet && !latestTweet.botId && latestTweet.id) {
        console.log(`Updating tweet ID ${latestTweet.id} with botId ${currentBotId}`);
        try {
          const updateResponse = await fetch(`/api/tweets/${latestTweet.id}/update-bot`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              botId: currentBotId
            }),
          });
          
          if (updateResponse.ok) {
            console.log(`Successfully updated tweet with botId ${currentBotId}`);
          }
        } catch (err) {
          console.error("Error updating tweet botId:", err);
        }
      }
      
      // Call the process-pending-tweets endpoint
      const response = await fetch('/api/process-pending-tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: currentBotId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process tweet");
      }
      
      const responseData = await response.json();
      
      // Handle no pending tweets
      if (responseData.count === 0) {
        toast({
          title: "No Pending Tweets",
          description: "No pending tweets found for processing.",
          variant: "default"
        });
      } else {
        // Refresh the latest tweet to see the updated status
        await fetchLatestTweet(true);
        
        toast({
          title: "Processing Complete",
          description: `Processed ${responseData.count} tweet(s). Check the status above.`,
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error processing pending tweet:", error);
      toast({
        title: "Processing Error",
        description: error.message || "An error occurred while processing the tweet",
        variant: "destructive"
      });
    } finally {
      setIsProcessingTweet(false);
    }
  };
  
  // Effect to fetch bot ID on component mount
  useEffect(() => {
    if (botUsername) {
      fetchBotId(botUsername);
    }
  }, [botUsername]);

  const generateCommand = (type: string) => {
    // We now only support 'swap' commands
    if (type === "swap") {
      setTweetText(`@${botUsername} swap 0.01 SOL for JUP`);
    } else {
      setTweetText(`@${botUsername} `);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Twitter Integration Debug</h1>
        <p className="text-muted-foreground">
          Test Twitter integration and command processing
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-username">Bot Twitter Username</Label>
                <Input 
                  id="bot-username" 
                  value={botUsername} 
                  onChange={(e) => setBotUsername(e.target.value)}
                  placeholder="TradeBot"
                  prefix="@"
                />
              </div>

              {/* Latest Tweet Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Latest Tweet from @phirabudigital</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchLatestTweet(true)}
                      disabled={isLoadingTweet}
                    >
                      {isLoadingTweet ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-2">Refresh</span>
                    </Button>
                    
                    {latestTweet && (
                      <Button 
                        size="sm"
                        onClick={processPendingTweet}
                        disabled={isProcessingTweet || !latestTweet || latestTweet.processingStatus === "completed"}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessingTweet ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span className="ml-2">Process</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {isLoadingTweet ? (
                  <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading latest tweet...
                  </div>
                ) : latestTweet ? (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm">{latestTweet.tweetText}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {latestTweet.createdAt 
                          ? new Date(latestTweet.createdAt).toLocaleString() 
                          : "Date unknown"}
                      </p>
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
                    </CardContent>
                  </Card>
                ) : (
                  <div className="p-4 bg-muted/20 rounded-md text-center">
                    <p className="text-sm text-muted-foreground">No tweets found</p>
                    <p className="text-xs mt-2">Click the refresh button to fetch the latest tweet</p>
                  </div>
                )}
              </div>
              
              <Alert variant="default" className="bg-indigo-50/10 text-indigo-500 border border-indigo-500/10">
                <AlertTitle>Debug Mode Active</AlertTitle>
                <AlertDescription>
                  This page simulates Twitter integration for testing. Commands will be processed locally.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          <TwitterCommandsGuide botName={botUsername} />
        </div>
        
        <div className="lg:col-span-2">
          <Tabs defaultValue="send">
            <TabsList className="mb-6">
              <TabsTrigger value="send">Send Tweet</TabsTrigger>
              <TabsTrigger value="history">Tweet History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="send">
              <Card>
                <CardHeader>
                  <CardTitle>Send Test Tweet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="user-username">Your Twitter Username</Label>
                    <Input 
                      id="user-username" 
                      value={userUsername} 
                      onChange={(e) => setUserUsername(e.target.value)}
                      placeholder="your_username"
                      prefix="@"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tweet-text">Tweet Text</Label>
                    <Textarea 
                      id="tweet-text" 
                      value={tweetText} 
                      onChange={(e) => setTweetText(e.target.value)}
                      placeholder={`@${botUsername} swap 0.01 SOL for JUP`}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Quick Commands</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => generateCommand("swap")}
                      >
                        Swap Command
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end gap-3">
                    <Button 
                      onClick={handleForceRealTransaction} 
                      disabled={isProcessing}
                      variant="destructive"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Force Real Transaction
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={handleSendTweet} 
                      disabled={isProcessing}
                      className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Tweet
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Tweet History</CardTitle>
                </CardHeader>
                <CardContent>
                  <TwitterInteractionsTable 
                    interactions={interactions}
                    onViewTweet={(tweetId) => {
                      toast({
                        title: "Mock Tweet Link",
                        description: `This would open the tweet: ${tweetId}`,
                      });
                    }}
                    onViewUser={(username) => {
                      toast({
                        title: "Mock User Profile",
                        description: `This would open the profile for @${username}`,
                      });
                    }}
                  />
                  
                  {interactions.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No interactions yet. Send a test tweet to see results here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}