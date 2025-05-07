import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TwitterIcon } from "lucide-react";

export function TwitterIntegrationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TwitterIcon className="h-5 w-5" />
          Twitter Integration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-4">
          Connect your Twitter account to enable automated trading through tweets.
        </p>
        <Button variant="outline" className="w-full">
          <TwitterIcon className="h-4 w-4 mr-2" />
          Connect Twitter
        </Button>
      </CardContent>
    </Card>
  );
}

export function TwitterInteractionsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TwitterIcon className="h-5 w-5" />
          Recent Interactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">
          No recent Twitter interactions found.
        </p>
      </CardContent>
    </Card>
  );
} 