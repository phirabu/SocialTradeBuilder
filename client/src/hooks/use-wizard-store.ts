import { create } from 'zustand';

interface BotDetails {
  name: string;
  twitterUsername: string;
  description: string;
}

interface WalletDetails {
  type: 'new' | 'import';
  privateKey?: string;
}

interface CommandConfig {
  prefix: string;
  supportedActions: string[];
  supportedTokens: Array<{
    symbol: string;
    name: string;
    color?: string;
  }>;
  transactionFee: string;
}

interface WizardState {
  // Steps
  currentStep: number;
  steps: string[];
  setCurrentStep: (step: number) => void;
  
  // Bot details
  botDetails: BotDetails | null;
  updateBotDetails: (details: BotDetails) => void;
  
  // Wallet details
  walletDetails: WalletDetails | null;
  updateWalletDetails: (details: WalletDetails) => void;
  
  // Command configuration
  commandConfig: CommandConfig | null;
  updateCommandConfig: (config: CommandConfig) => void;
  
  // Reset the wizard
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  // Steps
  currentStep: 0,
  steps: ['Bot Setup', 'Configure Wallet', 'Command Setup', 'Deploy'],
  setCurrentStep: (step) => set({ currentStep: step }),
  
  // Bot details
  botDetails: null,
  updateBotDetails: (details) => set({ botDetails: details }),
  
  // Wallet details
  walletDetails: null,
  updateWalletDetails: (details) => set({ walletDetails: details }),
  
  // Command configuration
  commandConfig: null,
  updateCommandConfig: (config) => set({ commandConfig: config }),
  
  // Reset the wizard
  resetWizard: () => set({
    currentStep: 0,
    botDetails: null,
    walletDetails: null,
    commandConfig: null
  })
}));
