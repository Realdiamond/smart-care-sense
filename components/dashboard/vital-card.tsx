"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MetricMeta, statusFor } from "@/lib/vitals";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

type Props = {
  meta: MetricMeta;
  value: number | undefined;
  secondary?: number;
  history: { v: number }[];
  index?: number;
};

const colorVar = (c: string) => `hsl(var(--${c}))`;

export const VitalCard = ({ meta, value, secondary, history, index = 0 }: Props) => {
  const Icon = meta.icon;
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const status = hasValue ? statusFor(meta, value as number) : "normal";
  const color = colorVar(meta.color);

  const display = !hasValue
    ? "—"
    : meta.key === "blood_pressure" && secondary
      ? `${Math.round(value as number)}/${Math.round(secondary)}`
      : meta.decimals
      ? (value as number).toFixed(meta.decimals)
      : Math.round(value as number).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="glass-card relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-500">
        <div
          className="absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
          style={{ background: color }}
        />
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}22`, color }}
              >
                <Icon className={cn("h-4 w-4", meta.key === "heart_rate" && "heartbeat")} />
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-wide border-0",
                status === "normal" && "bg-success/15 text-success",
                status === "warning" && "bg-warning/15 text-warning",
                status === "critical" && "bg-destructive/20 text-destructive"
              )}
            >
              {status}
            </Badge>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color }}>
              {display}
            </span>
            <span className="text-xs text-muted-foreground">{meta.unit}</span>
          </div>

          <div className="h-12 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={`g-${meta.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#g-${meta.key})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};