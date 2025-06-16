"use client";

import * as React from "react";
import { Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// Chart Container
const ChartContainer = React.forwardRef(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex aspect-video w-full items-center justify-center [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-surface]:-ml-4",
        className
      )}
    >
      {/* DEĞİŞİKLİK: Tüm özel prop'lar, onları anlayan ResponsiveContainer'a gönderilir. */}
      <ResponsiveContainer width="100%" height={350} {...props}>
        {children}
      </ResponsiveContainer>
    </div>
  )
);
ChartContainer.displayName = "ChartContainer";

// Chart Tooltip
const ChartTooltip = RechartsTooltip;

// Chart Tooltip Content
const ChartTooltipContent = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-md border bg-background px-3 py-1.5 text-sm shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  );
});
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
