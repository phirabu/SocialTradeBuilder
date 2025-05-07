import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Bot {
  id: number;
  name: string;
  twitterUsername: string;
  publicKey: string;
  webhookUrl: string;
  createdAt: Date;
  active: boolean;
}

interface BotStore {
  bots: Bot[];
  addBot: (bot: Bot) => void;
  updateBot: (id: number, updates: Partial<Bot>) => void;
  removeBot: (id: number) => void;
}

export const useBotStore = create<BotStore>()(
  persist(
    (set) => ({
      bots: [],
      
      addBot: (bot) => set((state) => ({
        bots: [...state.bots, bot]
      })),
      
      updateBot: (id, updates) => set((state) => ({
        bots: state.bots.map((bot) => 
          bot.id === id ? { ...bot, ...updates } : bot
        )
      })),
      
      removeBot: (id) => set((state) => ({
        bots: state.bots.filter((bot) => bot.id !== id)
      })),
    }),
    {
      name: 'bot-storage',
    }
  )
);
