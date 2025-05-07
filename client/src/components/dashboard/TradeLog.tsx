import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TradeLogProps {
  botId: number;
}

export default function TradeLog({ botId }: TradeLogProps) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/bots/${botId}`],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#9945FF]" />
      </div>
    );
  }

  const trades = data?.trades || [];

  if (trades.length === 0) {
    return (
      <div className="bg-card-bg p-6 rounded-lg border border-border-color text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800 mx-auto flex items-center justify-center mb-3">
          <i className="fas fa-exchange-alt text-text-secondary"></i>
        </div>
        <h3 className="text-lg font-medium mb-1">No Trades Yet</h3>
        <p className="text-text-secondary text-sm">
          Trades will appear here when users tweet commands to your bot.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-lg border border-border-color overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeader className="w-[120px]">Date</TableHeader>
            <TableHeader>Transaction</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader className="text-right">Status</TableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell className="text-xs text-text-secondary">
                {format(new Date(trade.createdAt), "MMM d, h:mm a")}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="capitalize font-medium mr-1">{trade.action}</span>
                  <span className="text-text-secondary">
                    {trade.inAmount} {trade.inToken} → {trade.outAmount || "?"} {trade.outToken}
                  </span>
                </div>
                {trade.tweetText && (
                  <div className="mt-1 text-xs text-text-secondary truncate max-w-[300px]">
                    {trade.tweetText}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {trade.inAmount} {trade.inToken}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  className={`
                    ${trade.status === "completed" ? "bg-green-500/20 text-green-400" : ""} 
                    ${trade.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : ""}
                    ${trade.status === "failed" ? "bg-red-500/20 text-red-400" : ""}
                  `}
                >
                  {trade.status}
                </Badge>
                {trade.transactionSignature && (
                  <div className="mt-1">
                    <a
                      href={`https://explorer.solana.com/tx/${trade.transactionSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#9945FF] hover:underline"
                    >
                      View Transaction ↗
                    </a>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
