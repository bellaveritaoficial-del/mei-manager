import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "bg-card",
  success: "bg-accent",
  warning: "bg-accent",
  danger: "bg-destructive/10",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-primary/20 text-primary",
  warning: "bg-chart-4/20 text-chart-4",
  danger: "bg-destructive/20 text-destructive",
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className={cn("border-border shadow-sm", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <p
                className={cn(
                  "mt-1 text-sm font-medium",
                  trend.isPositive ? "text-primary" : "text-destructive"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              iconStyles[variant]
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
