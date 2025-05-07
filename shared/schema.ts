import { pgTable, text, serial, integer, boolean, timestamp, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Bot Schema
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  twitterUsername: text("twitter_username").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotSchema = createInsertSchema(bots).pick({
  name: true,
  twitterUsername: true,
  description: true,
  active: true,
});

export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof bots.$inferSelect;

// Wallet Schema
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull(),
  publicKey: text("public_key").notNull().unique(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  balance: text("balance").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).pick({
  botId: true,
  publicKey: true,
  encryptedPrivateKey: true,
  balance: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// Trade Schema
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull(),
  action: text("action").notNull(), // buy, sell
  inToken: text("in_token").notNull(),
  outToken: text("out_token").notNull(),
  amount: text("amount").notNull(),
  inAmount: text("in_amount").notNull(),
  outAmount: text("out_amount"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  transactionSignature: text("transaction_signature"),
  errorMessage: text("error_message"),
  tweetId: text("tweet_id"),
  tweetText: text("tweet_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(trades).pick({
  botId: true,
  action: true,
  inToken: true,
  outToken: true,
  amount: true,
  inAmount: true,
  outAmount: true,
  status: true,
  transactionSignature: true,
  errorMessage: true,
  tweetId: true,
  tweetText: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Bot Configuration Schema
export const botConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().unique(),
  supportedActions: json("supported_actions").notNull(), // ["buy", "sell"]
  supportedTokens: json("supported_tokens").notNull(), // [{"symbol": "SOL", "name": "Solana", "color": "#9945FF"}]
  transactionFee: text("transaction_fee").notNull().default("0.01"),
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).pick({
  botId: true,
  supportedActions: true,
  supportedTokens: true,
  transactionFee: true,
});

export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigs.$inferSelect;

// Twitter Webhook Schema
export const twitterWebhooks = pgTable("twitter_webhooks", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().unique(),
  webhookUrl: text("webhook_url").notNull(),
  apiKeyId: text("api_key_id"),
  lastMentionId: text("last_mention_id"),
  nextPollTime: timestamp("next_poll_time"),
  backoffSeconds: integer("backoff_seconds").default(30), // Default poll interval
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTwitterWebhookSchema = createInsertSchema(twitterWebhooks).pick({
  botId: true,
  webhookUrl: true,
  apiKeyId: true,
  lastMentionId: true,
  nextPollTime: true,
  backoffSeconds: true,
});

export type InsertTwitterWebhook = z.infer<typeof insertTwitterWebhookSchema>;
export type TwitterWebhook = typeof twitterWebhooks.$inferSelect;

// Token Balances Schema
export const tokenBalances = pgTable("token_balances", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  token: text("token").notNull(), // SOL, USDC, JUP, etc.
  balance: text("balance").notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    walletTokenIdx: unique("wallet_token_idx").on(table.walletId, table.token)
  };
});

export const insertTokenBalanceSchema = createInsertSchema(tokenBalances).pick({
  walletId: true,
  token: true,
  balance: true,
});

export type InsertTokenBalance = z.infer<typeof insertTokenBalanceSchema>;
export type TokenBalance = typeof tokenBalances.$inferSelect;

// Tweets table to store tweet information
export const tweets = pgTable("tweets", {
  id: serial("id").primaryKey(),
  tweetId: text("tweet_id").notNull().unique(),
  tweetText: text("tweet_text").notNull(),
  authorUsername: text("author_username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processed: boolean("processed").notNull().default(false),
  botId: integer("bot_id").references(() => bots.id),
  transactionSignature: text("transaction_signature"),
  processingStatus: text("processing_status").default("pending"),
  errorMessage: text("error_message")
});

export const insertTweetSchema = createInsertSchema(tweets).pick({
  tweetId: true,
  tweetText: true,
  authorUsername: true,
  botId: true,
  processed: true,
  processingStatus: true
});

export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type Tweet = typeof tweets.$inferSelect;

// Command parsing result type
export type ParsedCommand = {
  action: string;
  inToken: string;
  outToken: string;
  amount: number;
};
