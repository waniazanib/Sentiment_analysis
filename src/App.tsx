/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
// Importing all 8 modular dashboard components in order
import SearchBar from "./components/SearchBar.tsx";
import SentimentPieChart from "./components/SentimentPieChart.tsx";
import ConfidenceCard from "./components/ConfidenceCard.tsx";
import SummaryCard from "./components/SummaryCard.tsx";
import ProsConsCard from "./components/ProsConsCard.tsx";
import RecommendationCard from "./components/RecommendationCard.tsx";
import TopicAnalysisChart from "./components/TopicAnalysisChart.tsx";
import ComparisonTable from "./components/ComparisonTable.tsx";

// Importing standardized type contracts
import { ProductAnalysis } from "./types.ts";

export default function App() {
  // Active analyzed product detail state (for the 5 segment diagnostic panels)
  const [activeProduct, setActiveProduct] = useState<ProductAnalysis | null>(null);
  // Compare track list containing up to 4 concurrent products
  const [compareList, setCompareList] = useState<ProductAnalysis[]>([]);
  
  // Pipeline processing status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Initial load effect: pre-populate dashboard with trending, pre-scraped models
  useEffect(() => {
    async function loadInitialDemos() {
      setIsLoading(true);
      setErrorText(null);
      try {
        // Run ingestion requests through the proxy Express API in parallel
        const [sonyRes, boseRes] = await Promise.all([
          fetch("/api/products/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Sony WH-1000XM6", brand: "Sony" })
          }).then(res => {
            if (!res.ok) throw new Error("Sony initialization failed");
            return res.json();
          }),
          fetch("/api/products/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Bose QuietComfort Ultra", brand: "Bose" })
          }).then(res => {
            if (!res.ok) throw new Error("Bose initialization failed");
            return res.json();
          })
        ]);

        // Put the premier model in active review focus
        setActiveProduct(sonyRes);
        // Load both into compare list to display comparison boards instantly
        setCompareList([sonyRes, boseRes]);
      } catch (err: any) {
        console.error("Initialization demos failed:", err);
        setErrorText("Warning: Failed to load pre-scraped audio data. Standard simulations loaded instead.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialDemos();
  }, []);

  // Handler: Analyzes and selects a specific product model
  const handleProductSearch = async (productName: string) => {
    if (!productName.trim()) return;
    setIsLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/products/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Inference ingestion stalled" }));
        throw new Error(errData.message || "Ingestion analysis failed on backend server.");
      }
      const result = await response.json();
      // Main focus becomes newly queried product
      setActiveProduct(result);
    } catch (err: any) {
      console.error("Analysis execution failed:", err);
      setErrorText(err.message || "An unexpected error occurred during ingestion.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Refreshes and recalculates live product analytical details
  const handleProductRefresh = async (productName: string) => {
    if (!productName.trim()) return;
    setIsLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/products/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName, forceRefresh: true })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Inference ingestion stalled" }));
        throw new Error(errData.message || "Live ingestion refresh failed on backend.");
      }
      const result = await response.json();
      
      // Update active focused product
      setActiveProduct(result);
      
      // Update the compare list if it already contains this product
      setCompareList(prev => prev.map(p => 
        p.product_metadata.name.toLowerCase() === productName.toLowerCase() ? result : p
      ));
      
      setErrorText(`Success: Finished real-time recalculation for ${productName}!`);
    } catch (err: any) {
      console.error("Refresh execution failed:", err);
      setErrorText(err.message || "We encountered an unexpected error during live recalculation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Appends a specific product model directly into Comparison list
  const handleAddToCompare = async (productName: string) => {
    if (!productName.trim()) return;

    // Reject duplicate product insertions
    if (compareList.some(p => p.product_metadata.name.toLowerCase() === productName.toLowerCase().trim())) {
      setErrorText(`"${productName}" already exists on the active compare matrix.`);
      return;
    }

    // Shield threshold limit
    if (compareList.length >= 4) {
      setErrorText("Maximum comparative limit of 4 models has been reached. Please dismiss active rails to load new selections.");
      return;
    }

    setIsLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/products/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Inference ingestion stalled" }));
        throw new Error(errData.message || "Failed to load product for comparison.");
      }
      const result = await response.json();
      // Append product and update compare list state
      setCompareList(prev => [...prev, result]);
      // Also sync focal focus representation to the last added item
      setActiveProduct(result);
    } catch (err: any) {
      console.error("Comparative addition failed:", err);
      setErrorText(err.message || "Failed to add target product to comparison.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Removes columns from Comparison list
  const handleDismissCompareProduct = (productName: string) => {
    setCompareList(prev => prev.filter(p => p.product_metadata.name !== productName));
  };

  // Handler: Global panel wipe registers
  const handleClearCompareList = () => {
    setCompareList([]);
  };

  return (
    <div id="application-container-viewport" className="min-h-screen bg-[#faf9f5] py-8 px-4 sm:px-6 lg:px-8">
      {/* Centered master layout block restricting horizontal width limits */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ======================================================== */}
        {/* APP TITLE HEADER BLOCK */}
        {/* ======================================================== */}
        <header id="master-page-header" className="text-center space-y-2 pb-6 border-b border-[#e7e5dc]">
          <h1 className="text-3xl font-black text-[#232320] tracking-tight sm:text-4xl mt-2">
            Insights & Sentiment Engine
          </h1>
        </header>

        {/* ======================================================== */}
        {/* PIPELINE SEARCH CONTROLS */}
        {/* ======================================================== */}
        <section id="search-orchestrator-panel" className="themed-card">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#997b66]">
              🔎 MULTI-SOURCE CRAWLER QUERY
            </h3>
            <SearchBar 
              onSearch={handleProductSearch}
              onAddToCompare={handleAddToCompare}
              compareCount={compareList.length}
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Dynamic status feedback alert messages banner */}
        {errorText && (
          <div 
            id="global-alert-toast"
            className="p-4 bg-orange-50 border-l-4 border-[#d08c60] text-xs text-[#d08c60] rounded-r-lg font-mono flex items-center justify-between"
          >
            <span>⚠️ {errorText}</span>
            <button 
              onClick={() => setErrorText(null)} 
              className="text-[#997b66] hover:text-[#232320] font-bold leading-none shrink-0"
            >
              ✕ Close
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. COMPARISON TABLE COMPONENT PANEL */}
        {/* ======================================================== */}
        {compareList.length > 0 && (
          <section id="comparison-metric-board-scope">
            <ComparisonTable 
              products={compareList} 
              onDismissProduct={handleDismissCompareProduct} 
              onClearAll={handleClearCompareList}
            />
          </section>
        )}

        {/* ======================================================== */}
        {/* FOCUS PRODUCT SECTION (Focal diagnosed models details) */}
        {/* ======================================================== */}
        {activeProduct ? (
          <div id="active-diagnostic-scaffold" className="space-y-6">
            
            {/* Visual separator banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#e7e5dc] pb-4">
              <div className="flex items-center gap-3 w-full">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#997b66] uppercase whitespace-nowrap">
                  🧭 DETAILED REPORT IN FOCUS: {activeProduct.product_metadata.name.toUpperCase()}
                </span>
                <span className="h-[2px] w-full bg-[#e7e5dc] block" />
              </div>
              <button
                id="force-live-recalculate-btn"
                onClick={() => handleProductRefresh(activeProduct.product_metadata.name)}
                disabled={isLoading}
                className="shrink-0 text-xs font-mono font-bold text-[#797d62] hover:text-[#232320] bg-[#e7e5dc] hover:bg-[#d8d6cc] px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "⌛ Processing..." : "🔄 Force Live Recalculate"}
              </button>
            </div>

            {/* FIRST ROW: SentimentPieChart + ConfidenceCard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <section id="sentiment-analysis-module" className="h-full">
                <SentimentPieChart 
                  positive={activeProduct.overall_sentiment.positive}
                  neutral={activeProduct.overall_sentiment.neutral}
                  negative={activeProduct.overall_sentiment.negative}
                  summaryText={activeProduct.overall_sentiment.summary}
                />
              </section>

              <section id="confidence-scoring-module" className="h-full">
                <ConfidenceCard confidence={activeProduct.confidence} />
              </section>
            </div>

            {/* SECOND ROW: SummaryCard (Specs vs Exec Analysis) */}
            <section id="metadata-summary-module">
              <SummaryCard 
                metadata={activeProduct.product_metadata} 
                aiSummary={activeProduct.ai_summary}
              />
            </section>

            {/* THIRD ROW: ProsConsCard (Side-by-side praisings vs grievances) */}
            <section id="pros-cons-analysis-module">
              <ProsConsCard 
                pros={activeProduct.pros} 
                cons={activeProduct.cons}
              />
            </section>

            {/* FOURTH ROW: RecommendationCard (Action verdict personas suggestions) */}
            <section id="buying-verdict-module">
              <RecommendationCard recommendation={activeProduct.recommendation} />
            </section>

            {/* FIFTH ROW: TopicAnalysisChart (Aspect mentions & supporting quote details expansion) */}
            <section id="aspects-topics-module">
              <TopicAnalysisChart topics={activeProduct.topics} />
            </section>

          </div>
        ) : (
          // Falling backing empty layout block
          <div id="zero-state-overlay" className="themed-card text-center py-16 space-y-4">
            <span className="text-4xl block">🎧</span>
            <h3 className="text-md font-bold text-[#232320]">No Active Diagnostics Focused</h3>
            <p className="text-xs text-[#997b66] max-w-sm mx-auto">
              Scrape and load models above or use the popular suggestions list to inject ready comparison details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
