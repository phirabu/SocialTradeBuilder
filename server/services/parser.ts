import { ParsedCommand } from "@shared/schema";

// Regular expression patterns for command components
const ACTION_PATTERN = /\b(buy|sell|swap)\b/i;
const AMOUNT_PATTERN = /\b(\d+(?:\.\d+)?)\b/;
// Define connecting words
const CONNECTING_WORDS = /\b(of|for|to|with)\b/i;
// Define valid tokens
const SUPPORTED_TOKENS = ['SOL', 'USDC', 'JUP'];
// Regex pattern to match only the specified tokens
const TOKEN_PATTERN = new RegExp('\\b(' + SUPPORTED_TOKENS.join('|') + ')\\b', 'gi');

/**
 * Parse a tweet text command into a structured trading command
 * 
 * Example: "@TradeBot buy 0.1 sol of jup"
 * Returns: { action: "buy", inToken: "SOL", outToken: "JUP", amount: 0.1 }
 */
export function parseCommand(text: string, botName: string): ParsedCommand | null {
  try {
    console.log(`[PARSER] Parsing command: "${text}" for bot: @${botName}`);
    
    // Remove the bot mention and trim whitespace
    // Using case-insensitive match with 'i' flag
    const normalizedText = text.replace(new RegExp(`@${botName}`, 'i'), '').trim();
    console.log(`[PARSER] Normalized text: "${normalizedText}"`);
    
    // Extract action (buy, sell, swap)
    const actionMatch = normalizedText.match(ACTION_PATTERN);
    if (!actionMatch) return null;
    const action = actionMatch[0].toLowerCase();
    
    // Extract amount
    const amountMatch = normalizedText.match(AMOUNT_PATTERN);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[0]);
    
    // Extract tokens
    const tokenMatches = Array.from(normalizedText.matchAll(TOKEN_PATTERN));
    console.log(`[PARSER] Found ${tokenMatches.length} token matches:`, tokenMatches.map(m => m[0]));
    
    if (tokenMatches.length < 2) {
      console.log(`[PARSER] Not enough tokens found (need at least 2, found ${tokenMatches.length})`);
      return null;
    }
    
    // Determine token order based on action and position in command
    let inToken: string;
    let outToken: string;
    
    // Reset the regex lastIndex
    TOKEN_PATTERN.lastIndex = 0;
    
    if (action === 'buy') {
      // For "buy", if we have "of" or "in", the pattern is "[amount] [inToken] of [outToken]"
      const connectingWordMatch = normalizedText.match(CONNECTING_WORDS);
      
      if (connectingWordMatch) {
        const wordPosition = connectingWordMatch.index || 0;
        
        // Find tokens before and after the connecting word
        let beforeTokens: string[] = [];
        let afterTokens: string[] = [];
        
        tokenMatches.forEach(match => {
          const matchIndex = match.index || 0;
          if (matchIndex < wordPosition) {
            beforeTokens.push(match[0].toUpperCase());
          } else {
            afterTokens.push(match[0].toUpperCase());
          }
        });
        
        if (beforeTokens.length > 0 && afterTokens.length > 0) {
          inToken = beforeTokens[0];
          outToken = afterTokens[0];
        } else {
          // Default to first two tokens if positioning is unclear
          inToken = tokenMatches[0][0].toUpperCase();
          outToken = tokenMatches[1][0].toUpperCase();
        }
      } else {
        // If no connecting word, assume the second token is what we're buying
        inToken = tokenMatches[0][0].toUpperCase();
        outToken = tokenMatches[1][0].toUpperCase();
      }
    } else if (action === 'sell') {
      // For "sell", typically "sell [amount] [outToken] for [inToken]"
      inToken = tokenMatches[1][0].toUpperCase();
      outToken = tokenMatches[0][0].toUpperCase();
    } else if (action === 'swap') {
      // Special handling for swap - we need to find tokens around the connecting word "for"
      // Example: "swap 0.01 SOL for USDC"
      const forMatch = normalizedText.match(/\bfor\b/i);
      
      if (forMatch && forMatch.index) {
        // For "swap" with explicit "for", the token before "for" is the source token
        // and the token after "for" is the destination token
        
        console.log(`[PARSER] Found 'for' connecting word at position ${forMatch.index}`);
        
        const textBeforeFor = normalizedText.substring(0, forMatch.index);
        const textAfterFor = normalizedText.substring(forMatch.index + 3); // 'for'.length = 3
        
        console.log(`[PARSER] Text before 'for': "${textBeforeFor}"`);
        console.log(`[PARSER] Text after 'for': "${textAfterFor}"`);
        
        // Find a token in the text before "for"
        const beforeTokenMatches = Array.from(textBeforeFor.matchAll(TOKEN_PATTERN));
        
        // Find a token in the text after "for"
        TOKEN_PATTERN.lastIndex = 0;
        const afterTokenMatches = Array.from(textAfterFor.matchAll(TOKEN_PATTERN));
        
        console.log(`[PARSER] Tokens before 'for':`, beforeTokenMatches.map(m => m[0]));
        console.log(`[PARSER] Tokens after 'for':`, afterTokenMatches.map(m => m[0]));
        
        if (beforeTokenMatches.length > 0 && afterTokenMatches.length > 0) {
          // We found tokens on both sides of "for"
          inToken = beforeTokenMatches[beforeTokenMatches.length - 1][0].toUpperCase();
          outToken = afterTokenMatches[0][0].toUpperCase();
          console.log(`[PARSER] Found swap with explicit 'for': ${inToken} -> ${outToken}`);
        } else {
          // Default to using the first two tokens
          inToken = tokenMatches[0][0].toUpperCase();
          outToken = tokenMatches[1][0].toUpperCase();
          console.log(`[PARSER] Defaulting to first two tokens: ${inToken} -> ${outToken}`);
        }
      } else {
        // Simple "swap [amount] [inToken] [outToken]" format without "for"
        inToken = tokenMatches[0][0].toUpperCase();
        outToken = tokenMatches[1][0].toUpperCase();
        console.log(`[PARSER] Simple swap format: ${inToken} -> ${outToken}`);
      }
    } else {
      // Fallback for any other unrecognized action
      inToken = tokenMatches[0][0].toUpperCase();
      outToken = tokenMatches[1][0].toUpperCase();
    }
    
    const result = {
      action,
      inToken,
      outToken,
      amount
    };
    
    console.log(`[PARSER] Parsed command:`, result);
    return result;
  } catch (error) {
    console.error("Command parsing error:", error);
    return null;
  }
}

