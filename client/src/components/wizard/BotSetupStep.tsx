import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/hooks/use-wizard-store";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Bot name must be at least 3 characters."
  }),
  twitterUsername: z.string().min(3, {
    message: "Twitter username must be at least 3 characters."
  }).refine(val => !val.includes("@"), {
    message: "Do not include @ in the username."
  }),
  description: z.string().optional(),
});

export default function BotSetupStep() {
  const { updateBotDetails, botDetails } = useWizardStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: botDetails?.name || "",
      twitterUsername: botDetails?.twitterUsername || "",
      description: botDetails?.description || "",
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
        // Only auto-save if the form is valid
        if (form.formState.isValid && value.name && value.twitterUsername) {
          // Update the store - this will also prevent the infinite loop by
          // reducing the frequency of updates and comparing values
          updateBotDetails({
            name: value.name,
            twitterUsername: value.twitterUsername,
            description: value.description || "",
          });
        }
      }, 300); // Debounce for 300ms
    });
    
    return () => {
      // Clean up by clearing any pending timeout and unsubscribing
      if (timeout) clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [updateBotDetails]); // Removed form from the dependencies
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    updateBotDetails({
      name: values.name,
      twitterUsername: values.twitterUsername,
      description: values.description || "",
    });
    
    setIsSubmitting(false);
  }
  
  // Auto-submit on mount if we have existing data (for when returning to this step)
  useEffect(() => {
    // Only set values on initial mount to avoid infinite loop
    if (botDetails && !form.getValues("name")) {
      form.setValue("name", botDetails.name);
      form.setValue("twitterUsername", botDetails.twitterUsername);
      form.setValue("description", botDetails.description);
    }
  }, [botDetails]); // Removed form from dependencies
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Name</FormLabel>
                  <FormControl>
                    <Input placeholder="TradeBot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="twitterUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter Username</FormLabel>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border-color bg-gray-800 text-text-secondary">@</span>
                    <Input className="rounded-l-none" placeholder="tradebot" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="A trading bot that executes Solana trades via Twitter commands."
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
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
          
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Preview</h3>
            
            <div className="mock-tweet p-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-[#9945FF]/20 flex items-center justify-center mr-3">
                  <i className="fas fa-robot text-[#9945FF]"></i>
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="font-bold text-white">
                      {form.watch("name") || "TradeBot"}
                    </span>
                    <span className="ml-2 text-text-secondary">
                      @{form.watch("twitterUsername") || "tradebot"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {form.watch("description") || "A trading bot on Solana"}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-900/50 p-3 rounded-md border border-border-color">
                <p className="text-sm text-white">
                  Tweet commands like: <br />
                  <span className="font-mono text-[#9945FF]">@{form.watch("twitterUsername") || "tradebot"} buy 0.1 SOL of JUP</span> <br />
                  to execute trades on Solana.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
