import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TokenBadge, TokenBadgeList } from "@/components/ui/token-badge";
import { useWizardStore } from "@/hooks/use-wizard-store";
import { Button } from "@/components/ui/button";

// Default tokens
const defaultTokens = [
  { symbol: "SOL", name: "SOL", color: "#9945FF" },
  { symbol: "USDC", name: "USDC", color: "#2775CA" },
  { symbol: "JUP", name: "JUP", color: "#4F67E4" }
];

const formSchema = z.object({
  prefix: z.string().min(3, {
    message: "Prefix must be at least 3 characters."
  }),
  actions: z.array(z.string()).min(1, {
    message: "Select at least one action."
  }),
  transactionFee: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Fee must be a positive number."
  }),
  tokens: z.array(z.object({
    symbol: z.string(),
    name: z.string(),
    color: z.string().optional()
  })).min(1, {
    message: "Add at least one token."
  })
});

export default function CommandSetupStep() {
  const { updateCommandConfig, commandConfig, botDetails } = useWizardStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTokenSymbol, setNewTokenSymbol] = useState("");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: commandConfig?.prefix || (botDetails ? botDetails.twitterUsername : "TradeBot"),
      actions: ["swap"], // Always initialize with swap as the only action
      transactionFee: commandConfig?.transactionFee || "0.01",
      tokens: commandConfig?.supportedTokens || defaultTokens
    },
  });
  
  // This effect immediately updates the wizard store when form values change
  useEffect(() => {
    // Set up a debounce function to prevent too many updates
    let timeout: NodeJS.Timeout;
    
    const subscription = form.watch((value) => {
      // Clear any existing timeout
      if (timeout) clearTimeout(timeout);
      
      // Set a new timeout to update after a delay
      timeout = setTimeout(() => {
        if (form.formState.isValid && value.prefix) {
          // Make sure we have valid arrays and values before updating
          const actions = value.actions ? [...value.actions].filter(Boolean) as string[] : [];
          
          // Ensure tokens is a valid array of objects with required properties
          const tokens = value.tokens 
            ? [...value.tokens].filter(Boolean).map(token => ({
                symbol: token?.symbol || '',
                name: token?.name || '',
                color: token?.color
              }))
            : [];
          
          const transactionFee = value.transactionFee || "0.01";
          
          if (actions.length > 0 && tokens.length > 0) {
            updateCommandConfig({
              prefix: value.prefix,
              supportedActions: actions,
              supportedTokens: tokens,
              transactionFee: transactionFee
            });
          }
        }
      }, 300); // Debounce for 300ms
    });
    
    return () => {
      // Clean up by clearing any pending timeout and unsubscribing
      if (timeout) clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [updateCommandConfig]); // Removed form from dependencies
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    // Ensure properly typed values when submitting the form
    const actions = values.actions.filter(Boolean) as string[];
    const tokens = values.tokens.map(token => ({
      symbol: token.symbol || '',
      name: token.name || '',
      color: token.color
    }));
    
    updateCommandConfig({
      prefix: values.prefix,
      supportedActions: actions,
      supportedTokens: tokens,
      transactionFee: values.transactionFee
    });
    
    setIsSubmitting(false);
  }
  
  // Auto-submit on mount if we have existing data (for when returning to this step)
  useEffect(() => {
    // Only set values on initial mount to avoid infinite loop
    if (commandConfig && !form.getValues("prefix")) {
      form.setValue("prefix", commandConfig.prefix);
      form.setValue("actions", ["swap"]); // Always ensure only swap is set
      form.setValue("tokens", commandConfig.supportedTokens);
      form.setValue("transactionFee", commandConfig.transactionFee);
    }
    
    // Auto-submit the form on mount to update the store
    const timeout = setTimeout(() => {
      if (form.getValues("prefix")) {
        onSubmit(form.getValues());
      }
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [commandConfig]); // Removed form from dependencies
  
  const watchedPrefix = form.watch("prefix");
  const watchedActions = form.watch("actions");
  const watchedTokens = form.watch("tokens");
  
  // Add a new token
  const addToken = () => {
    if (!newTokenSymbol) return;
    
    const symbol = newTokenSymbol.toUpperCase();
    
    // Check if token already exists
    if (watchedTokens.some(t => t.symbol === symbol)) {
      return;
    }
    
    const newToken = {
      symbol,
      name: symbol,
      color: "#888888" // Default color
    };
    
    form.setValue("tokens", [...watchedTokens, newToken]);
    setNewTokenSymbol("");
  };
  
  // Remove a token
  const removeToken = (symbolToRemove: string) => {
    form.setValue(
      "tokens", 
      watchedTokens.filter(token => token.symbol !== symbolToRemove)
    );
  };
  
  // Example parsed command for preview
  const parsedCommand = {
    action: "swap",
    inToken: "SOL",
    outToken: "JUP",
    amount: 0.1
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Configuration */}
          <div>
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem className="mb-6">
                  <FormLabel className="text-text-secondary">Bot Command Prefix</FormLabel>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border-color bg-gray-800 text-text-secondary">@</span>
                    <Input 
                      className="rounded-l-none" 
                      {...field} 
                      readOnly={!!botDetails}
                      disabled={!!botDetails}
                    />
                  </div>
                  <FormDescription className="text-text-secondary text-xs">
                    {botDetails 
                      ? `Using your Twitter username @${botDetails.twitterUsername} from bot setup.` 
                      : "Users will start commands with this name."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="actions"
              render={() => (
                <FormItem className="mb-6">
                  <FormLabel className="text-text-secondary">Supported Actions</FormLabel>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="actions"
                      render={({ field }) => {
                        // Always ensure "swap" is included
                        if (!field.value?.includes("swap")) {
                          const updatedValue = [...(field.value || []), "swap"];
                          setTimeout(() => field.onChange(updatedValue), 0);
                        }
                        return (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={true}
                                disabled={true}
                              />
                            </FormControl>
                            <FormLabel className="text-white">Swap</FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  <FormDescription className="text-text-secondary text-xs mt-2">
                    Currently only the Swap action is supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokens"
              render={() => (
                <FormItem className="mb-6">
                  <FormLabel className="text-text-secondary">Supported Tokens</FormLabel>
                  
                  <div className="space-y-2">
                    {watchedTokens.map((token) => (
                      <div key={token.symbol} className="p-3 bg-gray-800 border border-border-color rounded-md">
                        <div className="flex items-center justify-between">
                          <TokenBadge symbol={token.symbol} color={token.color} />
                          <button 
                            type="button"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => removeToken(token.symbol)}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Token symbol"
                      value={newTokenSymbol}
                      onChange={(e) => setNewTokenSymbol(e.target.value)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addToken}
                      className="text-[#9945FF]"
                    >
                      <i className="fas fa-plus mr-2"></i> Add token
                    </Button>
                  </div>
                  
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="transactionFee"
              render={({ field }) => (
                <FormItem className="mb-6">
                  <FormLabel className="text-text-secondary">Transaction Fee</FormLabel>
                  <div className="flex items-center">
                    <Input 
                      type="number" 
                      step="0.001"
                      className="w-24" 
                      {...field} 
                    />
                    <span className="ml-2 text-text-secondary">SOL</span>
                  </div>
                  <FormDescription className="text-text-secondary text-xs">
                    Fee charged for each transaction (for gas + bot operation).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Hidden submit button that can be triggered programmatically */}
            <Button 
              type="submit" 
              className="hidden"
              disabled={isSubmitting}
            >
              Save
            </Button>
          </div>
          
          {/* Right Column: Preview */}
          <div>
            <h3 className="text-md font-medium mb-4 text-text-secondary">Command Preview</h3>
            
            {/* Twitter Card Preview */}
            <div className="mock-tweet p-4 mb-6">
              <div className="flex mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 mr-3"></div>
                <div>
                  <div className="flex items-center">
                    <span className="font-bold text-white">Crypto User</span>
                    <span className="ml-2 text-text-secondary">@crypto_user · 2m</span>
                  </div>
                  <p className="text-white mt-1">@{watchedPrefix} swap 0.1 SOL for JUP</p>
                </div>
              </div>
              <div className="ml-12 p-3 bg-gray-800 rounded-md border border-border-color">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-[#9945FF]/20 flex items-center justify-center mr-2">
                      <i className="fas fa-robot text-[#9945FF] text-xs"></i>
                    </div>
                    <span className="text-sm font-medium text-white">{watchedPrefix}</span>
                    <span className="ml-2 text-xs text-text-secondary">@{watchedPrefix.toLowerCase()} · 1m</span>
                  </div>
                </div>
                <p className="text-sm text-white">
                  ✅ Swap succeeded!<br/>
                  Traded 0.1 SOL for 1.25 JUP<br/>
                  <span className="text-xs font-mono text-text-secondary">Signature: Hs7VtQCvTm3...<a href="#" className="text-[#9945FF] ml-1">View ↗️</a></span>
                </p>
              </div>
            </div>
            
            {/* Command Parser Visualization */}
            <div className="bg-gray-800 rounded-lg border border-border-color p-4">
              <h3 className="text-sm font-medium mb-3 text-text-secondary">Command Parser</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="px-2 py-1 rounded bg-[#9945FF]/20 text-[#9945FF] text-xs font-medium">@{watchedPrefix}</div>
                <div className="px-2 py-1 rounded bg-[#14F195]/20 text-[#14F195] text-xs font-medium">{parsedCommand.action}</div>
                <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-500 text-xs font-medium">{parsedCommand.amount}</div>
                <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">{parsedCommand.inToken}</div>
                <div className="px-2 py-1 rounded bg-gray-500/20 text-gray-400 text-xs font-medium">for</div>
                <div className="px-2 py-1 rounded bg-pink-500/20 text-pink-400 text-xs font-medium">{parsedCommand.outToken}</div>
              </div>
              <div className="p-3 bg-gray-900 rounded text-xs font-mono text-text-secondary">
                {`{`}<br/>
                &nbsp;&nbsp;action: <span className="text-[#14F195]">'{parsedCommand.action}'</span>,<br/>
                &nbsp;&nbsp;inToken: <span className="text-blue-400">'{parsedCommand.inToken}'</span>,<br/>
                &nbsp;&nbsp;outToken: <span className="text-pink-400">'{parsedCommand.outToken}'</span>,<br/>
                &nbsp;&nbsp;amount: <span className="text-amber-500">{parsedCommand.amount}</span><br/>
                {`}`}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
