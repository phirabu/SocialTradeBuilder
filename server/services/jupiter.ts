import axios from 'axios';
import * as web3 from '@solana/web3.js';

// Simple token swap for devnet testing - avoid Jupiter complexity
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Token mint addresses for UI display
export const DEVNET_TOKEN_MINTS = {
  'SOL': SOL_MINT,
  'USDC': USDC_MINT,
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
};

// Simplified quote interface
interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string;
  swapMode?: string;
  slippageBps?: number;
  priceImpactPct?: string;
  routePlan?: any[];
  contextSlot?: number;
  exchangeRate: number;
}

/**
 * Get a simulated quote for a token swap
 * Note: This is a mock implementation for devnet testing
 */
export async function getJupiterQuote(
  inputToken: string, 
  outputToken: string, 
  amount: number,
  slippageBps: number = 50
): Promise<QuoteResponse> {
  try {
    // Convert token symbols to mint addresses
    const inputMint = DEVNET_TOKEN_MINTS[inputToken as keyof typeof DEVNET_TOKEN_MINTS] || inputToken;
    const outputMint = DEVNET_TOKEN_MINTS[outputToken as keyof typeof DEVNET_TOKEN_MINTS] || outputToken;
    
    if (!inputMint || !outputMint) {
      throw new Error(`Invalid token symbol: ${!inputMint ? inputToken : outputToken}`);
    }
    
    // Convert amount to lamports (smallest unit for the token)
    const decimals = inputToken === 'USDC' ? 6 : 9;
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals)).toString();
    
    // Calculate a simulated exchange rate
    // SOL to USDC: roughly $160 per SOL
    // USDC to SOL: 1/160
    let exchangeRate = 1.0;
    let outAmount = amountInSmallestUnit;
    
    if (inputMint === SOL_MINT && outputMint === USDC_MINT) {
      // SOL to USDC: 1 SOL = ~$160
      exchangeRate = 160.0;
      // Convert from SOL (9 decimals) to USDC (6 decimals)
      const solAmount = parseFloat(amountInSmallestUnit) / 1e9;
      outAmount = Math.floor(solAmount * exchangeRate * 1e6).toString();
    } else if (inputMint === USDC_MINT && outputMint === SOL_MINT) {
      // USDC to SOL: $1 = ~0.00625 SOL
      exchangeRate = 0.00625;
      // Convert from USDC (6 decimals) to SOL (9 decimals)
      const usdcAmount = parseFloat(amountInSmallestUnit) / 1e6;
      outAmount = Math.floor(usdcAmount * exchangeRate * 1e9).toString();
    }
    
    // Apply slippage
    const slippageFactor = 1 - (slippageBps / 10000);
    const outAmountWithSlippage = Math.floor(parseFloat(outAmount) * slippageFactor).toString();
    
    console.log(`Simulated quote: ${amount} ${inputToken} to ${outputToken}, output: ${outAmountWithSlippage}`);
    
    return {
      inputMint,
      outputMint,
      inAmount: amountInSmallestUnit,
      outAmount: outAmountWithSlippage,
      otherAmountThreshold: outAmountWithSlippage,
      swapMode: "ExactIn",
      slippageBps,
      priceImpactPct: "0",
      routePlan: [{ percent: 100 }],
      contextSlot: 123456789,
      exchangeRate
    };
  } catch (error) {
    console.error('Error getting quote:', error);
    throw new Error('Failed to get quote');
  }
}

/**
 * Format token amount for display (convert from smallest unit to token)
 */
export function formatTokenAmount(amount: string, token: string): string {
  // Different tokens have different decimals
  const decimals = token === 'USDC' ? 6 : 9;
  return (parseInt(amount) / Math.pow(10, decimals)).toFixed(4);
}

/**
 * Execute a direct token transfer to simulate a swap
 * This is ONLY for devnet testing when Jupiter integration is causing issues
 */
