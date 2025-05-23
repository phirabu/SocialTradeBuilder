import crypto from 'crypto';
import { TwitterApi, TweetV2, TwitterApiReadWrite, TwitterApiReadOnly } from 'twitter-api-v2';

// Type for rate-limited endpoints
type TwitterEndpoint = 'userTimeline' | 'userLookup' | 'search_recent';

// Separate caches for tweets and rate limits
const tweetCache: Record<string, { tweet: TweetV2, timestamp: number }> = {};
const rateLimitState: Record<TwitterEndpoint, { reset: number, isLimited: boolean }> = {
  userTimeline: { reset: 0, isLimited: false },
  userLookup: { reset: 0, isLimited: false },
  search_recent: { reset: 0, isLimited: false }
};

// Cache TTL constants
const USER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const TWEET_CACHE_TTL = 60 * 1000; // 1 minute

// Cache for user IDs to avoid repeated lookups
const userIdCache: Record<string, string> = {};

// Create a singleton REST API client
let restClient: TwitterApiReadOnly | null = null;

/**
 * Get the REST API client instance
 */
function getRestClient(): TwitterApiReadOnly {
  if (!restClient) {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      throw new Error('Missing TWITTER_BEARER_TOKEN');
    }
    restClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN).readOnly;
  }
  return restClient;
}

/**
 * Initialize a TwitterApi client for a bot
 * In production, each bot would have its own credentials
 * For the MVP, we'll use the app's credentials for all bots
 */
