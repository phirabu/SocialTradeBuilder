import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";

interface TwitterInteraction {
  id: string;
  tweetId: string;
  tweetText: string;
  twitterUsername: string;
  commandType: string;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  responseText?: string;
  transactionSignature?: string;
}

interface TwitterInteractionsTableProps {
  interactions: TwitterInteraction[];
  isLoading?: boolean;
  onViewTweet?: (tweetId: string) => void;
  onViewUser?: (username: string) => void;
}

const TwitterInteractionsTable: React.FC<TwitterInteractionsTableProps> = ({
  interactions,
  isLoading = false,
  onViewTweet,
  onViewUser,
}) => {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  };

  // Function to get status badge with appropriate color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-500/20 text-green-500 hover:bg-green-500/30">
            <CheckCircleIcon className="w-3 h-3" />
            <span>Completed</span>
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircleIcon className="w-3 h-3" />
            <span>Failed</span>
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <ClockIcon className="w-3 h-3" />
            <span>Pending</span>
          </Badge>
        );
    }
  };

  // Function to truncate tweet text
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No Twitter interactions found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Tweet</TableHead>
            <TableHead>Command</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interactions.map((interaction) => (
            <TableRow key={interaction.id}>
              <TableCell className="font-mono text-xs">
                {formatDate(interaction.timestamp)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 font-medium text-blue-600 hover:text-blue-800"
                  onClick={() => onViewUser && onViewUser(interaction.twitterUsername)}
                >
                  @{interaction.twitterUsername}
                </Button>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <span className="line-clamp-1 text-sm">
                  {truncateText(interaction.tweetText)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {interaction.commandType}
                </Badge>
              </TableCell>
              <TableCell>{getStatusBadge(interaction.status)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewTweet && onViewTweet(interaction.tweetId)}
                  title="View tweet"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TwitterInteractionsTable;