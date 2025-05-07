import * as web3 from '@solana/web3.js';
import CryptoJS from 'crypto-js';

// Use Solana Devnet
const SOLANA_CLUSTER = 'devnet';
const SOLANA_ENDPOINT = 'https://api.devnet.solana.com';

// Get encryption key from environment or use a fallback for development
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'development_encryption_key';

// Initialize connection to Solana
const connection = new web3.Connection(SOLANA_ENDPOINT, 'confirmed');

/**
 * Create a new Solana wallet (keypair)
 * Returns the public key (base58 encoded) and secret key (array format for easy storage)
 */
export function createWallet(): { publicKey: string; privateKey: string; secretKey: number[] } {
  const keypair = web3.Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  // Store private key as hex string for backward compatibility
  const privateKey = Buffer.from(keypair.secretKey).toString('hex');
  // Also provide the secretKey as array for easy use with Solana libraries
  const secretKey = Array.from(keypair.secretKey);
  
  return {
    publicKey,
    privateKey,
    secretKey,
  };
}

/**
 * Encrypt a private key for storage
 */
export function encryptPrivateKey(privateKey: string): string {
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt a stored private key
 */
export function decryptPrivateKey(encryptedPrivateKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Get wallet balance in SOL
 */
export async function getWalletBalance(publicKey: string): Promise<string> {
  try {
    console.log(`[DEBUG] Getting wallet balance for ${publicKey}`);
    const pubKey = new web3.PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    
    // Convert lamports to SOL with proper precision (6 decimal places)
    const solBalance = (balance / web3.LAMPORTS_PER_SOL).toFixed(6);
    console.log(`[DEBUG] Wallet ${publicKey} balance: ${solBalance} SOL (${balance} lamports)`);
    
    return solBalance;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new Error('Failed to get wallet balance');
  }
}

/**
 * Convert a Solana transaction from base64 to a Transaction object
 */
export function deserializeTransaction(serializedTransaction: string): web3.Transaction {
  const buffer = Buffer.from(serializedTransaction, 'base64');
  return web3.Transaction.from(buffer);
}

/**
 * Sign and send a transaction
 */
export async function signAndSendTransaction(
  serializedTransaction: string,
  encryptedPrivateKey: string
): Promise<string> {
  try {
    // Deserialize the transaction
    const transaction = deserializeTransaction(serializedTransaction);
    
    // Decrypt the private key
    const privateKeyHex = decryptPrivateKey(encryptedPrivateKey);
    const secretKey = Buffer.from(privateKeyHex, 'hex');
    
    // Create keypair from secret key
    const keypair = web3.Keypair.fromSecretKey(secretKey);
    
    // Sign the transaction
    transaction.sign(keypair);
    
    // Send the transaction
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair]
    );
    
    return signature;
  } catch (error) {
    console.error('Error signing and sending transaction:', error);
    throw new Error('Failed to send transaction');
  }
}

/**
 * Request SOL from Devnet faucet
 * Attempts to get a smaller amount (0.1 SOL) if larger amounts fail due to faucet limits
 * Returns object with { success, signature, error } so callers can handle failures gracefully
 */
