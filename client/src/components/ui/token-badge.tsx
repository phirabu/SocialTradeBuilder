import { cn } from "@/lib/utils";

interface TokenBadgeProps {
  symbol: string;
  name?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const defaultColors: Record<string, string> = {
  SOL: "#9945FF",
  USDC: "#2775CA",
  JUP: "#4F67E4",
  BON: "#F765A3",
  RLB: "#7CEB54",
  BONK: "#F5B719",
};

export function TokenBadge({ 
  symbol, 
  name, 
  color, 
  size = "md", 
  className 
}: TokenBadgeProps) {
  const tokenColor = color || defaultColors[symbol] || "#888888";
  
  // Size mappings
  const sizeClasses = {
    sm: {
      container: "px-2 py-1",
      circle: "w-4 h-4 mr-1",
      text: "text-xs",
      symbolText: "text-[8px]",
    },
    md: {
      container: "px-2 py-1.5",
      circle: "w-5 h-5 mr-2",
      text: "text-sm",
      symbolText: "text-[10px]",
    },
    lg: {
      container: "px-3 py-2",
      circle: "w-6 h-6 mr-2",
      text: "text-sm",
      symbolText: "text-xs",
    },
  };
  
  return (
    <div 
      className={cn(
        "flex items-center rounded-md bg-gray-800/60",
        sizeClasses[size].container,
        className
      )}
    >
      <div 
        className={cn(
          "rounded-full flex items-center justify-center",
          sizeClasses[size].circle
        )}
        style={{ backgroundColor: tokenColor }}
      >
        <span className={cn("font-bold text-white", sizeClasses[size].symbolText)}>
          {symbol ? symbol.substring(0, 3) : '???'}
        </span>
      </div>
      <span className={cn("text-white", sizeClasses[size].text)}>
        {name || symbol || 'Unknown'}
      </span>
    </div>
  );
}

export function TokenBadgeList({
  tokens,
  size = "sm",
  className,
}: {
  tokens: Array<{ symbol: string; name?: string; color?: string }>;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tokens.map((token) => (
        <TokenBadge
          key={token.symbol}
          symbol={token.symbol}
          name={token.name}
          color={token.color}
          size={size}
        />
      ))}
    </div>
  );
}
