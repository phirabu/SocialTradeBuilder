import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a string to the specified length
 */
export function truncateString(str: string, maxLength: number = 6): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Formats a number to a string with the specified number of decimal places
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const number = typeof value === 'string' ? parseFloat(value) : value;
  return number.toFixed(decimals);
}

/**
 * Creates a Solana explorer URL for a transaction
 */
export function createSolanaExplorerUrl(signature: string, network: 'mainnet' | 'devnet' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
}

/**
 * Creates a Solana explorer URL for an address
 */
export function createSolanaAddressUrl(address: string, network: 'mainnet' | 'devnet' = 'devnet'): string {
  return `https://explorer.solana.com/address/${address}?cluster=${network}`;
}
