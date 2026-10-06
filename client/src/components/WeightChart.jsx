import { useTheme } from '@mui/material/styles';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber, formatShortDate, parseDate } from '../lib/format.js';

/** Weight history chart. All colors come from the active theme. */
export default function WeightChart({ entries, height = 220 }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const chart = theme.custom.chart;
  const data = entries
    .filter((e) => e.weight_kg != null)
    .map((e) => ({ date: e.date, ts: parseDate(e.date).getTime(), weight: Number(e.weight_kg) }))
    .sort((a, b) => a.ts - b.ts);
  if (data.length < 2) return null;
  const gradientId = `weight-${theme.custom.id}`;

  return (
    <figure style={{ margin: 0 }} aria-label={t('health.weightChart')}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.line} stopOpacity={0.35} />
              <stop offset="100%" stopColor={chart.line} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => formatShortDate(new Date(ts))}
            tick={{ fill: chart.axis, fontSize: 12 }}
            stroke={chart.grid}
            minTickGap={24}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v) => formatNumber(v, 1)}
            tick={{ fill: chart.axis, fontSize: 12 }}
            stroke={chart.grid}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.grid}`,
              borderRadius: theme.shape.borderRadius,
              color: theme.palette.text.primary,
            }}
            labelFormatter={(ts) => formatDate(new Date(ts))}
            formatter={(v) => [`${formatNumber(v)} kg`, t('health.weight')]}
          />
          <Area
            type="monotone"
            dataKey="weight"
            stroke={chart.line}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: chart.line, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={
              theme.custom.lively &&
              !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
