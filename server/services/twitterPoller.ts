import { TweetV2 } from 'twitter-api-v2';
import { getMentions, resetRateLimits } from './twitter';
import { storage } from '../storage';
import { log } from '../vite';

// Polling configuration for Twitter API
const DEFAULT_POLL_INTERVAL = 60; // 60 seconds between regular polls
const MIN_POLL_INTERVAL = 30; // Minimum 30 seconds between polls
const MAX_BACKOFF_SECONDS = 3600; // Max 1 hour between polls during rate limiting
const BASE_BACKOFF_MULTIPLIER = 2; // Exponential backoff multiplier for rate limiting
const INITIAL_STAGGER_MS = 10000; // 10 second stagger between bot polling schedules

/**
 * Initialize polling for mentions for all active bots
 * @param initialIntervalSeconds How often to initially poll for mentions (in seconds)
 */
export async function initMentionPolling(initialIntervalSeconds: number = DEFAULT_POLL_INTERVAL) {
  // Only start polling if Twitter API keys are available
  if (!process.env.TWITTER_BEARER_TOKEN) {
    log('[TWITTER] Twitter API key not available. Mention polling disabled.', 'twitter');
    return;
  }
  
  // Start the polling scheduler
  await setupPollingSchedule();
  
  // Force reset rate limit now (for testing)
  resetRateLimits();
  
  // Set up the polling interval checker
  setInterval(async () => {
    await checkAndExecutePendingPolls();
  }, 1000); // Check every second for any polls that need to be executed
  
  log(`[TWITTER] Smart mention polling initialized with ${initialIntervalSeconds}s initial interval`, 'twitter');
}

/**
 * Setup initial polling schedules for all bots
 * This creates a staggered schedule to prevent all bots from polling at the same time
 * and potentially hitting rate limits
 */
async function setupPollingSchedule() {
  try {
    // Get all active bots
    const bots = await storage.listBots();
    const activeBotsWithTwitter = bots.filter(bot => bot.active && bot.twitterUsername);
    
    // Current time
    const now = new Date();
    
    // Set up staggered initial poll times to avoid all bots polling at the same time
    // If we have many bots, distribute them evenly across the DEFAULT_POLL_INTERVAL window
    for (let i = 0; i < activeBotsWithTwitter.length; i++) {
      const bot = activeBotsWithTwitter[i];
      
      // Calculate staggered poll time 
      // This spaces out bots across the polling interval to avoid clustering
      const staggerMs = i * INITIAL_STAGGER_MS;
      const initialPollTime = new Date(now.getTime() + staggerMs);
      
      // Get or create Twitter webhook entry for this bot
      let webhook = await storage.getTwitterWebhookByBotId(bot.id);
      
      if (!webhook) {
        // Create webhook entry with default polling schedule
        webhook = await storage.createTwitterWebhook({
          botId: bot.id,
          webhookUrl: `https://api.example.com/twitter/webhook/${bot.id}`,
          backoffSeconds: DEFAULT_POLL_INTERVAL,
          nextPollTime: initialPollTime 
        });
        log(`[TWITTER] Created new polling schedule for bot @${bot.twitterUsername}, first poll at ${initialPollTime.toISOString()}`, 'twitter');
      } else {
        // Update existing webhook with next poll time
        // If nextPollTime is not set or has already passed, set it to a staggered time
        if (!webhook.nextPollTime || webhook.nextPollTime < now) {
          await storage.updatePollSchedule(
            bot.id, 
            initialPollTime,
            DEFAULT_POLL_INTERVAL
          );
          log(`[TWITTER] Updated polling schedule for bot @${bot.twitterUsername}, next poll at ${initialPollTime.toISOString()}`, 'twitter');
        }
      }
    }
    
    log(`[TWITTER] Polling schedule initialized for ${activeBotsWithTwitter.length} bots`, 'twitter');
  } catch (error) {
    console.error('[TWITTER] Error setting up polling schedule:', error);
  }
}

/**
 * Check for any polls that need to be executed
 */
async function checkAndExecutePendingPolls() {
  try {
    // Get all active bots
    const bots = await storage.listBots();
    const activeBotsWithTwitter = bots.filter(bot => bot.active && bot.twitterUsername);
    
    if (activeBotsWithTwitter.length === 0) {
      return;
    }
    
    // Current time
    const now = new Date();
    
    // Check each bot's poll schedule
    for (const bot of activeBotsWithTwitter) {
      // Get webhook to check nextPollTime
      const webhook = await storage.getTwitterWebhookByBotId(bot.id);
      
      if (!webhook || !webhook.nextPollTime) continue;
      
      // If it's time to poll
      if (webhook.nextPollTime <= now) {
        await pollBotMentions(bot.id, bot.twitterUsername);
      }
    }
  } catch (error) {
    console.error('[TWITTER] Error checking pending polls:', error);
  }
}

/**
 * Poll for mentions for a specific bot using an adaptive polling strategy
 * 
 * This function implements smart polling that:
 * 1. Always uses the since_id parameter to only get new tweets
 * 2. Adapts polling frequency based on activity (polls more frequently if there's recent activity)
 * 3. Handles rate limits with exponential backoff
 * 4. Maintains efficient use of API quota
 */
