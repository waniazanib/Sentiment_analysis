/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";

// Proptypes interface for SearchBar
interface SearchBarProps {
  onSearch: (query: string) => void; // Triggered when a product is analyzed
  onAddToCompare?: (query: string) => void; // Triggered when product is appended directly to active comparison
  isCompareMode?: boolean; // Toggles comparison layout buttons
  compareCount?: number; // Tracking active product comparisons count
  isLoading?: boolean; // Loading states
}

// Preset products for demonstration with high-fidelity analytical coverage
const DEMO_PRODUCTS = [
  "Sony WH-1000XM6",
  "Bose QuietComfort Ultra",
  "Apple AirPods Max 2",
  "Sennheiser Momentum 5",
  "Sony LinkBuds S",
  "Bose QuietComfort II"
];

export default function SearchBar({
  onSearch,
  onAddToCompare,
  isCompareMode = false,
  compareCount = 0,
  isLoading = false
}: SearchBarProps) {
  // Track current text input query value
  const [query, setQuery] = useState("");
  // Determine if dropdown suggestions box is open
  const [isOpen, setIsOpen] = useState(false);
  // Outer reference to track click-aways
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions block if user clicks outside of search container
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    // Listen for global user clicks
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Remove mouse down listeners on cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter list of preset products based on user query
  const filteredSuggestions = query
    ? DEMO_PRODUCTS.filter((item) =>
        item.toLowerCase().includes(query.toLowerCase())
      )
    : DEMO_PRODUCTS;

  // Handle direct manual submit form triggers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Trigger primary analyze search
      onSearch(query.trim());
      // Close suggestion box
      setIsOpen(false);
    }
  };

  // Selection handler from Suggestions Box
  const handleSelectProduct = (product: string) => {
    setQuery(product);
    onSearch(product);
    setIsOpen(false);
  };

  // Multi-comparator addition handler
  const handleAddCompareProduct = (productName: string, e: React.MouseEvent) => {
    // Avoid bubble select actions down to row triggers
    e.stopPropagation();
    if (onAddToCompare) {
      onAddToCompare(productName);
      setIsOpen(false);
    }
  };

  return (
    <div id="search-bar-scope-wrapper" className="w-full relative" ref={containerRef}>
      {/* Search Input and Control triggers row */}
      <form onSubmit={handleSubmit} className="flex gap-2 w-full">
        <div className="relative flex-1">
          {/* Main search text field */}
          <input
            id="product-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="🔍 Enter brand and model (e.g. Sony WH-1000XM6)..."
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#faf9f5] border-2 border-[#e7e5dc] rounded-lg text-[#232320] text-sm focus:outline-none focus:border-[#797d62] transition-colors"
          />

          {/* Quick empty inputs reset */}
          {query && (
            <button
              id="clear-query-tracker"
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#997b66] hover:text-[#797d62]"
            >
              ❌
            </button>
          )}
        </div>

        {/* Dynamic primary action analyze button */}
        <button
          id="trigger-analysis-btn"
          type="submit"
          disabled={isLoading || !query.trim()}
          style={{ backgroundColor: "var(--color-moss)" }}
          className="px-6 py-3 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          {isLoading ? "🔬 Analyzing..." : "🔎 Analyze"}
        </button>

        {/* Quick add comparison shortcut */}
        {onAddToCompare && query.trim() && (
          <button
            id="trigger-add-comparator-btn"
            type="button"
            disabled={compareCount >= 4}
            onClick={() => onAddToCompare(query.trim())}
            style={{ backgroundColor: "var(--color-clay)" }}
            className="px-4 py-3 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            ➕ Compare
          </button>
        )}
      </form>

      {/* Comparison Limit defensive threshold warning indicator banner */}
      {compareCount >= 4 && (
        <div className="mt-2 text-xs text-[#d08c60] flex items-center gap-1">
          ⚠️ Comparison maximum limit of 4 matched products reached. Please dismiss active panels to load others.
        </div>
      )}

      {/* suggestions dropdown box */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          id="suggestions-dropdown-container"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-[#e7e5dc] rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          <div className="px-3 py-2 text-xs font-semibold text-[#997b66] border-b border-[#e7e5dc] bg-[#faf9f5]">
            💡 SUGGESTIONS & POPULAR COMPARISONS
          </div>
          {filteredSuggestions.map((item, idx) => (
            <div
              id={`suggestion-row-${idx}`}
              key={item}
              onClick={() => handleSelectProduct(item)}
              className="flex justify-between items-center px-4 py-3 hover:bg-[#f1dca7] hover:bg-opacity-30 cursor-pointer text-sm font-medium text-[#232320]"
            >
              <span>🎧 {item}</span>
              {onAddToCompare && (
                <button
                  id={`action-compare-suggestion-${idx}`}
                  type="button"
                  disabled={compareCount >= 4}
                  onClick={(e) => handleAddCompareProduct(item, e)}
                  style={{ color: "var(--color-moss)" }}
                  className="text-xs hover:underline disabled:opacity-30 flex items-center gap-1 font-bold"
                >
                  ➕ Compare
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
