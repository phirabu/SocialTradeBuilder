import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import WizardLayout from "@/components/wizard/WizardLayout";
import BotSetupStep from "@/components/wizard/BotSetupStep";
import WalletSetupStep from "@/components/wizard/WalletSetupStep";
import CommandSetupStep from "@/components/wizard/CommandSetupStep";
import DeployStep from "@/components/wizard/DeployStep";
import { useWizardStore } from "@/hooks/use-wizard-store";
import { useToast } from "@/hooks/use-toast";

export default function Wizard() {
  const { 
    currentStep, 
    setCurrentStep, 
    botDetails, 
    walletDetails, 
    commandConfig,
    resetWizard
  } = useWizardStore();
  
  // Reset wizard state when component mounts
  useEffect(() => {
    resetWizard();
  }, [resetWizard]);
  
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleNext = () => {
    // Validate current step
    if (currentStep === 0 && !botDetails) {
      toast({
        title: "Missing Bot Details",
        description: "Please complete the bot setup form before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === 1 && !walletDetails) {
      toast({
        title: "Missing Wallet Details",
        description: "Please complete the wallet setup form before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === 2 && !commandConfig) {
      toast({
        title: "Missing Command Configuration",
        description: "Please configure the bot commands before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    // Move to next step if validation passes
    setCurrentStep(currentStep + 1);
  };
  
  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BotSetupStep />;
      case 1:
        return <WalletSetupStep />;
      case 2:
        return <CommandSetupStep />;
      case 3:
        return <DeployStep />;
      default:
        return <div>Unknown step</div>;
    }
  };
  
  // Add mobile header padding
  useEffect(() => {
    const content = document.getElementById('wizard-content');
    if (content) {
      content.classList.add('md:pt-0', 'pt-16');
    }
    
    return () => {
      if (content) {
        content.classList.remove('md:pt-0', 'pt-16');
      }
    };
  }, []);

  return (
    <div id="wizard-content">
      <WizardLayout
        onNext={handleNext}
        onPrevious={handlePrevious}
        showNavigation={currentStep !== 3}
      >
        {renderStepContent()}
      </WizardLayout>
    </div>
  );
}
