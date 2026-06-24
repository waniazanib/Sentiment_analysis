/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductAnalysis, VINTAGE_COLOR_TOKENS } from "../types.ts";

interface ComparisonTableProps {
  products: ProductAnalysis[]; // Array of fully analyzed products (2, 3, or 4 items)
  onDismissProduct: (productName: string) => void; // Callback to drop a product comparison track
  onClearAll: () => void; // Global cleanup trigger
}

export default function ComparisonTable({
  products,
  onDismissProduct,
  onClearAll
}: ComparisonTableProps) {
  
  // Default protection guard against blank arrays
  if (!products || products.length === 0) {
    return (
      <div id="empty-comparison-matrix-placeholder" className="themed-card text-center py-10">
        <p className="text-[#997b66] italic font-mono text-sm">
          ⚖️ Compare Matrix Board is empty. Search products above and click [➕ Compare] to add side-by-side grids.
        </p>
      </div>
    );
  }

  // Calculate dynamic grid column percentage widths based on products size:
  // We have 1 metric description label col + 'products.length' product cols.
  const getGridColsClass = () => {
    switch (products.length) {
      case 1:
        return "grid-cols-[150px_1fr]";
      case 2:
        return "grid-cols-[150px_1fr_1fr]";
      case 3:
        return "grid-cols-[120px_1fr_1fr_1fr]";
      default:
        return "grid-cols-[100px_1fr_1fr_1fr_1fr]"; // Dense 4-column viewport
    }
  };

  // Convert status results (BUY, DEPENDS, AVOID) to beautiful status tags
  const getRecommendationBadge = (status: 'BUY' | 'DEPENDS' | 'AVOID') => {
    switch (status) {
      case "BUY":
        return {
          text: "👑 BUY",
          bg: "#797d6215",
          color: "var(--color-moss)",
          border: "2px solid var(--color-moss)"
        };
      case "DEPENDS":
        return {
          text: "⚠️ DEPENDS",
          bg: "#ffcb6915",
          color: "var(--color-brown)",
          border: "2px solid var(--color-gold)"
        };
      default:
        return {
          text: "❌ AVOID",
          bg: "#d08c6015",
          color: "var(--color-clay)",
          border: "2px solid var(--color-clay)"
        };
    }
  };

  return (
    <div id="premium-comparison-dashboard-board" className="themed-card w-full mb-6">
      
      {/* Table Global Controls Header */}
      <div id="comparison-matrix-title-row" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#e7e5dc] pb-4 mb-5">
        <div>
          <h3 className="text-sm font-mono uppercase tracking-wider text-[#997b66] flex items-center gap-1.5">
            ⚖️ THE ACTIVE COMPARISON BOARD
          </h3>
          <p className="text-xs text-[#997b66] mt-1">
            Analyzing {products.length} {products.length === 1 ? 'Product' : 'Products'} side-by-side using unified scraper heuristics.
          </p>
        </div>
        
        {/* Reset Actions button */}
        <button
          id="clear-all-comparison-tracks"
          type="button"
          onClick={onClearAll}
          className="px-4 py-2 border-2 border-[#e7e5dc] hover:border-[#997b66] rounded-md text-xs font-mono font-bold text-[#997b66] hover:text-[#232320] transition-colors cursor-pointer"
        >
          🗑️ Clear Matrix Board
        </button>
      </div>

      {/* Main Structural Matrix Grid block */}
      {/* Pinned left descriptions + Swipe tracks wrapper supporting Mobile Adaptation inside overflow elements */}
      <div id="touch-responsive-scroller" className="w-full overflow-x-auto select-none pb-2">
        <div className={`grid ${getGridColsClass()} gap-3 min-w-[700px] border-b border-[#e7e5dc] pb-4`}>
          
          {/* ======================================================= */}
          {/* HEADER ROW ROW: Product Titles & Dismissals */}
          {/* ======================================================= */}
          <div className="flex items-center text-[10px] font-mono uppercase tracking-wider text-[#997b66] font-extrabold pr-2">
            Comparison Model
          </div>
          
          {products.map((p, idx) => (
            <div 
              id={`comparison-header-col-${idx}`}
              key={`h-col-${p.product_metadata.name}-${idx}`} 
              className="relative p-3 bg-[#faf9f5] border border-[#e7e5dc] rounded-lg flex flex-col justify-between min-h-[105px]"
            >
              {/* Dismiss Pin trigger to discard active columns easily */}
              <button
                id={`dismiss-product-pin-${idx}`}
                type="button"
                onClick={() => onDismissProduct(p.product_metadata.name)}
                className="absolute top-1 right-2 text-xs text-[#997b66] hover:text-[#232320] font-black p-1 leading-none rounded cursor-pointer"
              >
                ✕ dismiss
              </button>

              <div className="mt-2 pr-4">
                <span className="text-[9px] font-mono uppercase bg-[#9b9b7a20] text-[#797d62] px-2 py-0.5 rounded-full font-bold">
                  {p.product_metadata.brand}
                </span>
                <h4 className="text-sm font-black text-[#232320] mt-1 leading-snug">
                  🎧 {p.product_metadata.name}
                </h4>
              </div>

              <div className="text-[10px] font-mono text-[#997b66] mt-2">
                🏷️ {p.product_metadata.category}
              </div>
            </div>
          ))}

          {/* ======================================================= */}
          {/* RECOMMENDATION ROW */}
          {/* ======================================================= */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
             Action Verdict
          </div>

          {products.map((p, idx) => {
            const badge = getRecommendationBadge(p.recommendation.status);
            return (
              <div 
                id={`col-status-cell-${idx}`}
                key={`status-${idx}`} 
                style={{ backgroundColor: badge.bg, border: badge.border }}
                className="p-3 rounded-lg flex flex-col justify-center items-center text-center border mt-1"
              >
                <span className="text-xs font-black" style={{ color: badge.color }}>
                  {badge.text}
                </span>
                <span className="text-[10px] text-[#232320] mt-1 leading-tight block">
                  {p.recommendation.explanation.slice(0, 70)}...
                </span>
              </div>
            );
          })}

          {/* ======================================================= */}
          {/* SENTIMENT BREAKDOWN RATIOS */}
          {/* ======================================================= */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
            Sentiment split
          </div>

          {products.map((p, idx) => {
            const pos = p.overall_sentiment.positive;
            const neu = p.overall_sentiment.neutral;
            const neg = p.overall_sentiment.negative;
            return (
              <div 
                id={`col-sentiment-cell-${idx}`}
                key={`sentiment-${idx}`} 
                className="pt-3 border-t border-[#e7e5dc] flex flex-col justify-center"
              >
                {/* Horizontal miniature stacked percentage bar representing satisfaction rates */}
                <div className="w-full h-3 bg-[#e7e5dc] roundedoverflow-hidden flex rounded-full mb-1 border border-[#e7e5dc] scale-[0.95]">
                  <div 
                    title={`Positive: ${pos}%`}
                    style={{ width: `${pos}%`, backgroundColor: VINTAGE_COLOR_TOKENS.moss }} 
                    className="h-full"
                  />
                  <div 
                    title={`Neutral: ${neu}%`}
                    style={{ width: `${neu}%`, backgroundColor: VINTAGE_COLOR_TOKENS.gold }} 
                    className="h-full"
                  />
                  <div 
                    title={`Negative: ${neg}%`}
                    style={{ width: `${neg}%`, backgroundColor: VINTAGE_COLOR_TOKENS.clay }} 
                    className="h-full"
                  />
                </div>
                {/* Text values representation inside rows */}
                <div className="flex justify-between text-[10px] font-mono font-bold text-[#232320] px-1 scale-[0.95]">
                  <span className="text-[#797d62]">🟢 {pos}%</span>
                  <span className="text-[#997b66]">🟡 {neu}%</span>
                  <span className="text-[#d08c60]">🔴 {neg}%</span>
                </div>
              </div>
            );
          })}

          {/* ======================================================= */}
          {/* AUDIT RELIABILITY & SOURCES CODES */}
          {/* ======================================================= */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
             Confidence Score
          </div>

          {products.map((p, idx) => (
            <div 
              id={`col-confidence-cell-${idx}`}
              key={`confidence-${idx}`} 
              className="pt-3 border-t border-[#e7e5dc] flex flex-col justify-center text-center font-mono"
            >
              <span className="text-xs font-black text-[#232320]">
                🎯 {p.confidence.score.toUpperCase()}
              </span>
              <span className="text-[9px] text-[#997b66] mt-0.5">
                Indexed across {p.confidence.total_discussions} crawl channels
              </span>
            </div>
          ))}

          {/* ======================================================= */}
          {/* DESIGN PROS SPOTLIGHT */}
          {/* ======================================================= */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
            Core Benefits
          </div>

          {products.map((p, idx) => (
            <div 
              id={`col-pros-cell-${idx}`}
              key={`pros-${idx}`} 
              className="pt-3 border-t border-[#e7e5dc] flex flex-col gap-1.5 text-left bg-emerald-50 bg-opacity-10 p-2 rounded-md border border-emerald-100 border-opacity-40"
            >
              {p.pros.slice(0, 3).map((item, keyIdx) => (
                <div key={keyIdx} className="text-[10px] text-[#232320] leading-snug flex items-start gap-1">
                  <span className="text-emerald-700 font-bold">+</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}

          {/* ======================================================= */}
          {/* SPECIFICATION CRITERIAS GRID */}
          {/* ======================================================= */}
          {/* A. Battery performance metrics */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
            🔋 Battery Life
          </div>

          {products.map((p, idx) => (
            <div 
              id={`col-specs-battery-cell-${idx}`}
              key={`specs-battery-${idx}`} 
              className="pt-3 border-t border-[#e7e5dc] text-xs font-bold text-[#232320] text-center font-mono"
            >
              ⚡ {p.product_metadata.specifications.batteryInfo || "42 hrs playback"}
            </div>
          ))}

          {/* B. General Weight */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
            ⚖️ Chassis Weight
          </div>

          {products.map((p, idx) => (
            <div 
              id={`col-specs-weight-cell-${idx}`}
              key={`specs-weight-${idx}`} 
              className="pt-3 border-t border-[#e7e5dc] text-xs font-bold text-[#232320] text-center font-mono"
            >
              🏋️ {p.product_metadata.specifications.weight || "250g framework"}
            </div>
          ))}

          {/* C. Manufacturer origins */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
            ⚙️ Manufacturer
          </div>

          {products.map((p, idx) => (
            <div 
              id={`col-specs-mfr-cell-${idx}`}
              key={`specs-mfr-${idx}`} 
              className="pt-3 border-t border-[#e7e5dc] text-xs font-semibold text-[#232320] text-center"
            >
              🏛️ {p.product_metadata.manufacturer}
            </div>
          ))}

          {/* D. Release dates */}
          <div className="flex items-center text-xs font-mono font-bold text-[#997b66] border-t border-[#e7e5dc] pt-3">
            🗓️ Release Period
          </div>

          {products.map((p, idx) => (
            <div 
              id={`col-specs-date-cell-${idx}`}
              key={`specs-date-${idx}`} 
              className="pt-3 border-t border-[#e7e5dc] text-xs font-semibold text-[#232320] text-center font-mono"
            >
              🗓️ {p.product_metadata.release_date}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