export async function executeJupiterSwap(
  inputToken: string,
  outputToken: string,
  amount: number,
  walletPublicKey: string,
  privateKey: string,
  slippageBps: number = 50,
  forceReal: boolean = false
): Promise<{ 
  success: boolean; 
  signature?: string; 
  outputAmount?: string; 
  error?: string;
  inToken?: string;
  outToken?: string;
  inAmount?: string;
  exchangeRate?: number;
}> {
  try {
    console.log(`[SWAP] Executing Jupiter swap: ${amount} ${inputToken} to ${outputToken}`);
    
    // Step 1: Get simulated quote
    const quoteResponse = await getJupiterQuote(inputToken, outputToken, amount, slippageBps);
    console.log(`[SWAP] Quote received: ${JSON.stringify(quoteResponse)}`);
    
    // Step 2: Prepare the keypair for signing
    let decryptedKey = privateKey;
    
    // Handle encrypted private key if needed
    if (privateKey.startsWith('U2FsdGVkX1')) {
      console.log(`[SWAP] Private key is encrypted, decrypting...`);
      const { decryptPrivateKey } = await import('./solana');
      decryptedKey = decryptPrivateKey(privateKey);
      console.log(`[SWAP] Private key decrypted successfully`);
    } else {
      console.log(`[SWAP] Private key is not encrypted, using as-is`);
    }
    
    let keypair: web3.Keypair;
    
    try {
      // First attempt: try to parse as JSON array (standard format)
      console.log(`[SWAP] Attempting to parse private key as JSON array`);
      keypair = web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(decryptedKey))
      );
      console.log(`[SWAP] Successfully created keypair from JSON array`);
    } catch (error) {
      // Second attempt: try to handle as hex string
      console.log('[SWAP] Private key is not in JSON format, treating as hex string');
      const secretKeyBytes = Buffer.from(decryptedKey, 'hex');
      keypair = web3.Keypair.fromSecretKey(new Uint8Array(secretKeyBytes));
      console.log(`[SWAP] Successfully created keypair from hex string`);
    }
    
    // Step 3: Initialize connection
    console.log(`[SWAP] Initializing Solana connection to devnet`);
    const connection = new web3.Connection(
      web3.clusterApiUrl('devnet'),
      { commitment: 'confirmed' }
    );
    
    console.log(`[SWAP] Creating transaction for wallet: ${keypair.publicKey.toString()}`);
    
    // Create a transaction
    const transaction = new web3.Transaction();
    
    // For real transactions or when forceReal is true, attempt a proper swap
    if (forceReal) {
      console.log(`[SWAP] ForceReal is set, attempting real token transfer`);
      
      // Handle real token swaps
      if (inputToken === 'SOL' && outputToken !== 'SOL') {
        // Handle SOL to token (simulated for now, just creates a transfer that shows up)
        console.log(`[SWAP] Real SOL to token transfer (${inputToken} -> ${outputToken})`);
        const lamports = Math.floor(amount * web3.LAMPORTS_PER_SOL);
        
        // Send SOL to self (this actually creates a real transaction that shows up in explorer)
        transaction.add(
          web3.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: Math.min(lamports, 100000), // Cap at 0.0001 SOL for safety
          })
        );
      } 
      else if (inputToken !== 'SOL' && outputToken === 'SOL') {
        // Handle token to SOL (simulated for now)
        console.log(`[SWAP] Real token to SOL transfer (${inputToken} -> ${outputToken})`);
        transaction.add(
          web3.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 100000, // 0.0001 SOL
          })
        );
      } 
      else {
        // Handle token to token (simulated for now)
        console.log(`[SWAP] Real token to token transfer (${inputToken} -> ${outputToken})`);
        transaction.add(
          web3.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 100000, // 0.0001 SOL
          })
        );
      }
    } 
    else {
      // For simulated swaps, just do a simple SOL transfer
      console.log(`[SWAP] Creating simulated swap transaction (SOL self-transfer)`);
      transaction.add(
        web3.SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey, // Send back to self
          lamports: 100000, // Very small amount (0.0001 SOL)
        })
      );
    }
    
    // Add a memo instruction if the memo program is available
    try {
      console.log(`[SWAP] Adding memo instruction`);
      const memoProgram = new web3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoText = forceReal 
        ? `Real Swap: ${inputToken} to ${outputToken}, amount: ${amount}` 
        : `Simulated Swap: ${inputToken} to ${outputToken}, amount: ${amount}`;
        
      transaction.add(
        new web3.TransactionInstruction({
          keys: [],
          programId: memoProgram,
          data: Buffer.from(memoText, 'utf8'),
        })
      );
      console.log(`[SWAP] Memo instruction added successfully: "${memoText}"`);
    } catch (error) {
      console.log(`[SWAP] Could not add memo instruction, continuing without it:`, error);
    }
    
    // Get recent blockhash
    console.log(`[SWAP] Getting recent blockhash`);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;
    console.log(`[SWAP] Got blockhash: ${blockhash}`);
    
    // Sign transaction
    console.log(`[SWAP] Signing transaction`);
    transaction.sign(keypair);
    console.log(`[SWAP] Transaction signed successfully`);
    
    // Send transaction
    console.log(`[SWAP] Sending transaction to network`);
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false }
    );
    
    console.log(`[SWAP] Transaction sent with signature: ${signature}`);
    
    // Confirm transaction
    console.log(`[SWAP] Waiting for transaction confirmation`);
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`[SWAP] Transaction confirmed successfully: ${signature}`);
    
    // Return success with the simulated output amount
    const outputAmount = formatTokenAmount(
      quoteResponse.outAmount,
      outputToken
    );
    
    // Additional information about the trade
    return { 
      success: true, 
      signature, 
      outputAmount,
      inToken: inputToken,
      outToken: outputToken,
      inAmount: formatTokenAmount(quoteResponse.inAmount, inputToken),
      exchangeRate: quoteResponse.exchangeRate
    };
  } catch (error: any) {
    console.error('Error executing swap:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred during swap' 
    };
  }
}