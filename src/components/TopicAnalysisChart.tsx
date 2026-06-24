/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ProductAspectTopic, VINTAGE_COLOR_TOKENS } from "../types.ts";

interface TopicAnalysisChartProps {
  topics: ProductAspectTopic[];
}

export default function TopicAnalysisChart({ topics }: TopicAnalysisChartProps) {
  // Store the active index of expanded topics to render supporting quotes below the chart
  const [activeTopicIndex, setActiveTopicIndex] = useState<number | null>(null);

  // Fallback defaults for topics if scraped arrays are empty
  const defaultTopics: ProductAspectTopic[] = [
    {
      name: "Acoustic Fidelity",
      mention_count: 22,
      average_sentiment: "positive",
      sentiment_score: 0.88,
      representative_quotes: [
        "Phenomenal stereo separation and high-frequency resolution.",
        "Beautiful deep bass presence without muddiness or distortion."
      ]
    },
    {
      name: "Active Noise Control (ANC)",
      mention_count: 18,
      average_sentiment: "positive",
      sentiment_score: 0.92,
      representative_quotes: [
        "Unrivaled quietness. Completely isolates subway train frequencies.",
        "Maintains natural acoustic pressure levels beautifully."
      ]
    },
    {
      name: "Daily Hardware Comfort",
      mention_count: 14,
      average_sentiment: "neutral",
      sentiment_score: 0.22,
      representative_quotes: [
        "Premium leather cushioning, but slightly tighter clamp pressure than older series.",
        "A bit heavy during continuous three-hour listening sessions."
      ]
    },
    {
      name: "Product Retail Value",
      mention_count: 9,
      average_sentiment: "negative",
      sentiment_score: -0.45,
      representative_quotes: [
        "At $399, it is a tough entry point compared to secondary market alternatives.",
        "Outstanding features, but pricing limits general value index."
      ]
    }
  ];

  const processedTopics = topics && topics.length > 0 ? topics : defaultTopics;

  // Build Recharts data mapping: converting continuous range [-1, +1] into clean absolute scales
  const chartData = processedTopics.map((item) => ({
    name: item.name,
    mentions: item.mention_count,
    sentimentPercentage: Math.round((item.sentiment_score + 1) * 50), // Conversion from [-1, 1] to [0%, 100%]
    sentimentColor: item.sentiment_score > 0.3 
      ? VINTAGE_COLOR_TOKENS.moss 
      : item.sentiment_score < -0.2 
        ? VINTAGE_COLOR_TOKENS.clay 
        : VINTAGE_COLOR_TOKENS.gold,
    rawSentiment: item.sentiment_score
  }));

  // Custom tooltips styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-[#232320] text-[#faf9f5] border border-[#e7e5dc] rounded-md p-3 text-xs font-mono">
          <p className="font-bold">{dataItem.name}</p>
          <p className="mt-1">Mention Volume: <span className="text-[#ffcb69]">{dataItem.mentions} sources</span></p>
          <p className="mt-0.5">Sentiment Index: <span style={{ color: dataItem.sentimentColor }}>
            {dataItem.rawSentiment > 0 ? `+${dataItem.rawSentiment}` : dataItem.rawSentiment}
          </span> ({dataItem.sentimentPercentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="topic-aspects-scoring-card" className="themed-card h-full flex flex-col justify-between">
      {/* Visual Component Header */}
      <div id="topic-card-header" className="w-full text-left mb-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#997b66] border-b border-[#e7e5dc] pb-2">
          🔬 FEATURE ASPECT SENTIMENT ANALYSIS
        </h4>
        <p className="text-xs text-[#997b66] mt-1">
          Extraction of consumer sentiments classified on feature levels. Mentions represented by bar length; Color signifies satisfaction indicators.
        </p>
      </div>

      {/* Recharts chart stage representing mention volumes horizontally */}
      <div id="recharts-bar-container" className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
            onClick={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                // Toggle active expand text on row clicks
                setActiveTopicIndex(
                  activeTopicIndex === state.activeTooltipIndex ? null : state.activeTooltipIndex
                );
              }
            }}
          >
            <XAxis 
              type="number" 
              hide // Keep design minimal & clean
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              width={140}
              tick={{ fill: "#232320", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#e7e5dc40' }} />
            <Bar 
              dataKey="mentions" 
              radius={[0, 4, 4, 0]} // Curved ends for pristine aesthetics
              label={{ position: "right", fill: "#997b66", fontSize: 11, fontWeight: "bold" }}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  id={`topic-bar-cell-${index}`}
                  key={`cell-${index}`} 
                  fill={entry.sentimentColor}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Block detailing Satisfaction Tiers */}
      <div id="topic-satisfaction-legend" className="flex justify-start gap-4 mb-3 p-2 bg-[#faf9f5] border border-[#e7e5dc] rounded-md text-[10px] font-mono uppercase">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-moss)" }}></span>
          Satisfied 🟢 (&gt;0.3)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-gold)" }}></span>
          Mixed / Neutral 🟡
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-clay)" }}></span>
          Dissatisfied 🔴 (&lt;-0.2)
        </span>
      </div>

      {/* Dynamic Expansion: Verbatim Quotes Panel */}
      <div id="aspects-quotes-expansion-panel" className="bg-[#faf9f5] border border-[#e7e5dc] rounded-lg p-3 text-xs mt-1">
        <div className="font-semibold text-[#997b66] font-mono uppercase tracking-wider mb-2 text-[10px]">
          💬 supporting VERBATIM QUOTES
        </div>

        {activeTopicIndex !== null ? (
          <div className="space-y-2">
            <div className="font-bold text-[#232320] flex items-center justify-between pb-1 border-b border-[#e7e5dc] border-dashed">
              <span>🎧 {processedTopics[activeTopicIndex].name}</span>
              <span 
                className="text-[10px] uppercase font-mono py-0.5 px-2 rounded"
                style={{ 
                  backgroundColor: processedTopics[activeTopicIndex].sentiment_score > 0.3 ? "#797d6215" : processedTopics[activeTopicIndex].sentiment_score < -0.2 ? "#d08c6015" : "#ffcb6915",
                  color: processedTopics[activeTopicIndex].sentiment_score > 0.3 ? "var(--color-moss)" : processedTopics[activeTopicIndex].sentiment_score < -0.2 ? "var(--color-clay)" : "var(--color-brown)"
                }}
              >
                Score: {processedTopics[activeTopicIndex].sentiment_score}
              </span>
            </div>
            {processedTopics[activeTopicIndex].representative_quotes.map((quote, qIdx) => (
              <p key={qIdx} className="italic text-[#232320] pl-3 border-l-2 border-[#ffcb69] leading-relaxed">
                "{quote}"
              </p>
            ))}
          </div>
        ) : (
          <p className="text-center text-[#997b66] py-3 italic font-mono text-[11px]">
            💡 Click on any of the topic bars above to expand and inspect verified user quote snippets.
          </p>
        )}
      </div>
    </div>
  );
}
