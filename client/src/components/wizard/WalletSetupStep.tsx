import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWizardStore } from "@/hooks/use-wizard-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Define the schema for the form
const formSchema = z.object({
  walletType: z.enum(["new", "import"]),
  privateKey: z.string().optional(),
}).superRefine((data, ctx) => {
  // Only validate private key if wallet type is "import"
  if (data.walletType === "import") {
    if (!data.privateKey) {
      // If no private key is provided for import
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Private key is required for import",
        path: ["privateKey"],
      });
      return;
    }
    
    if (data.privateKey.length !== 88 && data.privateKey.length !== 64) {
      // If private key has invalid length
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Private key must be 64 or 88 characters",
        path: ["privateKey"],
      });
      return;
    }
  }
});

export default function WalletSetupStep() {
  const { updateWalletDetails, walletDetails } = useWizardStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      walletType: walletDetails?.type || "new",
      privateKey: walletDetails?.privateKey || "",
    },
  });
  
  // Ensure walletDetails is set to { type: 'new' } by default
  useEffect(() => {
    if (!walletDetails) {
      updateWalletDetails({ type: 'new' });
    }
  }, [walletDetails, updateWalletDetails]);
  
  // This effect immediately updates the wizard store when form values change
  useEffect(() => {
    // Set up a debounce function to prevent too many updates
    let timeout: NodeJS.Timeout;
    
    const subscription = form.watch((value) => {
      // Clear any existing timeout
      if (timeout) clearTimeout(timeout);
      
      // Set a new timeout to update after a delay
      timeout = setTimeout(() => {
        if (form.formState.isValid) {
          // Only save if the import has a valid key or if using "new" wallet type
          if (value.walletType === "new" || 
              (value.walletType === "import" && value.privateKey && 
               (value.privateKey.length === 88 || value.privateKey.length === 64))) {
            updateWalletDetails({
              type: value.walletType as 'new' | 'import',
              privateKey: value.privateKey,
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
  }, [updateWalletDetails]); // Removed form from dependencies
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    updateWalletDetails({
      type: values.walletType,
      privateKey: values.privateKey,
    });
    
    setIsSubmitting(false);
  }
  
  // Auto-submit on mount if we have existing data (for when returning to this step)
  useEffect(() => {
    // Only set values on initial mount to avoid infinite loop
    if (walletDetails && form.getValues("walletType") !== walletDetails.type) {
      form.setValue("walletType", walletDetails.type);
      if (walletDetails.privateKey) {
        form.setValue("privateKey", walletDetails.privateKey);
      }
    }
  }, [walletDetails]); // Removed form from dependencies
  
  const walletType = form.watch("walletType");
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="walletType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Wallet Setup</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-3"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="new" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Create a new wallet
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="import" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Import existing wallet
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {walletType === "import" && (
              <FormField
                control={form.control}
                name="privateKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Private Key</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your private key here..."
                        className="font-mono text-sm resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Your private key will be encrypted before storage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {walletType === "new" && (
              <Alert className="bg-[#14F195]/10 border-[#14F195]/20 text-[#14F195]">
                <AlertDescription>
                  A new wallet will be created for your bot. It will be funded with SOL from the Devnet faucet when you deploy.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Hidden submit button that can be triggered programmatically */}
            <Button 
              type="submit" 
              className="hidden"
              disabled={isSubmitting}
            >
              Save
            </Button>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Wallet Information</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/50 rounded-lg border border-border-color">
                <div className="flex items-center mb-2">
                  <i className="fas fa-wallet text-[#14F195] mr-2"></i>
                  <span className="text-sm font-medium text-white">Bot Wallet</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-text-secondary">Public Key</p>
                    <p className="font-mono text-xs truncate text-white">
                      {walletType === "new" 
                        ? "Will be generated when deployed"
                        : "Will be derived from your private key"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-text-secondary">Balance</p>
                    <p className="font-medium text-white">0.1 SOL (Will be funded from Devnet)</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  <i className="fas fa-shield-alt mr-1 text-[#9945FF]"></i>
                  Security Information
                </p>
                <ul className="text-xs space-y-1 text-text-secondary">
                  <li>• Your private key is encrypted with AES-256 before storage</li>
                  <li>• This is a Devnet bot, avoid using mainnet private keys</li>
                  <li>• For production use, consider a proper key management solution</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
