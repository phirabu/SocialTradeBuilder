import { Request, Response } from 'express';
import { parseCommand, validateCommand } from './parser';
import { 
  formatInvalidCommandReply, 
  replyWithError, 
  replyWithTradeSuccess 
} from './twitter';
import { storage } from '../storage';
import { getTransactionExplorerUrl } from './solana';
import { executeJupiterSwap } from './jupiter';
import { validateWalletFunds } from './solana';

/**
 * Process a Twitter mention webhook event
 * This handles incoming mentions from Twitter's webhook API
 */
export async function processMentionWebhook(req: Request, res: Response) {
  try {
    // For Twitter webhook challenge verification (CRC)
    if (req.query.crc_token) {
      const crcToken = req.query.crc_token as string;
      const hmac = require('crypto').createHmac('sha256', process.env.TWITTER_API_SECRET)
        .update(crcToken)
        .digest('base64');
      
      return res.status(200).json({ response_token: `sha256=${hmac}` });
    }

    // Validate request format for actual mentions
    const { tweet_create_events: tweetEvents } = req.body;
    
    if (!tweetEvents || !Array.isArray(tweetEvents) || tweetEvents.length === 0) {
      console.log('[TWITTER] No tweet events in webhook payload');
      return res.status(200).end();
    }
    
    // Process each tweet event
    const event = tweetEvents[0];
    const tweetId = event.id_str;
    const tweetText = event.text;
    const authorId = event.user.id_str;
    const authorUsername = event.user.screen_name;
    
    // Don't process the bot's own tweets
    const botUsername = extractMentionedUsername(tweetText);
    if (!botUsername) {
      console.log('[TWITTER] No bot username mentioned in tweet');
      return res.status(200).end();
    }
    
    // Find the bot by Twitter username
    const bot = await storage.getBotByTwitterUsername(botUsername);
    if (!bot) {
      console.log(`[TWITTER] Bot with username @${botUsername} not found`);
      return res.status(200).end();
    }
    
    // Get the bot's configuration
    const botConfig = await storage.getBotConfigByBotId(bot.id);
    if (!botConfig) {
      console.log(`[TWITTER] Bot ${bot.id} has no configuration`);
      return res.status(200).end();
    }
    
    // Parse the command from the tweet
    const parsedCommand = parseCommand(tweetText, botUsername);
    if (!parsedCommand) {
      const errorReply = formatInvalidCommandReply("Could not parse command");
      await replyWithError(tweetId, errorReply);
      return res.status(200).end();
    }
    
    // Validate the command against supported actions and tokens
    const validation = validateCommand(
      parsedCommand,
      botConfig.supportedActions as string[],
      botConfig.supportedTokens as Array<{symbol: string}>
    );
    
    if (!validation.valid) {
      const errorReply = formatInvalidCommandReply(validation.error || "Invalid command");
      await replyWithError(tweetId, errorReply);
      return res.status(200).end();
    }
    
    // Get the bot's wallet
    const wallet = await storage.getWalletByBotId(bot.id);
    if (!wallet) {
      await replyWithError(tweetId, "Bot has no wallet configured");
      return res.status(200).end();
    }
    
    // Validate funds for the transaction
    const hasSufficientFunds = await validateWalletFunds(
      wallet.publicKey,
      parseFloat(parsedCommand.amount.toString()),
      parseFloat(botConfig.transactionFee || "0.01")
    );
    
    if (!hasSufficientFunds) {
      await replyWithError(tweetId, "Insufficient funds for this transaction");
      return res.status(200).end();
    }
    
    // Create a trade record
    const trade = await storage.createTrade({
      botId: bot.id,
      action: parsedCommand.action,
      inToken: parsedCommand.inToken,
      outToken: parsedCommand.outToken,
      amount: parsedCommand.amount.toString(),
      inAmount: parsedCommand.amount.toString(),
      outAmount: "0", // Will be updated after swap
      status: "pending",
      tweetId,
      tweetText: tweetText
    });
    
    // Convert the amount to a number for the Jupiter swap
    const amountNumber = Number(parsedCommand.amount);
    
    // Execute the swap
    const swapResult = await executeJupiterSwap(
      parsedCommand.inToken,
      parsedCommand.outToken,
      amountNumber,
      wallet.publicKey,
      wallet.encryptedPrivateKey
    );
    
    if (!swapResult.success) {
      // Update trade status to failed
      await storage.updateTradeStatus(
        trade.id, 
        "failed", 
        undefined, 
        swapResult.error || "Swap failed"
      );
      
      await replyWithError(tweetId, swapResult.error || "Swap failed");
      return res.status(200).end();
    }
    
    // Update the trade record with success details
    const updatedTrade = await storage.updateTradeStatus(
      trade.id,
      "succeeded",
      swapResult.signature,
      undefined
    );
    
    // Get explorer URL for the transaction
    const explorerUrl = getTransactionExplorerUrl(swapResult.signature!);
    
    // Reply with success message
    await replyWithTradeSuccess(
      tweetId,
      bot.name,
      authorUsername,
      parsedCommand.action,
      parsedCommand.inToken,
      parsedCommand.outToken,
      parsedCommand.amount.toString(),
      swapResult.outputAmount || "0",
      swapResult.signature!,
      explorerUrl
    );
    
    return res.status(200).end();
  } catch (error) {
    console.error('[TWITTER] Error processing mention webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Extract the first mentioned username from a tweet text
 */
function extractMentionedUsername(tweetText: string): string | null {
  const mentionRegex = /@([A-Za-z0-9_]+)/;
  const match = tweetText.match(mentionRegex);
  return match ? match[1] : null;
}

/**
 * Process a Direct Message webhook event
 * This handles incoming DMs from Twitter's webhook API
 */
export async function processDMWebhook(req: Request, res: Response) {
  try {
    // For now, we'll implement a simpler version for the MVP
    // This would be expanded to handle actual DMs in production
    return res.status(200).end();
  } catch (error) {
    console.error('[TWITTER] Error processing DM webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}