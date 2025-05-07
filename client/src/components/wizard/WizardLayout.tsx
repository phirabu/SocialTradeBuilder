import { ReactNode } from "react";
import StepProgressBar from "./StepProgressBar";
import { useWizardStore } from "@/hooks/use-wizard-store";

interface WizardLayoutProps {
  children: ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
}

export default function WizardLayout({ 
  children,
  onPrevious,
  onNext,
  showNavigation = true
}: WizardLayoutProps) {
  const { currentStep, steps } = useWizardStore();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Tweet-to-Trade Bot Builder</h1>
        <p className="text-text-secondary">Create a trading bot that executes Solana transactions based on tweets.</p>
      </header>

      <StepProgressBar />
      
      <div className="bg-card-bg rounded-xl p-6 mb-8 border border-border-color">
        <h2 className="text-xl font-semibold mb-6">{steps[currentStep]}</h2>
        
        {children}
        
        {showNavigation && (
          <div className="flex justify-between mt-8">
            {!isFirstStep ? (
              <button 
                className="px-4 py-2 border border-border-color rounded-lg text-white hover:bg-white/5"
                onClick={onPrevious}
              >
                <i className="fas fa-arrow-left mr-2"></i> Previous
              </button>
            ) : (
              <div></div>
            )}
            
            <button 
              className="px-4 py-2 bg-[#9945FF] hover:bg-[#9945FF]/90 rounded-lg text-white"
              onClick={onNext}
            >
              {isLastStep ? 'Deploy Bot' : 'Next'} 
              {!isLastStep && <i className="fas fa-arrow-right ml-2"></i>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
