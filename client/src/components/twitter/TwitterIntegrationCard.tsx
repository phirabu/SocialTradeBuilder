import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TwitterIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import TwitterCommandsGuide from "./TwitterCommandsGuide";

interface TwitterIntegrationCardProps {
  botName: string;
  twitterUsername: string;
  webhookUrl?: string;
  isActive?: boolean;
  onToggleActive?: (active: boolean) => void;
  onRegenerateWebhook?: () => void;
  onTestConnection?: () => void;
}

const TwitterIntegrationCard: React.FC<TwitterIntegrationCardProps> = ({
  botName,
  twitterUsername,
  webhookUrl,
  isActive = true,
  onToggleActive,
  onRegenerateWebhook,
  onTestConnection,
}) => {
  const profileUrl = `https://twitter.com/${twitterUsername}`;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <TwitterIcon className="h-5 w-5 text-[#1DA1F2]" />
              <CardTitle>Twitter Integration</CardTitle>
            </div>
            <Badge variant={isActive ? "default" : "outline"} className={`gap-1 ${isActive ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""}`}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            Manage your Twitter integration settings and webhook configuration
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter-username">Twitter Username</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="twitter-username" 
                  value={twitterUsername} 
                  readOnly
                  className="font-medium"
                  prefix="@"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(profileUrl, '_blank')}
                >
                  View Profile
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="webhook-url" 
                  value={webhookUrl || "No webhook configured"} 
                  readOnly
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRegenerateWebhook}
                >
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is where Twitter will send notifications when your bot is mentioned
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="active-toggle" className="font-medium">
                Twitter Monitoring
              </Label>
              <span className="text-xs text-muted-foreground">
                When enabled, your bot will listen for and respond to mentions on Twitter
              </span>
            </div>
            <Switch 
              id="active-toggle" 
              checked={isActive}
              onCheckedChange={onToggleActive}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onTestConnection}
          >
            Test Connection
          </Button>
          <Button 
            variant="default"
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=@${twitterUsername} buy 0.01 SOL of USDC`, '_blank')}
          >
            Post Test Tweet
          </Button>
        </CardFooter>
      </Card>
      
      <TwitterCommandsGuide botName={botName} />
    </div>
  );
};

export default TwitterIntegrationCard;