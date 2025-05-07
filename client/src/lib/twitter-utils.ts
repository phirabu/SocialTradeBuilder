/**
 * Format a Twitter URL for a specific tweet
 * @param tweetId The ID of the tweet
 * @returns The URL to view the tweet
 */
export function formatTweetUrl(tweetId: string): string {
  return `https://twitter.com/i/web/status/${tweetId}`;
}

/**
 * Format a Twitter URL for a user profile
 * @param username The Twitter username (without @)
 * @returns The URL to view the user's profile
 */
export function formatTwitterProfileUrl(username: string): string {
  return `https://twitter.com/${username}`;
}

/**
 * Generate a Twitter intent URL to post a tweet mentioning a user
 * @param username The Twitter username to mention (without @)
 * @param text Optional text to pre-fill in the tweet
 * @returns The URL to open the Twitter compose window
 */
export function generateTweetIntent(username: string, text?: string): string {
  const baseText = `@${username} `;
  const fullText = text ? baseText + text : baseText;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
}

/**
 * Generate a Twitter intent URL to post a trade command
 * @param username The Twitter username to mention (without @)
 * @param action The trade action (buy, sell, swap)
 * @param amount The amount to trade
 * @param inToken The input token symbol
 * @param outToken The output token symbol
 * @returns The URL to open the Twitter compose window
 */
export function generateTradeCommandIntent(
  username: string,
  action: string,
  amount: string,
  inToken: string,
  outToken: string
): string {
  const text = `@${username} ${action} ${amount} ${inToken} of ${outToken}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/**
 * Extract the username and command from a tweet text
 * @param tweetText The text of the tweet
 * @returns An object with the mentioned username and the command text
 */
export function parseTweetText(tweetText: string): { mentionedUser: string | null; command: string } {
  // Extract mentioned username
  const mentionMatch = tweetText.match(/@([A-Za-z0-9_]+)/);
  const mentionedUser = mentionMatch ? mentionMatch[1] : null;
  
  // Extract command (everything after the username mention)
  let command = '';
  if (mentionedUser) {
    command = tweetText.replace(`@${mentionedUser}`, '').trim();
  } else {
    command = tweetText.trim();
  }
  
  return { mentionedUser, command };
}