export async function requestAirdrop(publicKey: string, amount: number = 0.1): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const pubKey = new web3.PublicKey(publicKey);
    
    // Use a very small amount (0.01 SOL) as a safeguard
    const safeAmount = 0.01; 
    
    // Try to request the specified amount (never more than 0.1 SOL for devnet)
    const requestAmount = Math.min(amount, 0.1);
    
    try {
      console.log(`Requesting airdrop of ${requestAmount} SOL to ${publicKey}`);
      const signature = await connection.requestAirdrop(
        pubKey,
        requestAmount * web3.LAMPORTS_PER_SOL
      );
      
      // Wait for confirmation with specific commitment
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature
      });
      
      console.log(`Airdrop successful: ${requestAmount} SOL to ${publicKey}`);
      return { 
        success: true, 
        signature 
      };
    } catch (airDropError) {
      console.warn(`Initial airdrop of ${requestAmount} SOL failed, trying smaller amount...`, airDropError);
      
      // Try an even smaller amount as a last resort
      try {
        console.log(`Trying minimal airdrop of ${safeAmount} SOL to ${publicKey}`);
        const signature = await connection.requestAirdrop(
          pubKey,
          safeAmount * web3.LAMPORTS_PER_SOL
        );
        
        // Wait for confirmation
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature
        });
        
        console.log(`Minimal airdrop successful: ${safeAmount} SOL to ${publicKey}`);
        return { 
          success: true, 
          signature 
        };
      } catch (smallAirDropError) {
        // Both attempts failed, return a graceful error
        const errorMessage = smallAirDropError instanceof Error ? smallAirDropError.message : String(smallAirDropError);
        console.error('Both airdrop attempts failed:', errorMessage);
        
        return { 
          success: false, 
          error: `Devnet faucet rate limited or out of funds. Please use https://faucet.solana.com to manually fund the wallet: ${publicKey}`
        };
      }
    }
  } catch (error) {
    console.error('Error requesting airdrop:', error);
    
    // Handle any other unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      error: `Failed to request SOL from faucet: ${errorMessage}`
    };
  }
}

/**
 * Check if a transaction is confirmed
 */
export async function checkTransactionConfirmation(signature: string): Promise<boolean> {
  try {
    const status = await connection.getSignatureStatus(signature);
    return status.value?.confirmationStatus === 'confirmed' || 
           status.value?.confirmationStatus === 'finalized';
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return false;
  }
}

/**
 * Get Solana Explorer URL for a transaction
 */
export function getTransactionExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}

/**
 * Validate if a wallet has sufficient funds for a transaction
 */
export async function validateWalletFunds(publicKey: string, requiredAmount: number, transactionFee: number = 0.01): Promise<boolean> {
  try {
    const balance = await getWalletBalance(publicKey);
    const totalRequired = requiredAmount + transactionFee;
    return parseFloat(balance) >= totalRequired;
  } catch (error) {
    console.error('Error validating wallet funds:', error);
    return false;
  }
}

/**
 * Generate a QR code data URL for a Solana wallet address
 * Returns a data URL that can be used in an <img> tag
 */
export function generateWalletQRData(publicKey: string): string {
  // Return a fully-formed QR code URL that can be used in an <img> tag
  // This uses an online QR code generator service for simplicity
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${publicKey}`;
}

/**
 * Get Solana Explorer URL for a wallet address
 */
export function getWalletExplorerUrl(publicKey: string): string {
  return `https://explorer.solana.com/address/${publicKey}?cluster=${SOLANA_CLUSTER}`;
}

/**
 * Get transaction history for a wallet
 * Returns a list of recent transactions, including swap transactions
 */
