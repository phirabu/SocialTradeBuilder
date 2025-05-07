import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

interface TwitterCommandsGuideProps {
  botName?: string;
}

const TwitterCommandsGuide: React.FC<TwitterCommandsGuideProps> = ({
  botName = "TradeBot",
}) => {
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <InfoIcon className="mr-2 h-5 w-5 text-blue-500" />
          Twitter Command Syntax
        </CardTitle>
        <CardDescription>
          Learn how to interact with your bot through Twitter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-primary">Basic Command Format</h3>
          <p className="text-sm text-muted-foreground">
            To interact with your @{botName} on Twitter, mention it followed by a swap command:
          </p>
          <div className="bg-muted p-3 rounded-md font-mono text-sm">
            @{botName} swap [AMOUNT] [TOKEN] for [TOKEN]
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-primary">Supported Actions</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li><span className="font-medium">swap</span> - Exchanges one token for another</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Alert variant="default" className="border-green-200 bg-green-50">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Valid Examples</AlertTitle>
            <AlertDescription className="text-green-700 mt-2">
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>@{botName} swap 0.01 SOL for USDC</li>
                <li>@{botName} swap 0.5 SOL for JUP</li>
                <li>@{botName} swap 5 USDC for SOL</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <XCircleIcon className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Invalid Examples</AlertTitle>
            <AlertDescription className="text-red-700 mt-2">
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>@{botName} swap SOL for USDC (missing amount)</li>
                <li>@{botName} swap all USDC for SOL (use specific amount)</li>
                <li>@{botName} buy 10 SOL (invalid action, use swap)</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className="text-sm text-muted-foreground border-t pt-4 mt-2">
          <p>
            <strong>Note:</strong> The bot will respond to your Tweet with confirmation of the transaction
            or details about any errors that occurred.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwitterCommandsGuide;