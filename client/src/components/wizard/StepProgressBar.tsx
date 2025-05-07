import { useWizardStore } from "@/hooks/use-wizard-store";
import { cn } from "@/lib/utils";

export default function StepProgressBar() {
  const { currentStep, steps } = useWizardStore();
  
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center relative">
            {/* Step Circle */}
            <div 
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center z-10",
                index <= currentStep 
                  ? "bg-[#9945FF]" 
                  : "border-2 border-border-color bg-card-bg"
              )}
            >
              {index < currentStep ? (
                <i className="fas fa-check text-white"></i>
              ) : (
                <span className={index <= currentStep ? "text-white" : "text-text-secondary"}>
                  {index + 1}
                </span>
              )}
            </div>
            
            {/* Step Label */}
            <p className={cn(
              "mt-2 text-sm font-medium",
              index <= currentStep ? "text-white" : "text-text-secondary"
            )}>
              {step}
            </p>
            
            {/* Connector Line (except for the last step) */}
            {index < steps.length - 1 && (
              <div className="absolute top-5 left-[40px] w-[calc(100vw/5)] md:w-[100px] lg:w-[120px]">
                <div className={cn(
                  "step-connector",
                  index < currentStep ? "active" : ""
                )}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