export async function getTransactionHistory(publicKey: string, limit: number = 10): Promise<any[]> {
  try {
    const pubKey = new web3.PublicKey(publicKey);
    
    // Fetch the database trades for this wallet first
    const { storage } = await import('../storage');
    
    // First find which bot owns this wallet to get all trades
    const bots = await storage.listBots();
    let botId = null;
    
    for (const bot of bots) {
      const wallet = await storage.getWalletByBotId(bot.id);
      if (wallet && wallet.publicKey === publicKey) {
        botId = bot.id;
        break;
      }
    }
    
    if (!botId) {
      console.log(`No bot found for wallet ${publicKey}, fetching only on-chain transactions`);
    }
    
    // Get all trades for this bot (if found)
    let botTrades = [];
    if (botId) {
      botTrades = await storage.getTradesByBotId(botId);
      console.log(`Found ${botTrades.length} trades for bot ID ${botId}`);
    }
    
    // Get all recent trades as a fallback
    const allTrades = botTrades.length > 0 ? botTrades : await storage.getRecentTrades(100);
    
    // Create a map of signatures to trade data for quick lookup
    const tradeMap = new Map();
    allTrades.forEach(trade => {
      // Map database fields to camelCase for consistent access
      const mappedTrade = {
        id: trade.id,
        botId: trade.botId,
        action: trade.action,
        inToken: trade.inToken,
        outToken: trade.outToken,
        amount: trade.amount,
        inAmount: trade.inAmount,
        outAmount: trade.outAmount,
        status: trade.status,
        transactionSignature: trade.transactionSignature,
        errorMessage: trade.errorMessage,
        tweetId: trade.tweetId, 
        tweetText: trade.tweetText,
        createdAt: trade.createdAt,
        updatedAt: trade.createdAt // use createdAt as fallback
      };
      
      if (mappedTrade.transactionSignature) {
        tradeMap.set(mappedTrade.transactionSignature, mappedTrade);
        console.log(`Added transaction signature to map: ${mappedTrade.transactionSignature}`);
      }
    });
    
    // Create a list to store all transactions, including simulated ones
    let allTransactions = [];
    
    console.log(`DEBUGGING TRADES: Found ${allTrades.length} total trades`);
    
    // Add all Twitter-based trades from the database as simulated transactions first
    allTrades.forEach(trade => {
      // Create properly mapped object from trade record (to handle camelCase vs snake_case)
      const mappedTrade = {
        id: trade.id,
        botId: trade.botId,
        action: trade.action,
        inToken: trade.inToken,
        outToken: trade.outToken,
        amount: trade.amount,
        inAmount: trade.inAmount,
        outAmount: trade.outAmount,
        status: trade.status,
        transactionSignature: trade.transactionSignature,
        errorMessage: trade.errorMessage,
        tweetId: trade.tweetId, 
        tweetText: trade.tweetText,
        createdAt: trade.createdAt,
        updatedAt: trade.createdAt // use createdAt as fallback
      };
      
      // Check if this was a Twitter-initiated trade by looking for tweet_id
      const isTwitterTrade = mappedTrade.tweetId !== null && mappedTrade.tweetId !== undefined;
      
      // Add any Twitter trades or completed transactions 
      if (isTwitterTrade || mappedTrade.status === 'completed' || mappedTrade.status === 'failed') {
        if (botId === null || mappedTrade.botId === botId) {
          console.log(`DEBUGGING TRADE: Adding trade ${mappedTrade.id} to history:`, 
                      JSON.stringify({
                        isTwitterTrade,
                        status: mappedTrade.status, 
                        tweetId: mappedTrade.tweetId,
                        botId: mappedTrade.botId,
                        targetBotId: botId
                      }));
          
          const signature = mappedTrade.transactionSignature || `simulated_${mappedTrade.id}_${Date.now()}`;
          
          // For simulated transactions (or any Twitter command trade)
          const simulatedTransaction = {
            signature: signature,
            timestamp: mappedTrade.updatedAt || mappedTrade.createdAt,
            type: mappedTrade.action,
            status: mappedTrade.status,
            fromToken: mappedTrade.inToken,
            toToken: mappedTrade.outToken,
            fromAmount: mappedTrade.inAmount || mappedTrade.amount,
            toAmount: mappedTrade.outAmount || (mappedTrade.status === 'completed' ? 
                      (parseFloat(mappedTrade.amount) * 2).toString() : "0"), // Simulate 2x return for completed trades
            fee: "0.000005",
            memo: mappedTrade.tweetText ? `Twitter Command: ${mappedTrade.tweetText}` : "Token Swap",
            explorerUrl: mappedTrade.transactionSignature ? 
                        getTransactionExplorerUrl(mappedTrade.transactionSignature) : 
                        "#simulated" 
          };
          
          allTransactions.push(simulatedTransaction);
        }
      }
    });
    
    // Get signatures for transactions involving this wallet
    let signatures = [];
    try {
      signatures = await connection.getSignaturesForAddress(pubKey, { limit });
      console.log(`Found ${signatures.length} on-chain transactions for wallet ${publicKey}`);
    } catch (error) {
      console.error(`Error getting signatures for wallet ${publicKey}:`, error);
      // Continue with just the simulated transactions if on-chain query fails
    }
    
    if (signatures.length === 0 && allTransactions.length > 0) {
      console.log(`No on-chain transactions found, but returning ${allTransactions.length} simulated transactions`);
      // Sort by timestamp and return the simulated transactions
      return allTransactions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    }
    
    // Fetch detailed transaction data
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        try {
          // Get transaction details
          const txData = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (!txData) {
            return null;
          }
          
          // Check if this is a known swap transaction from our database
          const trade = tradeMap.get(sig.signature);
          if (trade) {
            // This is a swap transaction
            return {
              signature: sig.signature,
              timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : new Date(trade.createdAt).toISOString(),
              type: trade.action,
              status: trade.status,
              fromToken: trade.inToken,
              toToken: trade.outToken,
              fromAmount: trade.inAmount,
              toAmount: trade.outAmount,
              fee: ((txData.meta?.fee || 0) / web3.LAMPORTS_PER_SOL).toFixed(6),
              memo: "Token Swap",
              explorerUrl: getTransactionExplorerUrl(sig.signature)
            };
          }
          
          // Try to identify if this is a simple transfer or a memo transaction
          let memo = "";
          try {
            // Check for memo program instructions in regular Transaction message
            let memoIx;
            if ('instructions' in txData.transaction.message) {
              memoIx = txData.transaction.message.instructions.find((ix: any) => 
                ix.programId?.toString() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
              );
            } else if (txData.meta && txData.meta.logMessages) {
              // Try to identify memo from log messages
              const memoLog = txData.meta.logMessages.find((log: string) => 
                log.includes("Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
              );
              if (memoLog) {
                memo = "Memo Transaction";
              }
            }
            
            if (memoIx) {
              // Decode the memo data
              const dataString = Buffer.from(memoIx.data, 'base64').toString('utf8');
              memo = dataString;
              
              // Check if this contains our swap memo pattern
              if (dataString.includes("Simulated Swap:")) {
                const parts = dataString.split(':')[1].trim().split(' ');
                if (parts.length >= 4) {
                  const fromToken = parts[0];
                  const toToken = parts[3];
                  const amount = parseFloat(parts[1]);
                  
                  return {
                    signature: sig.signature,
                    timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : new Date().toISOString(),
                    type: 'swap',
                    status: 'completed',
                    fromToken,
                    toToken,
                    fromAmount: amount.toFixed(6),
                    toAmount: (amount * (fromToken === 'SOL' ? 160 : 0.00625)).toFixed(6),
                    fee: ((txData.meta?.fee || 0) / web3.LAMPORTS_PER_SOL).toFixed(6),
                    memo,
                    explorerUrl: getTransactionExplorerUrl(sig.signature)
                  };
                }
              }
            }
          } catch (e) {
            console.error("Error parsing transaction memo:", e);
          }
          
          // Determine transaction type for regular transfers
          const isIncoming = txData.meta?.postBalances[0] > txData.meta?.preBalances[0];
          const type = isIncoming ? 'receive' : 'send';
          
          // Calculate amount (change in SOL)
          const preBalance = txData.meta?.preBalances[0] || 0;
          const postBalance = txData.meta?.postBalances[0] || 0;
          const changeInLamports = Math.abs(postBalance - preBalance);
          const changeInSol = changeInLamports / web3.LAMPORTS_PER_SOL;
          
          return {
            signature: sig.signature,
            timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : new Date().toISOString(),
            type,
            status: 'completed',
            fromToken: 'SOL',
            toToken: 'SOL',
            fromAmount: changeInSol.toFixed(6),
            toAmount: changeInSol.toFixed(6),
            fee: ((txData.meta?.fee || 0) / web3.LAMPORTS_PER_SOL).toFixed(6),
            memo: memo || "Transfer",
            explorerUrl: getTransactionExplorerUrl(sig.signature)
          };
        } catch (error) {
          console.error(`Error fetching transaction ${sig.signature}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed transaction requests
    const validTransactions = transactions.filter(tx => tx !== null);
    
    // Combine blockchain transactions with our simulated transactions
    const allCombinedTransactions = [...validTransactions, ...allTransactions];
    
    // This will include both actual blockchain transactions and simulated ones from Twitter
    console.log(`Returning ${allCombinedTransactions.length} total transactions (${validTransactions.length} on-chain, ${allTransactions.length} simulated)`);
    
    // Sort by timestamp (newest first)
    return allCombinedTransactions.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}
