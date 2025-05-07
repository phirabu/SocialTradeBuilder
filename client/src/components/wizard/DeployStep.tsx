import { useState } from "react";
import { useWizardStore } from "@/hooks/use-wizard-store";
import { useBotStore } from "@/hooks/use-bot-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface DeployStatus {
  bot: 'idle' | 'loading' | 'success' | 'error';
  config: 'idle' | 'loading' | 'success' | 'error';
  wallet: 'idle' | 'loading' | 'success' | 'error';
  faucet: 'idle' | 'loading' | 'success' | 'error';
  webhook: 'idle' | 'loading' | 'success' | 'error';
}

export default function DeployStep() {
  const { 
    botDetails, 
    walletDetails, 
    commandConfig,
    resetWizard 
  } = useWizardStore();
  
  const { addBot } = useBotStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [deployStatus, setDeployStatus] = useState<DeployStatus>({
    bot: 'idle',
    config: 'idle',
    wallet: 'idle',
    faucet: 'idle',
    webhook: 'idle'
  });
  
  const [deployedBot, setDeployedBot] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { setCurrentStep } = useWizardStore();
  
  const deployBot = async () => {
    if (!botDetails || !commandConfig) {
      toast({
        title: "Missing configuration",
        description: "Please complete all previous steps before deploying",
        variant: "destructive"
      });
      return;
    }
    
    setIsDeploying(true);
    
    try {
      // Reset any previous error
      setErrorMessage('');
      
      // Update deployment status
      setDeployStatus(prev => ({ ...prev, bot: 'loading' }));
      
      // Combine all data for the deployment
      const deployData = {
        name: botDetails.name,
        twitterUsername: botDetails.twitterUsername,
        description: botDetails.description,
        privateKey: walletDetails?.privateKey, // Optional
        supportedActions: commandConfig.supportedActions,
        supportedTokens: commandConfig.supportedTokens,
        transactionFee: commandConfig.transactionFee
      };
      
      // API call to create the bot
      const response = await apiRequest('POST', '/api/bots', deployData);
      
      // Check if response was not successful
      if (!response.ok) {
        const errorData = await response.json();
        
        // Extract detailed error message if available
        let detailedError = '';
        
        if (errorData.message) {
          detailedError = errorData.message;
        } else if (errorData.errors) {
          if (errorData.errors.twitterUsername && errorData.errors.twitterUsername._errors) {
            detailedError = `Twitter username: ${errorData.errors.twitterUsername._errors.join(', ')}`;
          }
        }
        
        if (errorData.details) {
          detailedError += ` (${errorData.details})`;
        }
        
        throw new Error(detailedError || `Error ${response.status}: Failed to create bot`);
      }
      
      const data = await response.json();
      
      // Update deployment status steps
      setDeployStatus(prev => ({ ...prev, bot: 'success' }));
      setTimeout(() => setDeployStatus(prev => ({ ...prev, config: 'success' })), 500);
      setTimeout(() => setDeployStatus(prev => ({ ...prev, wallet: 'success' })), 1000);
      setTimeout(() => setDeployStatus(prev => ({ ...prev, webhook: 'success' })), 1500);
      
      // Set the airdrop request to loading
      setTimeout(() => setDeployStatus(prev => ({ ...prev, faucet: 'loading' })), 1500);
      
      // Store the deployed bot data
      setDeployedBot(data);
      
      // Add the bot to the store
      addBot({
        id: data.bot.id,
        name: data.bot.name,
        twitterUsername: data.bot.twitterUsername,
        publicKey: data.wallet.publicKey,
        webhookUrl: data.webhook.webhookUrl,
        createdAt: new Date(),
        active: true
      });
      
      // Actually check if the wallet received funds by polling
      let checkAttempts = 0;
      const maxAttempts = 10;
      
      const checkWalletFunding = async () => {
        try {
          // Get the latest wallet details
          const walletResponse = await fetch(`/api/bots/${data.bot.id}?refresh=true`);
          if (!walletResponse.ok) {
            throw new Error('Failed to fetch updated wallet details');
          }
          
          const walletData = await walletResponse.json();
          const currentBalance = Number(walletData.wallet.balance);
          
          console.log(`Checking wallet balance: ${currentBalance} SOL`);
          
          // If the wallet has funds, mark as success
          if (currentBalance > 0) {
            setDeployStatus(prev => ({ ...prev, faucet: 'success' }));
            toast({
              title: "Bot deployed successfully!",
              description: "Your trading bot is now active and listening for tweets with a balance of " + currentBalance + " SOL",
            });
            return; // Exit the polling loop
          }
          
          // If we've tried too many times, mark as error but don't fail deployment
          if (++checkAttempts >= maxAttempts) {
            setDeployStatus(prev => ({ ...prev, faucet: 'error' }));
            toast({
              title: "Airdrop request failed",
              description: "The wallet could not be funded automatically. You may need to fund it manually.",
              variant: "destructive"
            });
            return; // Exit the polling loop
          }
          
          // Try again after a delay
          setTimeout(checkWalletFunding, 3000);
        } catch (error) {
          console.error('Error checking wallet balance:', error);
          setDeployStatus(prev => ({ ...prev, faucet: 'error' }));
        }
      };
      
      // Start the first check after a short delay
      setTimeout(checkWalletFunding, 3000);
    } catch (error: any) {
      console.error("Deployment error:", error);
      
      // Set detailed error message
      let userErrorMessage = '';
      
      // Check for specific error patterns in the message
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('twitter_username')) {
        userErrorMessage = 'This Twitter username is already in use. Please choose a different one.';
      } else if (errorMessage) {
        userErrorMessage = errorMessage;
      } else {
        userErrorMessage = "An error occurred while deploying your bot";
      }
      
      setErrorMessage(userErrorMessage);
      
      // Mark all remaining steps as error
      setDeployStatus({
        bot: deployStatus.bot === 'success' ? 'success' : 'error',
        config: deployStatus.config === 'success' ? 'success' : 'error',
        wallet: deployStatus.wallet === 'success' ? 'success' : 'error',
        faucet: deployStatus.faucet === 'success' ? 'success' : 'error',
        webhook: deployStatus.webhook === 'success' ? 'success' : 'error',
      });
      
      toast({
        title: "Deployment failed",
        description: userErrorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };
  
  const goToDashboard = () => {
    resetWizard();
    navigate('/dashboard');
  };
  
  const createNewBot = () => {
    // Reset the wizard and go back to step 1
    resetWizard();
    setCurrentStep(0);
  };
  
  const goBackToConfiguration = () => {
    // Go back to bot setup if we encountered an error
    setCurrentStep(0);
  };
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Deployment Summary</h3>
          
          <div className="space-y-4">
            {/* Bot Details */}
            <div className="p-4 bg-gray-800 rounded-lg border border-border-color">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <i className="fas fa-robot text-[#9945FF] mr-2"></i>
                Bot Configuration
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Name:</span>
                  <span className="text-sm">{botDetails?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Twitter:</span>
                  <span className="text-sm">@{botDetails?.twitterUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Actions:</span>
                  <span className="text-sm">
                    {commandConfig?.supportedActions.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Tokens:</span>
                  <span className="text-sm">
                    {commandConfig?.supportedTokens.map(t => t.symbol).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Fee:</span>
                  <span className="text-sm">{commandConfig?.transactionFee} SOL</span>
                </div>
              </div>
            </div>
            
            {/* Wallet Details */}
            <div className="p-4 bg-gray-800 rounded-lg border border-border-color">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <i className="fas fa-wallet text-[#14F195] mr-2"></i>
                Wallet Configuration
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Type:</span>
                  <span className="text-sm">
                    {walletDetails?.type === 'new' ? 'New Wallet' : 'Imported Wallet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Initial Funding:</span>
                  <span className="text-sm">1 SOL (Devnet)</span>
                </div>
              </div>
            </div>
          </div>
          
          {!isDeploying && !deployedBot && (
            <Button 
              onClick={deployBot}
              className="mt-6 w-full bg-[#9945FF] hover:bg-[#9945FF]/90"
            >
              <i className="fas fa-rocket mr-2"></i>
              Deploy Trading Bot
            </Button>
          )}
          
          {deployedBot && (
            <div className="mt-6 space-y-3">
              <Button 
                onClick={goToDashboard}
                className="w-full bg-[#14F195] hover:bg-[#14F195]/90 text-black"
              >
                <i className="fas fa-table-columns mr-2"></i>
                Go to Dashboard
              </Button>
              
              <Button 
                onClick={createNewBot}
                className="w-full bg-[#9945FF] hover:bg-[#9945FF]/90"
              >
                <i className="fas fa-plus mr-2"></i>
                Create New Bot
              </Button>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Deployment Status</h3>
          
          <div className="space-y-4 bg-gray-800 p-4 rounded-lg border border-border-color">
            {/* Bot Creation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {deployStatus.bot === 'loading' && <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#9945FF]" />}
                {deployStatus.bot === 'success' && <CheckCircle2 className="h-5 w-5 mr-2 text-[#14F195]" />}
                {deployStatus.bot === 'error' && <XCircle className="h-5 w-5 mr-2 text-red-500" />}
                <span className="text-sm">Creating bot</span>
              </div>
              <span className="text-xs text-text-secondary">
                {deployStatus.bot === 'success' && deployedBot && `ID: ${deployedBot.bot.id}`}
              </span>
            </div>
            
            {/* Configuration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {deployStatus.config === 'loading' && <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#9945FF]" />}
                {deployStatus.config === 'success' && <CheckCircle2 className="h-5 w-5 mr-2 text-[#14F195]" />}
                {deployStatus.config === 'error' && <XCircle className="h-5 w-5 mr-2 text-red-500" />}
                <span className="text-sm">Configuring actions & tokens</span>
              </div>
            </div>
            
            {/* Wallet Creation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {deployStatus.wallet === 'loading' && <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#9945FF]" />}
                {deployStatus.wallet === 'success' && <CheckCircle2 className="h-5 w-5 mr-2 text-[#14F195]" />}
                {deployStatus.wallet === 'error' && <XCircle className="h-5 w-5 mr-2 text-red-500" />}
                <span className="text-sm">Creating wallet</span>
              </div>
              <span className="text-xs font-mono text-text-secondary truncate w-32">
                {deployStatus.wallet === 'success' && deployedBot && deployedBot.wallet.publicKey.substring(0, 8) + '...'}
              </span>
            </div>
            
            {/* Twitter Webhook */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {deployStatus.webhook === 'loading' && <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#9945FF]" />}
                {deployStatus.webhook === 'success' && <CheckCircle2 className="h-5 w-5 mr-2 text-[#14F195]" />}
                {deployStatus.webhook === 'error' && <XCircle className="h-5 w-5 mr-2 text-red-500" />}
                <span className="text-sm">Setting up Twitter webhook</span>
              </div>
            </div>
            
            {/* Airdrop from Faucet */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {deployStatus.faucet === 'loading' && <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#9945FF]" />}
                {deployStatus.faucet === 'success' && <CheckCircle2 className="h-5 w-5 mr-2 text-[#14F195]" />}
                {deployStatus.faucet === 'error' && <XCircle className="h-5 w-5 mr-2 text-red-500" />}
                <span className="text-sm">Requesting SOL from faucet</span>
              </div>
              <span className="text-xs text-text-secondary">
                {deployStatus.faucet === 'success' && '1 SOL'}
              </span>
            </div>
          </div>
          
          {/* Success message */}
          {deployedBot && (
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-[#14F195]/10 border border-[#14F195]/20 rounded-lg">
                <h4 className="text-sm font-medium text-[#14F195] mb-2">
                  <i className="fas fa-check-circle mr-2"></i>
                  Bot Deployed Successfully!
                </h4>
                <p className="text-sm text-text-secondary">
                  Your trading bot is now active and listening for tweets. Users can start sending commands to <span className="text-white">@{botDetails?.twitterUsername}</span>.
                </p>
              </div>
              
              <div className="p-4 bg-gray-800 rounded-lg border border-border-color">
                <h4 className="text-sm font-medium mb-2">Twitter Webhook</h4>
                <div className="bg-gray-900 p-2 rounded font-mono text-xs text-text-secondary">
                  {deployedBot?.webhook?.webhookUrl}
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  In a production environment, this webhook would be connected to the Twitter API.
                </p>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {errorMessage && !deployedBot && !isDeploying && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h4 className="text-sm font-medium text-red-400 mb-2">
                  <i className="fas fa-times-circle mr-2"></i>
                  Deployment Failed
                </h4>
                <p className="text-sm text-text-secondary">{errorMessage}</p>
              </div>
              
              <Button 
                onClick={goBackToConfiguration}
                variant="outline"
                className="w-full border-red-500/30 hover:bg-red-500/10 text-red-400"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Go Back and Edit Configuration
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
