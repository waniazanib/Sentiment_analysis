/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { VINTAGE_COLOR_TOKENS } from "../types.ts";

// Proptypes contract for SentimentPieChart component
interface SentimentPieChartProps {
  positive: number; // Percent positive mentions (0-100)
  neutral: number;  // Percent neutral mentions (0-100)
  negative: number; // Percent negative mentions (0-100)
  summaryText: string; // Explanatory subtitle narrative
}

export default function SentimentPieChart({
  positive,
  neutral,
  negative,
  summaryText
}: SentimentPieChartProps) {
  
  // Clean values validation to bypass render voids
  const total = (positive || 0) + (neutral || 0) + (negative || 0);
  const validatedPositive = total === 0 ? 33.3 : parseFloat(((positive / total) * 100).toFixed(0));
  const validatedNeutral = total === 0 ? 33.3 : parseFloat(((neutral / total) * 100).toFixed(0));
  const validatedNegative = total === 0 ? 33.4 : parseFloat(((negative  / total) * 100).toFixed(0));

  // Build Recharts compatible data objects array
  const data = [
    { name: "Positive (🟢)", value: validatedPositive, color: VINTAGE_COLOR_TOKENS.moss },
    { name: "Neutral (🟡)", value: validatedNeutral, color: VINTAGE_COLOR_TOKENS.gold },
    { name: "Negative (🔴)", value: validatedNegative, color: VINTAGE_COLOR_TOKENS.clay }
  ];

  // Custom Tooltip component to match clean flat styles
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#232320] text-[#faf9f5] border border-[#e7e5dc] rounded-md px-3 py-2 text-xs font-mono">
          <p className="font-bold">{payload[0].name}</p>
          <p className="mt-1">Ratio: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="sentiment-analysis-card-container" className="themed-card flex flex-col items-center justify-between h-full">
      {/* Visual Header Block */}
      <div id="sentiment-card-header" className="w-full text-left mb-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#997b66] border-b border-[#e7e5dc] pb-2">
          📊 CONSUMER SENTIMENT INDEX
        </h4>
        <p className="text-xs text-[#997b66] mt-1">
          Scrape ratios synthesized across blogs and discussion portals.
        </p>
      </div>

      {/* Visual Pie-Chart Stage */}
      <div id="recharts-pie-container" className="w-full h-56 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55} // Donut styled cutout
              outerRadius={80}
              paddingAngle={4} // Flat visual segment spacers
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  id={`sentiment-cell-${index}`}
                  key={`cell-${index}`} 
                  fill={entry.color} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconSize={8}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-semibold text-[#232320] font-mono">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Absolute Center percentage marker detail */}
        <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
          <span className="text-2xl font-black text-[#232320]" style={{ color: "var(--color-moss)" }}>
             🟢 {validatedPositive}%
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#997b66]">
            Positive Ratio
          </span>
        </div>
      </div>

      {/* Summary Narrative Bottom Segment */}
      <div id="sentiment-narrative-summary" className="w-full mt-4 bg-[#faf9f5] border border-[#e7e5dc] rounded-lg p-3 text-xs text-[#232320] leading-relaxed">
        <strong>⚡ Sentiment Synthesis:</strong> {summaryText || "Aggregates display highly stable positive feedback with minor localized reservations."}
      </div>
    </div>
  );
}
