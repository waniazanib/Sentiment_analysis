/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QualityConfidence } from "../types.ts";

interface ConfidenceCardProps {
  confidence: QualityConfidence;
}

export default function ConfidenceCard({ confidence }: ConfidenceCardProps) {
  // Destructure metrics with safe defaults to prevent runtime voids
  const {
    score = "Medium",
    total_discussions = 0,
    total_articles = 0,
    total_reviews = 0,
    total_videos = 0,
    total_ratings_count = 0
  } = confidence || {};

  // Map confidence level score strings to elegant corresponding emoji badges & colors
  const getConfigForScore = (cScore: string) => {
    switch (cScore) {
      case "Very High":
        return {
          bagde: "💎 VERY HIGH",
          color: "var(--color-moss)",
          bg: "#797d6220",
          desc: "Excellent data density supporting highly reliable recommendations."
        };
      case "High":
        return {
          bagde: "🟢 HIGH",
          color: "var(--color-sage)",
          bg: "#9b9b7a20",
          desc: "Good data coverage offering robust and highly trustworthy insights."
        };
      case "Medium":
        return {
          bagde: "🟡 MEDIUM",
          color: "var(--color-gold)",
          bg: "#ffcb6920",
          desc: "Moderate scope of discussions. Treat recommendations with advisory caution."
        };
      default:
        return {
          bagde: "🔴 LOW",
          color: "var(--color-clay)",
          bg: "#d08c6020",
          desc: "Limited reference materials ingested. Highly volatile recommendation limits."
        };
    }
  };

  const confidenceTheme = getConfigForScore(score);

  return (
    <div id="confidence-scoring-card" className="themed-card flex flex-col justify-between h-full">
      {/* Visual Component Header */}
      <div id="confidence-card-header" className="w-full text-left">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#997b66] border-b border-[#e7e5dc] pb-2">
          🎯 AUDIT CONFIDENCE RATING
        </h4>
        <p className="text-xs text-[#997b66] mt-1">
          Numerical evaluation indexing data density across crawling nodes.
        </p>
      </div>

      {/* Main Large Score Indicator Badge */}
      <div 
        id="confidence-score-spotlight" 
        className="my-5 p-4 rounded-lg flex flex-col items-center justify-center text-center"
        style={{ backgroundColor: confidenceTheme.bg, borderColor: confidenceTheme.color, borderWidth: 1 }}
      >
        <span className="text-sm font-mono tracking-wider font-bold mb-1" style={{ color: confidenceTheme.color }}>
          DATA RELIABILITY STATUS
        </span>
        <span className="text-2xl font-black text-[#232320]">
          {confidenceTheme.bagde}
        </span>
        <p className="text-xs text-[#232320] mt-2 font-medium">
          {confidenceTheme.desc}
        </p>
      </div>

      {/* Source breakdown counts grid list */}
      <div id="confidence-source-metrics-grid" className="w-full space-y-3.5 mt-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#997b66] border-b border-[#e7e5dc] pb-1">
          📥 INGESTION QUANTITIES breakdown 
        </div>

        {/* 1. Article reviews */}
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#232320] flex items-center gap-1.5">
            📝 Expert Review Articles
          </span>
          <span className="font-bold text-[#797d62] bg-[#797d6215] px-2 py-0.5 rounded-md">
            {total_articles} sources
          </span>
        </div>

        {/* 2. Structured Community Reviews */}
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#232320] flex items-center gap-1.5">
            💬 Structured Forums & Ratings
          </span>
          <span className="font-bold text-[#ffcb69] bg-[#ffcb6915] px-2 py-0.5 rounded-md" style={{ color: "var(--color-brown)" }}>
            {total_ratings_count || total_reviews} reviews
          </span>
        </div>

        {/* 3. YouTube reviews */}
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#232320] flex items-center gap-1.5">
            🎥 Video Review Transcripts
          </span>
          <span className="font-bold text-[#d08c60] bg-[#d08c6015] px-2 py-0.5 rounded-md">
            {total_videos} videos
          </span>
        </div>

        {/* Combined totals bar indicator */}
        <div className="pt-3 border-t border-[#e7e5dc] flex justify-between items-center">
          <span className="text-xs font-bold text-[#232320]">
            🗃️ Total Ingestion Pool
          </span>
          <span className="text-xs font-black text-[#232320]">
            {total_discussions} Channels Indexed
          </span>
        </div>
      </div>
    </div>
  );
}
