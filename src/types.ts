export const VINTAGE_COLOR_TOKENS = {
  moss: "#797d62",
  sage: "#9b9b7a",
  tan: "#d9ae94",
  parchment: "#f1dca7",
  gold: "#ffcb69",
  clay: "#d08c60",
  brown: "#997b66",
  offwhite: "#faf9f5",
  charcoal: "#232320",
  border: "#e7e5dc"
};

export interface ProductMetadata {
  id?: string;
  name: string;
  brand: string;
  category: string;
  manufacturer: string;
  release_date: string;
  specifications: Record<string, string>;
}

export interface OverallSentiment {
  positive: number;
  negative: number;
  neutral: number;
  summary: string;
}

export interface QualityConfidence {
  score: 'Low' | 'Medium' | 'High' | 'Very High';
  total_discussions: number;
  total_articles: number;
  total_reviews: number;
  total_videos: number;
  total_ratings_count: number;
}

export interface RecommendationDetails {
  status: 'BUY' | 'DEPENDS' | 'AVOID';
  explanation: string;
  audience: string[];
  alternatives: string[];
}

export interface UserReviewRatingDistribution {
  stars_5: number;
  stars_4: number;
  stars_3: number;
  stars_2: number;
  stars_1: number;
  average_rating: number;
}

export interface ProductAspectTopic {
  name: string;
  mention_count: number;
  average_sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number; // Interval [-1, +1]
  representative_quotes: string[];
}

export interface IngestionSource {
  title: string;
  type: string;
  url?: string;
  weight: number;
  snippet?: string;
}

/**
 * Fully normalized product analysis output model
 */
export interface ProductAnalysis {
  product_metadata: ProductMetadata;
  overall_sentiment: OverallSentiment;
  confidence: QualityConfidence;
  ai_summary: string;
  pros: string[];
  cons: string[];
  topics: ProductAspectTopic[];
  recommendation: RecommendationDetails;
  rating_distribution: UserReviewRatingDistribution;
  ingestion_sources: IngestionSource[];
}

/**
 * Cross-product comparison matrix result model
 */
export interface RecommendationMatrixItem {
  productName: string;
  recommendation: 'BUY' | 'DEPENDS' | 'AVOID';
  sentimentIndicator: string; // Emoji mapping (🟢, 🟡, 🔴)
  confidenceText: string;
}

export interface CategoryWinnerItem {
  categoryName: string;
  winnerName: string;
  margin: string;
  reason: string;
}

export interface ComparisonAnalysisResult {
  overallWinner: string;
  recommendationMatrix: RecommendationMatrixItem[];
  categoryWinners: CategoryWinnerItem[];
  keyTakeaways: string[];
  specComparisonSummary: string;
}