/**
 * Validate a parsed command against a list of supported actions and tokens
 */
export function validateCommand(
  parsedCommand: ParsedCommand, 
  supportedActions: string[], 
  supportedTokens: Array<{symbol: string} | string>
): { valid: boolean; error?: string } {
  console.log(`[PARSER] Validating command:`, parsedCommand);
  console.log(`[PARSER] Supported actions:`, supportedActions);
  
  // Handle both string and object token formats
  const tokenSymbols = supportedTokens.map(t => {
    if (typeof t === 'string') return t;
    return t.symbol;
  });
  console.log(`[PARSER] Supported tokens:`, tokenSymbols);
  
  if (!parsedCommand) {
    console.log(`[PARSER] Validation failed: No parsed command`);
    return { valid: false, error: "Invalid command format" };
  }
  
  // Check if action is supported
  if (!supportedActions.includes(parsedCommand.action)) {
    const error = `Unsupported action "${parsedCommand.action}". Supported actions: ${supportedActions.join(', ')}`;
    console.log(`[PARSER] Validation failed: ${error}`);
    return { valid: false, error };
  }
  
  // Check if tokens are supported - handle both object format and string format
  const supportedTokenSymbols = supportedTokens.map(token => {
    if (typeof token === 'string') return token;
    return token.symbol;
  });
  
  console.log(`[PARSER] Supported token symbols:`, supportedTokenSymbols);
  
  if (!supportedTokenSymbols.includes(parsedCommand.inToken)) {
    const error = `Unsupported token "${parsedCommand.inToken}". Supported tokens: ${supportedTokenSymbols.join(', ')}`;
    console.log(`[PARSER] Validation failed: ${error}`);
    return { valid: false, error };
  }
  
  if (!supportedTokenSymbols.includes(parsedCommand.outToken)) {
    const error = `Unsupported token "${parsedCommand.outToken}". Supported tokens: ${supportedTokenSymbols.join(', ')}`;
    console.log(`[PARSER] Validation failed: ${error}`);
    return { valid: false, error };
  }
  
  // Check if amount is valid
  if (parsedCommand.amount <= 0) {
    const error = "Amount must be greater than 0";
    console.log(`[PARSER] Validation failed: ${error}`);
    return { valid: false, error };
  }
  
  console.log(`[PARSER] Validation successful: Command is valid`);
  return { valid: true };
}
