import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@shared/schema";
import { Clock, CheckCircle, Play, XCircle, AlertTriangle } from "lucide-react";

interface OrderStatusBadgeProps {
  status: string;
  size?: "sm" | "default" | "lg";
}

export function OrderStatusBadge({ status, size = "default" }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case OrderStatus.SUBMITTED:
        return {
          label: "Submitted",
          variant: "secondary" as const,
          icon: Clock,
          className: "bg-yellow-900 text-yellow-300 hover:bg-yellow-800"
        };
      case OrderStatus.APPROVED:
        return {
          label: "Approved",
          variant: "secondary" as const,
          icon: CheckCircle,
          className: "bg-blue-900 text-blue-300 hover:bg-blue-800"
        };
      case OrderStatus.STARTED:
        return {
          label: "Started",
          variant: "secondary" as const,
          icon: Play,
          className: "bg-cyan-900 text-cyan-300 hover:bg-cyan-800"
        };
      case OrderStatus.FINISHED:
        return {
          label: "Finished",
          variant: "secondary" as const,
          icon: CheckCircle,
          className: "bg-green-900 text-green-300 hover:bg-green-800"
        };
      case OrderStatus.FAILED:
        return {
          label: "Failed",
          variant: "destructive" as const,
          icon: XCircle,
          className: "bg-red-900 text-red-300 hover:bg-red-800"
        };
      case OrderStatus.CANCELLED:
        return {
          label: "Cancelled",
          variant: "secondary" as const,
          icon: AlertTriangle,
          className: "bg-gray-900 text-gray-300 hover:bg-gray-800"
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          icon: Clock,
          className: ""
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`inline-flex items-center ${config.className} ${
        size === "sm" ? "text-xs px-2 py-0.5" : 
        size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2.5 py-0.5"
      }`}
    >
      <Icon className={`mr-1 ${size === "sm" ? "h-3 w-3" : "h-4 w-4"}`} />
      {config.label}
    </Badge>
  );
}
