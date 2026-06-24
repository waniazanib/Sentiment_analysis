/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfidenceCard from "../../components/ConfidenceCard.tsx";
import RecommendationCard from "../../components/RecommendationCard.tsx";
import SearchBar from "../../components/SearchBar.tsx";
import { QualityConfidence, RecommendationDetails } from "../../types.ts";

describe("ConfidenceCard Component", () => {
  test("renders Medium confidence level with placeholder descriptions by default", () => {
    const mockConfidence: QualityConfidence = {
      score: "Medium",
      total_discussions: 12,
      total_articles: 3,
      total_reviews: 5,
      total_videos: 4,
      total_ratings_count: 50,
    };

    render(<ConfidenceCard confidence={mockConfidence} />);

    // Assert that the score displays beautifully
    expect(screen.getByText("🟡 MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("3 sources")).toBeInTheDocument();
    expect(screen.getByText("50 reviews")).toBeInTheDocument();
    expect(screen.getByText("12 Channels Indexed")).toBeInTheDocument();
  });

  test("renders Very High confidence badge correctly with customized detail messages", () => {
    const mockConfidence: QualityConfidence = {
      score: "Very High",
      total_discussions: 100,
      total_articles: 20,
      total_reviews: 40,
      total_videos: 40,
      total_ratings_count: 500,
    };

    render(<ConfidenceCard confidence={mockConfidence} />);

    expect(screen.getByText("💎 VERY HIGH")).toBeInTheDocument();
    expect(screen.getByText("20 sources")).toBeInTheDocument();
    expect(screen.getByText("500 reviews")).toBeInTheDocument();
    expect(screen.getByText("100 Channels Indexed")).toBeInTheDocument();
  });
});

describe("RecommendationCard Component", () => {
  test("correctly renders details for state BUY verdict with alternatives lists", () => {
    const mockRec: RecommendationDetails = {
      status: "BUY",
      explanation: "Outstanding performance-to-cost ratios.",
      audience: ["Audiophiles", "Gamers"],
      alternatives: ["Alternative Model A", "Alternative Model B"],
    };

    render(<RecommendationCard recommendation={mockRec} />);

    expect(screen.getByRole("heading", { name: /RECOMMENDED FOR PURCHASE/i })).toBeInTheDocument();
    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText("⚡ Decision Reasoning:")).toBeInTheDocument();
    expect(screen.getByText(/Outstanding performance-to-cost ratios\./)).toBeInTheDocument();
    
    // Assert target audiences and alternative entries
    expect(screen.getByText("👤 Audiophiles")).toBeInTheDocument();
    expect(screen.getByText("🎧 Alternative Model A")).toBeInTheDocument();
  });

  test("renders conditionally for state DEPENDS with yellow warnings badge labels", () => {
    const mockRec: RecommendationDetails = {
      status: "DEPENDS",
      explanation: "Value hinges on firmware configurations.",
      audience: ["Niche Developers"],
      alternatives: ["Slightly stable variant"],
    };

    render(<RecommendationCard recommendation={mockRec} />);

    expect(screen.getByRole("heading", { name: /REQUIRES CAREFUL EVALUATION/i })).toBeInTheDocument();
    expect(screen.getByText("DEPENDS")).toBeInTheDocument();
    expect(screen.getByText("👤 Niche Developers")).toBeInTheDocument();
    expect(screen.getByText("🎧 Slightly stable variant")).toBeInTheDocument();
  });

  test("renders layout with warnings of AVOID when status tier is set directly to AVOID", () => {
    const mockRec: RecommendationDetails = {
      status: "AVOID",
      explanation: "Abnormal failure frequencies reported in logs.",
      audience: ["Nobody"],
      alternatives: ["Safe device"],
    };

    render(<RecommendationCard recommendation={mockRec} />);

    // Access the heading and check that it contains the text values properly
    expect(screen.getByRole("heading", { name: /CRITICAL FAULTS.*AVOID/i })).toBeInTheDocument();
    expect(screen.getByText("AVOID")).toBeInTheDocument();
  });
});

describe("SearchBar Component", () => {
  test("triggers text query input and submission changes elegantly", () => {
    const onSearchMock = vi.fn();
    const onAddToCompareMock = vi.fn();

    render(
      <SearchBar
        onSearch={onSearchMock}
        onAddToCompare={onAddToCompareMock}
        compareCount={0}
      />
    );

    const input = screen.getByPlaceholderText(/Enter brand and model/) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Type text query
    fireEvent.change(input, { target: { value: "Sony WH-1000XM6" } });
    expect(input.value).toBe( "Sony WH-1000XM6");

    // Click submit search icon trigger button
    const searchBtn = screen.getByRole("button", { name: /Analyze/ });
    fireEvent.click(searchBtn);

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith("Sony WH-1000XM6");
  });

  test("opens user suggestions popup on text focus and handles suggestion item selections", () => {
    const onSearchMock = vi.fn();

    render(
      <SearchBar
        onSearch={onSearchMock}
        compareCount={0}
      />
    );

    const input = screen.getByPlaceholderText(/Enter brand and model/);
    
    // Focus search input to open recommendations panel list
    fireEvent.focus(input);

    const suggestionsHeader = screen.getByText("💡 SUGGESTIONS & POPULAR COMPARISONS");
    expect(suggestionsHeader).toBeInTheDocument();

    // Suggestion item selection trigger
    const suggestionRow = screen.getByText(/Sony WH-1000XM6/);
    fireEvent.click(suggestionRow);

    expect(onSearchMock).toHaveBeenCalledWith("Sony WH-1000XM6");
  });

  test("limits search and triggers comparisons additions callbacks on click", () => {
    const onSearchMock = vi.fn();
    const onAddToCompareMock = vi.fn();

    const { container } = render(
      <SearchBar
        onSearch={onSearchMock}
        onAddToCompare={onAddToCompareMock}
        compareCount={2}
      />
    );

    const input = screen.getByPlaceholderText(/Enter brand and model/);
    fireEvent.change(input, { target: { value: "Sennheiser" } });

    // Target the comparison button by its unique element ID
    const compareBtn = container.querySelector("#trigger-add-comparator-btn");
    expect(compareBtn).toBeInTheDocument();
    fireEvent.click(compareBtn!);

    expect(onAddToCompareMock).toHaveBeenCalledWith("Sennheiser");
  });

  test("renders limits indicators when comparisons slots are completely populated", () => {
    const onSearchMock = vi.fn();
    const onAddToCompareMock = vi.fn();

    render(
      <SearchBar
        onSearch={onSearchMock}
        onAddToCompare={onAddToCompareMock}
        compareCount={4} // Hit limit
      />
    );

    expect(screen.getByText(/Comparison maximum limit of 4 matched products reached/)).toBeInTheDocument();
  });
});
