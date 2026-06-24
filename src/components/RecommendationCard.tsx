/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecommendationDetails } from "../types.ts";

interface RecommendationCardProps {
  recommendation: RecommendationDetails;
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  // Destructure values safely
  const {
    status = "BUY",
    explanation = "Data parameters indicate highly stable scores.",
    audience = ["Everyday Tech Lovers", "Smart Commuters"],
    alternatives = ["Sony WF-1000XM5", "Bose QuietComfort Earbuds II"]
  } = recommendation || {};

  // Resolve visual properties matching status tier
  const getVerdictStyle = (verdict: 'BUY' | 'DEPENDS' | 'AVOID') => {
    switch (verdict) {
      case "BUY":
        return {
          label: "🟢 SPECIFICATIONS CONFIRMED - BUY VERDICT",
          badge: "👑 RECOMMENDED FOR PURCHASE",
          border: "4px solid var(--color-moss)",
          bg: "#797d6225", // Soft moss overlay
          colorClassName: "text-[#797d62]",
          emoji: "👑",
          desc: "This model exhibits outstanding performance-to-cost metrics across the majority of crawled aspects with very few critical drawbacks."
        };
      case "DEPENDS":
        return {
          label: "🟡 CONDITIONAL - DEPENDS VERDICT",
          badge: "⚠️ REQUIRES CAREFUL EVALUATION",
          border: "4px solid var(--color-gold)",
          bg: "#ffcb6925", // Soft gold overlay
          colorClassName: "text-[#b08020]",
          emoji: "⚠️",
          desc: "Excellent capabilities inside selective aspects, but comes with trade-offs like high pricing margins, software bugs, or niche ergonomics."
        };
      default:
        return {
          label: "🔴 NOT RECOMMENDED - AVOID VERDICT",
          badge: "❌ CRITICAL FAULTS - AVOID VERDICT",
          border: "4px solid var(--color-clay)",
          bg: "#d08c6020", // Soft clay overlay
          colorClassName: "text-[#d08c60]",
          emoji: "❌",
          desc: "Severe limitations identified, high cost ratios, or abnormal product failure frequencies reported across consumer logs."
        };
    }
  };

  const verdictTheme = getVerdictStyle(status);

  return (
    <div id="recommendation-analytics-card" className="themed-card h-full flex flex-col justify-between">
      {/* Component Header Block */}
      <div id="recommendation-card-header" className="w-full text-left">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#997b66] border-b border-[#e7e5dc] pb-2">
          🎯 ULTIMATE RECOMMENDATION ACTION
        </h4>
        <p className="text-xs text-[#997b66] mt-1">
          Pipeline decisions derived against specifications, sentiment, and cost-to-benefit ratios.
        </p>
      </div>

      {/* Action Banner Spotlight */}
      <div 
        id="recommendation-action-banner" 
        style={{ border: verdictTheme.border, backgroundColor: verdictTheme.bg }}
        className="rounded-lg p-5 my-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex-1">
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase mb-1" style={{ color: "var(--color-brown)" }}>
            {verdictTheme.label}
          </div>
          <h3 className="text-xl font-black text-[#232320] flex items-center gap-1.5 leading-none">
            {verdictTheme.emoji} {verdictTheme.badge}
          </h3>
          <p className="text-xs text-[#232320] mt-2 font-medium">
            {verdictTheme.desc}
          </p>
        </div>

        {/* Large Standalone visual Button */}
        <div className="shrink-0">
          <span 
            className="inline-block px-7 py-3 text-white font-black text-sm tracking-wider uppercase rounded-md shadow-sm select-none"
            style={{ 
              backgroundColor: status === "BUY" ? "var(--color-moss)" : status === "DEPENDS" ? "var(--color-gold)" : "var(--color-clay)",
              color: status === "DEPENDS" ? "var(--color-charcoal)" : "white"
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Explanatory Text Box */}
      <div id="recommendation-explanation-text" className="w-full bg-[#faf9f5] border border-[#e7e5dc] rounded-lg p-4 text-xs text-[#232320] leading-relaxed mb-4">
        <strong>⚡ Decision Reasoning:</strong> {explanation}
      </div>

      {/* Target Audiences and Alternatives dual grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Side: Suitability Persona */}
        <div id="suitability-personas" className="bg-[#faf9f5] border border-[#e7e5dc] rounded-lg p-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#997b66] block mb-2 border-b border-[#e7e5dc] pb-1">
            🎯 TARGET AUDIENCES
          </span>
          <div className="flex flex-wrap gap-1.5">
            {audience.map((item, idx) => (
              <span 
                key={idx} 
                className="text-[11px] font-medium bg-white border border-[#e7e5dc] text-[#232320] px-2.5 py-1 rounded-md font-mono"
              >
                👤 {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Alternatives */}
        <div id="competitor-alternatives" className="bg-[#faf9f5] border border-[#e7e5dc] rounded-lg p-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#997b66] block mb-2 border-b border-[#e7e5dc] pb-1">
            🔀 COMPETITOR ALTERNATIVES
          </span>
          <div className="flex flex-wrap gap-1.5">
            {alternatives.map((item, idx) => (
              <span 
                key={idx} 
                className="text-[11px] font-medium bg-[#f1dca7] bg-opacity-20 border border-[#e7e5dc] text-[#997b66] px-2.5 py-1 rounded-md font-mono"
              >
                🎧 {item}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