export function initializeTwitterClient(): TwitterApiReadWrite {
  // Check if we have all the required environment variables
  const requiredEnvVars = [
    'TWITTER_API_KEY', 
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing Twitter API credentials: ${missingVars.join(', ')}`);
  }

  // Initialize the Twitter API client with OAuth 1.0a credentials
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });

  return twitterClient.readWrite;
}

/**
 * Initialize a read-only TwitterApi client for fetching tweets
 * This client doesn't need write permissions and won't try to use WebSocket connections
 */
export function initializeReadOnlyTwitterClient(): TwitterApiReadOnly {
  // Check if we have the required environment variables
  if (!process.env.TWITTER_BEARER_TOKEN) {
    throw new Error('Missing TWITTER_BEARER_TOKEN');
  }

  // Initialize the Twitter API client with bearer token
  const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  return twitterClient.readOnly;
}

/**
 * Generate a webhook URL for Twitter to post events to
 * For the MVP, we're using a simulated webhook URL
 * In production, this would be a real URL pointing to your application
 */
export function generateWebhookUrl(botId: number): string {
  // Generate a random string to use as a unique identifier
  const randomString = crypto.randomBytes(16).toString('hex');
  
  // In a real implementation, this would be a real webhook URL
  // For the MVP, we're using a simulated URL
  const webhookUrl = `https://api.example.com/twitter/webhook/${randomString}`;
  
  return webhookUrl;
}

/**
 * Generate Twitter API credentials for the bot
 * For the MVP, this creates simulated credentials
 * In production, each bot could have its own Twitter app or use the main app
 */
export function generateTwitterCredentials(): { apiKeyId: string } {
  // Generate a random string to use as a simulated API key ID
  const apiKeyId = crypto.randomBytes(8).toString('hex');
  
  return { apiKeyId };
}

/**
 * Post a tweet from the bot's account
 * @param message - The message to tweet
 * @param replyToTweetId - Optional tweet ID to reply to
 * @returns The posted tweet or null if posting failed
 */
export async function postTweet(message: string, replyToTweetId?: string): Promise<TweetV2 | null> {
  try {
    // Initialize Twitter client
    const twitterClient = initializeTwitterClient();
    
    // Prepare tweet data
    const tweetData: any = { text: message };
    
    // If replying to another tweet, add the reply parameters
    if (replyToTweetId) {
      tweetData.reply = { in_reply_to_tweet_id: replyToTweetId };
    }
    
    // Post the tweet
    const response = await twitterClient.v2.tweet(tweetData);
    
    console.log(`[TWITTER] Posted tweet: ${response.data.id}`);
    // Add the missing fields to satisfy the TweetV2 type
    return {
      ...response.data,
      edit_history_tweet_ids: [response.data.id]
    } as TweetV2;
  } catch (error) {
    console.error('[TWITTER] Error posting tweet:', error);
    return null;
  }
}

/**
 * Post a trade notification tweet
 * Format: @<ownerHandle> [BotName] executed [SIDE] [AMOUNT] [TOKEN] – [STATUS] ([signature])
 */
export async function postTradeNotification(
  botName: string,
  ownerHandle: string,
  action: string,
  inToken: string,
  outToken: string,
  inAmount: string,
  outAmount: string,
  transactionSignature: string,
  explorerUrl: string
): Promise<TweetV2 | null> {
  const message = formatTradeReply(
    botName,
    ownerHandle,
    action,
    inToken,
    outToken,
    inAmount,
    outAmount,
    transactionSignature,
    explorerUrl
  );
  
  return await postTweet(message);
}

/**
 * Reply to a tweet with a trade success message
 */
export async function replyWithTradeSuccess(
  tweetId: string,
  botName: string,
  ownerHandle: string,
  action: string,
  inToken: string,
  outToken: string,
  inAmount: string,
  outAmount: string,
  transactionSignature: string,
  explorerUrl: string,
  success: boolean = true,
  errorMessage?: string
): Promise<TweetV2 | null> {
  try {
    console.log(`[TWITTER] Replying to tweet ${tweetId} with trade ${success ? 'success' : 'failure'} message`);
    
    const message = formatTradeReply(
      botName,
      ownerHandle,
      action,
      inToken,
      outToken,
      inAmount,
      outAmount,
      transactionSignature,
      explorerUrl,
      success,
      errorMessage
    );

    const twitterClient = initializeTwitterClient();
    const response = await twitterClient.v2.tweet({
      text: message,
      reply: {
        in_reply_to_tweet_id: tweetId
      }
    });
    console.log(`[TWITTER] Reply posted successfully: ${response.data.id}`);
    
    return response.data;
  } catch (error) {
    console.error('[TWITTER] Error posting reply:', error);
    return null;
  }
}

/**
 * Reply to a tweet with an error message
 */
export async function replyWithError(
  tweetId: string,
  errorMessage: string
): Promise<TweetV2 | null> {
  const message = formatErrorReply(errorMessage);
  return await postTweet(message, tweetId);
}

/**
 * Format a Twitter reply to a trading command
 */
export function formatTradeReply(
  botName: string,
  ownerHandle: string,
  action: string,
  inToken: string,
  outToken: string,
  inAmount: string,
  outAmount: string,
  transactionSignature: string,
  explorerUrl: string,
  success: boolean,
  errorMessage?: string
): string {
  // Start with mentioning the owner
  let message = `@${ownerHandle} `;
  
  if (success) {
    // Format the transaction signature to be shorter
    const shortSignature = `${transactionSignature.substring(0, 6)}...`;
    
    // Add successful trade details
    if (action === 'buy') {
      message += `✅ Successfully bought ${outAmount} ${outToken} with ${inAmount} ${inToken}`;
    } else if (action === 'sell') {
      message += `✅ Successfully sold ${inAmount} ${inToken} for ${outAmount} ${outToken}`;
    } else {
      message += `✅ Successfully swapped ${inAmount} ${inToken} for ${outAmount} ${outToken}`;
    }
    
    // Add transaction signature and explorer link
    message += `\n\nTransaction: ${shortSignature}\nView on Solana Explorer: ${explorerUrl}`;
  } else {
    // Add failure message
    message += `❌ Trade failed`;
    if (errorMessage) {
      message += `: ${errorMessage}`;
    }
  }
  
  return message;
}

/**
 * Format a Twitter error reply
 */
export function formatErrorReply(errorMessage: string): string {
  return `❌ Trade failed: ${errorMessage}`;
}

/**
 * Format a Twitter insufficient funds reply
 */
export function formatInsufficientFundsReply(
  requiredAmount: number,
  currentBalance: string,
  transactionFee: number
): string {
  return `❌ Insufficient balance. Required: ${requiredAmount + transactionFee} SOL, Current balance: ${currentBalance} SOL`;
}

/**
 * Format a Twitter invalid command reply
 */
export function formatInvalidCommandReply(error: string): string {
  return `❌ Invalid command: ${error}`;
}

/**
 * Check if a particular Twitter API endpoint is rate limited
 */
function isRateLimited(endpoint: TwitterEndpoint): boolean {
  const now = Date.now() / 1000;
  const limitInfo = rateLimitState[endpoint];

  if (limitInfo && limitInfo.isLimited) {
    if (now < limitInfo.reset) {
      const timeRemaining = Math.ceil(limitInfo.reset - now);
      console.log(`[TWITTER] Rate limit for ${endpoint} still active. Resets in ${timeRemaining} seconds`);
      return true;
    }
    rateLimitState[endpoint].isLimited = false;
  }

  return false;
}

/**
 * Update rate limit information for a Twitter API endpoint
 */
function updateRateLimit(endpoint: TwitterEndpoint, reset: number, isLimited: boolean): void {
  rateLimitState[endpoint] = { reset, isLimited };

  if (isLimited) {
    const resetDate = new Date(reset * 1000);
    console.log(`[TWITTER] Rate limit for ${endpoint} reached. Resets at ${resetDate.toISOString()}`);
  }
}

/**
 * Get the latest tweet from a user
 */
export async function getLatestUserTweet(username: string): Promise<TweetV2 | null> {
  try {
    username = username.replace(/^@/, '');
    if (!username.match(/^[A-Za-z0-9_]{1,15}$/)) {
      console.log(`[TWITTER] Invalid username format: ${username}`);
      return null;
    }

    const cacheKey = `twitter_latest_${username}`;

    // Check tweet cache
    const cachedData = tweetCache[cacheKey];
    if (cachedData && (Date.now() - cachedData.timestamp) < TWEET_CACHE_TTL) {
      console.log(`[TWITTER] Using cached tweet for ${username}`);
      return cachedData.tweet;
    }

    // Check rate limits
    if (isRateLimited('userTimeline')) {
      const limitInfo = rateLimitState['userTimeline'];
      const resetTime = new Date(limitInfo.reset * 1000).toLocaleString();
      throw new Error(`Rate limited until ${resetTime}`);
    }

    const twitterClient = getRestClient();

    // Get user ID (from cache or API)
    let userId = userIdCache[username];
    if (!userId) {
      if (isRateLimited('userLookup')) {
        throw new Error('Rate limited for user lookups');
      }

      const userResponse = await twitterClient.v2.userByUsername(username, {
        "user.fields": ["id"]
      });

      if (userResponse.rateLimit && userResponse.rateLimit.remaining <= 1) {
        updateRateLimit('userLookup', userResponse.rateLimit.reset, true);
      }

      if (!userResponse.data) {
        console.log(`[TWITTER] User not found: ${username}`);
        return null;
      }

      userId = userResponse.data.id;
      userIdCache[username] = userId;
    }

    // Fetch latest tweet
    const timeline = await twitterClient.v2.userTimeline(userId, {
      max_results: 5,
      exclude: ['replies', 'retweets'],
      'tweet.fields': ['created_at', 'text']
    });

    if (timeline.rateLimit && timeline.rateLimit.remaining <= 1) {
      updateRateLimit('userTimeline', timeline.rateLimit.reset, true);
    }

    if (!timeline.data?.data?.length) {
      console.log(`[TWITTER] No tweets found for user: ${username}`);
      return null;
    }

    const latestTweet = timeline.data.data[0];

    // Update cache
    tweetCache[cacheKey] = {
      tweet: latestTweet,
      timestamp: Date.now()
    };

    return latestTweet;
  } catch (error: any) {
    console.error('[TWITTER] Error fetching latest tweet:', error);

    if (error.code === 429) {
      const resetTime = error.rateLimit?.reset || Math.floor(Date.now()/1000) + 900;
      updateRateLimit('userTimeline', resetTime, true);
    }

    throw error;
  }
}

/**
 * Reset all Twitter rate limits (for testing purposes)
 */
export function resetRateLimits() {
  for (const key in rateLimitState) {
    rateLimitState[key] = { reset: 0, isLimited: false };
  }
  console.log(`[TWITTER] Rate limits reset for all endpoints`);
}

/**
 * Handle Twitter API errors, specifically checking for rate limiting
 * @param error The error from the Twitter API
 * @param endpoint The API endpoint that was called
 */
function handleTwitterError(error: any, endpoint: string): void {
  console.error(`[TWITTER] Error calling ${endpoint}:`, error);
  
  // Check if this is a rate limit error
  if (error.code === 429 && error.rateLimit) {
    updateRateLimit(endpoint as TwitterEndpoint, error.rateLimit.reset, true);
  }
}

/**
 * Get mentions of a bot using the Recent Search endpoint
 * This uses the more rate-limit friendly search/recent endpoint (450 requests/15min window)
 * 
 * @param botTwitterUsername The Twitter username to check for mentions
 * @param sinceId Optional tweet ID to get only tweets newer than this ID
 * @returns Array of tweets mentioning the bot
 */
export async function getMentions(botTwitterUsername: string, sinceId?: string): Promise<TweetV2[]> {
  try {
    console.log(`[TWITTER-DEBUG] getMentions called for @${botTwitterUsername} (sinceId: ${sinceId || 'none'})`);
    
    // Check if we're rate limited for search_recent
    if (isRateLimited('search_recent')) {
      console.log('[TWITTER-DEBUG] Rate limited for search_recent, returning empty array');
      return [];
    }
    
    // Use REST client for fetching mentions
    const twitterClient = getRestClient();
    
    // Prepare query string - look for mentions of the bot
    // Format: "@botname" -from:botname  (to find mentions but exclude the bot's own tweets)
    const queryString = `@${botTwitterUsername} -from:${botTwitterUsername}`;
    
    // Prepare query parameters
    const queryParams: any = {
      max_results: 10, // A smaller value is more efficient for polling
      "tweet.fields": ["created_at", "author_id", "conversation_id"],
      "user.fields": ["username"],
      expansions: ["author_id"]
    };
    
    // If sinceId is provided, only get tweets after that ID
    if (sinceId) {
      queryParams.since_id = sinceId;
    }
    
    try {
      console.log(`[TWITTER-DEBUG] Using recent search for tweets mentioning @${botTwitterUsername} with query: ${queryString}`);
      
      // Use the search endpoint with recent search type
      // This endpoint has a higher rate limit (450 requests/15min)
      const mentions = await twitterClient.v2.search(queryString, queryParams);
      
      // If the API returns rate limit info, check and store it
      if (mentions.rateLimit) {
        const remainingSeconds = mentions.rateLimit.reset - Math.floor(Date.now()/1000);
        console.log(`[TWITTER-DEBUG] Rate limit info: ${mentions.rateLimit.limit}/${mentions.rateLimit.remaining} (resets in ${remainingSeconds} seconds)`);
        
        // Check if we're close to hitting the rate limit
        if (mentions.rateLimit.remaining <= 5) {
          updateRateLimit('search_recent', mentions.rateLimit.reset, true);
        }
      }
      
      // Log results
      if (mentions.data && mentions.data.data) {
        console.log(`[TWITTER-DEBUG] Found ${mentions.data.data.length} tweets mentioning @${botTwitterUsername}`);
      } else {
        console.log(`[TWITTER-DEBUG] No tweets found mentioning @${botTwitterUsername}`);
      }
      
      // Return the data array or empty array if no mentions
      return mentions.data.data || [];
    } catch (error: any) {
      console.error(`[TWITTER-DEBUG] Error searching for tweets mentioning @${botTwitterUsername}:`, error);
      handleTwitterError(error, 'search_recent');
      return [];
    }
  } catch (error) {
    console.error('[TWITTER-DEBUG] Error getting mentions:', error);
    return [];
  }
}