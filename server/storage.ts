import { 
  users, type User, type InsertUser,
  bots, type Bot, type InsertBot,
  wallets, type Wallet, type InsertWallet,
  trades, type Trade, type InsertTrade,
  botConfigs, type BotConfig, type InsertBotConfig,
  twitterWebhooks, type TwitterWebhook, type InsertTwitterWebhook,
  tokenBalances, type TokenBalance, type InsertTokenBalance,
  tweets, type Tweet, type InsertTweet
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bot methods
  createBot(bot: InsertBot): Promise<Bot>;
  getBotById(id: number): Promise<Bot | undefined>;
  getBotByTwitterUsername(twitterUsername: string): Promise<Bot | undefined>;
  listBots(): Promise<Bot[]>;
  updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined>;
  deleteBot(id: number): Promise<boolean>;
  
  // Wallet methods
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  getWalletByBotId(botId: number): Promise<Wallet | undefined>;
  updateWalletBalance(id: number, balance: string): Promise<Wallet | undefined>;
  
  // Token Balance methods
  getTokenBalance(walletId: number, token: string): Promise<TokenBalance | undefined>;
  getTokenBalancesByWalletId(walletId: number): Promise<TokenBalance[]>;
  upsertTokenBalance(walletId: number, token: string, balance: string): Promise<TokenBalance>;
  
  // Trade methods
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTradeById(id: number): Promise<Trade | undefined>;
  getTradesByBotId(botId: number): Promise<Trade[]>;
  updateTradeStatus(id: number, status: string, transactionSignature?: string, errorMessage?: string): Promise<Trade | undefined>;
  getRecentTrades(limit: number): Promise<Trade[]>;
  
  // Bot Config methods
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  getBotConfigByBotId(botId: number): Promise<BotConfig | undefined>;
  updateBotConfig(id: number, updates: Partial<BotConfig>): Promise<BotConfig | undefined>;
  
  // Twitter Webhook methods
  createTwitterWebhook(webhook: InsertTwitterWebhook): Promise<TwitterWebhook>;
  getTwitterWebhookByBotId(botId: number): Promise<TwitterWebhook | undefined>;
  updateTwitterWebhook(id: number, updates: Partial<TwitterWebhook>): Promise<TwitterWebhook | undefined>;
  updateLastMentionId(botId: number, lastMentionId: string): Promise<TwitterWebhook | undefined>;
  updatePollSchedule(botId: number, nextPollTime: Date, backoffSeconds?: number): Promise<TwitterWebhook | undefined>;

  // Tweet methods
  createTweet(tweet: InsertTweet): Promise<Tweet>;
  getTweetById(id: number): Promise<Tweet | undefined>;
  getTweetByTweetId(tweetId: string): Promise<Tweet | undefined>;
  getLatestTweet(): Promise<Tweet | undefined>;
  updateTweetStatus(id: number, processed: boolean, processingStatus?: string, transactionSignature?: string, errorMessage?: string): Promise<Tweet | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Bot methods
  async createBot(insertBot: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(insertBot).returning();
    return bot;
  }

  async getBotById(id: number): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot;
  }

  async getBotByTwitterUsername(twitterUsername: string): Promise<Bot | undefined> {
    const [bot] = await db
      .select()
      .from(bots)
      .where(eq(bots.twitterUsername, twitterUsername));
    return bot;
  }

  async listBots(): Promise<Bot[]> {
    return db.select().from(bots);
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    const [bot] = await db
      .update(bots)
      .set(updates)
      .where(eq(bots.id, id))
      .returning();
    return bot;
  }

  async deleteBot(id: number): Promise<boolean> {
    const result = await db
      .delete(bots)
      .where(eq(bots.id, id));
    return result.count > 0;
  }

  // Wallet methods
  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values(insertWallet).returning();
    return wallet;
  }

  async getWalletByBotId(botId: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.botId, botId));
    return wallet;
  }

  async updateWalletBalance(id: number, balance: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .update(wallets)
      .set({ balance })
      .where(eq(wallets.id, id))
      .returning();
    return wallet;
  }

  // Token Balance methods
  async getTokenBalance(walletId: number, token: string): Promise<TokenBalance | undefined> {
    const [balance] = await db
      .select()
      .from(tokenBalances)
      .where(
        and(
          eq(tokenBalances.walletId, walletId),
          eq(tokenBalances.token, token)
        )
      );
    return balance;
  }

  async getTokenBalancesByWalletId(walletId: number): Promise<TokenBalance[]> {
    return db
      .select()
      .from(tokenBalances)
      .where(eq(tokenBalances.walletId, walletId));
  }

  async upsertTokenBalance(walletId: number, token: string, balance: string): Promise<TokenBalance> {
    // Check if record exists
    const existing = await this.getTokenBalance(walletId, token);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(tokenBalances)
        .set({ balance })
        .where(
          and(
            eq(tokenBalances.walletId, walletId),
            eq(tokenBalances.token, token)
          )
        )
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db
        .insert(tokenBalances)
        .values({
          walletId,
          token,
          balance
        })
        .returning();
      return created;
    }
  }

  // Trade methods
  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(insertTrade).returning();
    return trade;
  }

  async getTradeById(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade;
  }

  async getTradesByBotId(botId: number): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(eq(trades.botId, botId))
      .orderBy(desc(trades.createdAt));
  }

  async updateTradeStatus(
    id: number, 
    status: string, 
    transactionSignature?: string,
    errorMessage?: string
  ): Promise<Trade | undefined> {
    const updates: Partial<Trade> = { status };
    
    if (transactionSignature !== undefined) {
      updates.transactionSignature = transactionSignature;
    }
    
    if (errorMessage !== undefined) {
      updates.errorMessage = errorMessage;
    }
    
    const [trade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();
    
    return trade;
  }

  async getRecentTrades(limit: number): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  }

  // Bot Config methods
  async createBotConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const [config] = await db.insert(botConfigs).values(insertConfig).returning();
    return config;
  }

  async getBotConfigByBotId(botId: number): Promise<BotConfig | undefined> {
    const [config] = await db
      .select()
      .from(botConfigs)
      .where(eq(botConfigs.botId, botId));
    return config;
  }

  async updateBotConfig(id: number, updates: Partial<BotConfig>): Promise<BotConfig | undefined> {
    const [config] = await db
      .update(botConfigs)
      .set(updates)
      .where(eq(botConfigs.id, id))
      .returning();
    return config;
  }

  // Twitter Webhook methods
  async createTwitterWebhook(insertWebhook: InsertTwitterWebhook): Promise<TwitterWebhook> {
    const [webhook] = await db
      .insert(twitterWebhooks)
      .values(insertWebhook)
      .returning();
    return webhook;
  }

  async getTwitterWebhookByBotId(botId: number): Promise<TwitterWebhook | undefined> {
    const [webhook] = await db
      .select()
      .from(twitterWebhooks)
      .where(eq(twitterWebhooks.botId, botId));
    return webhook;
  }

  async updateTwitterWebhook(id: number, updates: Partial<TwitterWebhook>): Promise<TwitterWebhook | undefined> {
    const [webhook] = await db
      .update(twitterWebhooks)
      .set(updates)
      .where(eq(twitterWebhooks.id, id))
      .returning();
    return webhook;
  }
  
  async updateLastMentionId(botId: number, lastMentionId: string): Promise<TwitterWebhook | undefined> {
    // Get webhook by bot ID
    const webhook = await this.getTwitterWebhookByBotId(botId);
    if (!webhook) return undefined;
    
    // Update the last mention ID
    const [updatedWebhook] = await db
      .update(twitterWebhooks)
      .set({ lastMentionId })
      .where(eq(twitterWebhooks.id, webhook.id))
      .returning();
    
    return updatedWebhook;
  }
  
  async updatePollSchedule(botId: number, nextPollTime: Date, backoffSeconds?: number): Promise<TwitterWebhook | undefined> {
    // Get webhook by bot ID
    const webhook = await this.getTwitterWebhookByBotId(botId);
    if (!webhook) return undefined;
    
    // Create update data
    const updateData: Partial<TwitterWebhook> = { 
      nextPollTime
    };
    
    // If backoffSeconds is provided, update it
    if (backoffSeconds !== undefined) {
      updateData.backoffSeconds = backoffSeconds;
    }
    
    // Update the polling schedule
    const [updatedWebhook] = await db
      .update(twitterWebhooks)
      .set(updateData)
      .where(eq(twitterWebhooks.id, webhook.id))
      .returning();
    
    return updatedWebhook;
  }
  
  // Tweet methods
  async createTweet(insertTweet: InsertTweet): Promise<Tweet> {
    const [tweet] = await db.insert(tweets).values(insertTweet).returning();
    return tweet;
  }

  async getTweetById(id: number): Promise<Tweet | undefined> {
    const [tweet] = await db.select().from(tweets).where(eq(tweets.id, id));
    return tweet;
  }

  async getTweetByTweetId(tweetId: string): Promise<Tweet | undefined> {
    const [tweet] = await db.select().from(tweets).where(eq(tweets.tweetId, tweetId));
    return tweet;
  }

  async getLatestTweet(): Promise<Tweet | undefined> {
    const [tweet] = await db
      .select()
      .from(tweets)
      .orderBy(desc(tweets.createdAt))
      .limit(1);
    return tweet;
  }

  async updateTweetStatus(
    id: number, 
    processed: boolean, 
    processingStatus?: string, 
    transactionSignature?: string,
    errorMessage?: string
  ): Promise<Tweet | undefined> {
    const updates: Partial<Tweet> = { processed };
    
    if (processingStatus !== undefined) {
      updates.processingStatus = processingStatus;
    }
    
    if (transactionSignature !== undefined) {
      updates.transactionSignature = transactionSignature;
    }
    
    if (errorMessage !== undefined) {
      updates.errorMessage = errorMessage;
    }
    
    const [updatedTweet] = await db
      .update(tweets)
      .set(updates)
      .where(eq(tweets.id, id))
      .returning();
    
    return updatedTweet;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();