async function pollBotMentions(botId: number, twitterUsername: string) {
  try {
    // Get the webhook for this bot
    const webhook = await storage.getTwitterWebhookByBotId(botId);
    if (!webhook) {
      console.error(`[TWITTER] No webhook found for bot ${botId}`);
      return;
    }
    
    // Get mentions since the last ID we've seen
    const lastMentionId = webhook.lastMentionId || undefined;
    
    // Calculate appropriate polling interval based on activity
    // If we have lastMentionId and backoffSeconds hasn't been modified, 
    // we're in normal operation mode
    let pollInterval = webhook.backoffSeconds || DEFAULT_POLL_INTERVAL;
    
    // Log the polling attempt
    log(`[TWITTER] Polling mentions for bot @${twitterUsername} (since ID: ${lastMentionId || 'none'})`, 'twitter');
    
    try {
      console.log(`[TWITTER-DEBUG] Attempting to get mentions for @${twitterUsername}...`);
      const mentions = await getMentions(twitterUsername, lastMentionId);
      console.log(`[TWITTER-DEBUG] Got ${mentions.length} mentions for @${twitterUsername}`);
      
      // Adjust polling frequency based on activity:
      // - If we found new mentions, poll more frequently (activity detected)
      // - If no mentions found, gradually increase polling interval (save API calls)
      let newPollInterval = pollInterval;
      
      if (mentions.length > 0) {
        // Activity detected! Poll more frequently, but not less than MIN_POLL_INTERVAL
        newPollInterval = Math.max(MIN_POLL_INTERVAL, pollInterval / 2);
        log(`[TWITTER] Activity detected for @${twitterUsername}, decreasing poll interval to ${newPollInterval}s`, 'twitter');
      } else {
        // No activity, gradually increase poll interval up to DEFAULT_POLL_INTERVAL
        // This saves API calls when a bot isn't receiving mentions
        if (pollInterval < DEFAULT_POLL_INTERVAL) {
          newPollInterval = Math.min(DEFAULT_POLL_INTERVAL, pollInterval * 1.5);
          log(`[TWITTER] No activity for @${twitterUsername}, increasing poll interval to ${newPollInterval}s`, 'twitter');
        }
      }
      
      // Calculate the next poll time
      const nextPollTime = new Date(Date.now() + (newPollInterval * 1000));
      
      // If we have new mentions, process them
      if (mentions.length > 0) {
        log(`[TWITTER] Found ${mentions.length} new mentions for bot @${twitterUsername}`, 'twitter');
        console.log(`[TWITTER-DEBUG] Mention details:`, JSON.stringify(mentions, null, 2));
        
        // Track highest tweet ID to avoid reprocessing
        let highestTweetId = lastMentionId || '';
        
        // Process mentions in chronological order (oldest first)
        for (const mention of [...mentions].reverse()) {
          // Update highest ID seen
          if (!highestTweetId || mention.id > highestTweetId) {
            highestTweetId = mention.id;
          }
          
          // Process the mention
          await processMention(botId, mention);
        }
        
        // Update the last processed tweet ID in the database
        if (highestTweetId && highestTweetId !== lastMentionId) {
          await storage.updateLastMentionId(botId, highestTweetId);
          log(`[TWITTER] Updated last mention ID for bot @${twitterUsername} to ${highestTweetId}`, 'twitter');
        }
      } else {
        log(`[TWITTER] No new mentions for bot @${twitterUsername}`, 'twitter');
      }
      
      // Update the next poll time with our adjusted interval
      await storage.updatePollSchedule(botId, nextPollTime, newPollInterval);
      
    } catch (error: any) {
      // Check if this is a rate limit error
      if (error?.code === 429) {
        log(`[TWITTER] Rate limit hit for bot @${twitterUsername}`, 'twitter');
        
        // Apply exponential backoff
        const newBackoffSeconds = Math.min(
          pollInterval * BASE_BACKOFF_MULTIPLIER,
          MAX_BACKOFF_SECONDS
        );
        
        // If the API provides a reset time, use that
        let nextPollTime: Date;
        if (error?.rateLimit?.reset) {
          // Add 5 seconds buffer to the reset time
          nextPollTime = new Date((error.rateLimit.reset * 1000) + 5000);
          log(`[TWITTER] Setting next poll based on rate limit reset: ${nextPollTime.toISOString()}`, 'twitter');
        } else {
          // Otherwise use our backoff calculation
          nextPollTime = new Date(Date.now() + (newBackoffSeconds * 1000));
        }
        
        // Update with backoff
        await storage.updatePollSchedule(botId, nextPollTime, newBackoffSeconds);
        log(`[TWITTER] Increased backoff for bot @${twitterUsername} to ${newBackoffSeconds}s`, 'twitter');
      } else {
        // For non-rate-limit errors, use normal polling interval but log the error
        const nextPollTime = new Date(Date.now() + (pollInterval * 1000));
        await storage.updatePollSchedule(botId, nextPollTime, pollInterval);
        console.error(`[TWITTER] Error polling mentions for bot @${twitterUsername}:`, error);
      }
    }
  } catch (error) {
    console.error(`[TWITTER] Error in pollBotMentions for bot @${twitterUsername}:`, error);
  }
}

/**
 * Process a single mention
 */
async function processMention(botId: number, tweet: TweetV2) {
  try {
    // Extract the author username from includes if available, otherwise use a default
    let authorUsername = 'user'; // Default fallback
    
    // In a real implementation with proper expansions, we'd extract the username from includes
    if (tweet.author_id) {
      // For the MVP, we'll use the author_id as the username
      // In a real implementation with expansions, we'd look up the actual username
      authorUsername = tweet.author_id;
    }
    
    log(`[TWITTER] Processing mention from @${authorUsername}: ${tweet.text}`, 'twitter');
    
    // Make a POST request to the process-command endpoint
    const response = await fetch(`http://localhost:5000/api/process-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botId,
        tweetId: tweet.id,
        tweetText: tweet.text,
        twitterUsername: authorUsername
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`[TWITTER] Error processing mention ${tweet.id}:`, error);
    } else {
      log(`[TWITTER] Successfully processed mention ${tweet.id}`, 'twitter');
    }
  } catch (error) {
    console.error(`[TWITTER] Error processing mention ${tweet.id}:`, error);
  }
}