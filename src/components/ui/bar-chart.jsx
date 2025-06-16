"use client";

import * as React from "react";
import {
  Bar,
  BarChart as BarChartPrimitive,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const BarChart = React.forwardRef(
  ({ className, data, index, categories, yAxisWidth, ...props }, ref) => {
    return (
      // DEĞİŞİKLİK: ChartContainer'a sadece genel prop'ları ve datayı iletiyoruz.
      <ChartContainer data={data} className={className} {...props} ref={ref}>
        <BarChartPrimitive data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={index} // Prop'u kullanıyoruz
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) =>
              typeof value === "string" ? value.slice(0, 3) : value
            }
          />
          <YAxis
            width={yAxisWidth}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dashed" />}
          />
          <Bar dataKey={categories[0]} fill="var(--color-primary)" radius={8} />
        </BarChartPrimitive>
      </ChartContainer>
    );
  }
);
BarChart.displayName = "BarChart";

export { BarChart };
