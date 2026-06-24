# Insights Premium Comparison Dashboard Design

This design specification outlines the architectural blueprint, UX considerations, bento-inspired side-by-side layout templates, and interactive states for the **Insights Comparison Dashboard**. The matrix handles comparing **2, 3, or 4 products** concurrently.


---

## 🎨 Layout and Structural Architecture
To support arbitrary comparison widths (2, 3, or 4 items) on variable displays without layout breaks, the system implements a **Fluid Grid Columns Model**:

-   **2 Products**: Dual $50\% - 50\%$ layout sections. Generous spacing with maximum detail.
-   **3 Products**: Three $33\% - 33\% - 33\%$ equal spacing column panes.
-   **4 Products**: Four $25\% - 25\% - 25\% - 25\%$ dense layout tracks. Uses condensed typography grids and responsive horizontal scrolling on compact desktop viewports.

The overall layout remains consistent with the earth-toned, high-contrast, nostalgically clean visual aesthetic of the main app.

---

## 🗺️ High-Fidelity Desktop Wireframe (3-Way Product Comparison)

```
+--------------------------------------------------------------------------------------------------------+
|  [Logo] Insights 🔬                                                     [Home]  [Compare]  [Methodology]   |
+--------------------------------------------------------------------------------------------------------+
|                                                                                                        |
|   🌿 SIDE-BY-SIDE PRODUCT COMPARE MATRIX                                                                |
|   Compare specifications, sentiment scores, and ultimate recommendation cards.                         |
|                                                                                                        |
|   +---------------------------------------+  +-----------------------------------+  +---------------+  |
|   | 🔍 Search and Add Product to compare  |  | Filter By Aspect:  [All Aspects v] |  | [Clear All ⌫] |  |
|   +---------------------------------------+  +-----------------------------------+  +---------------+  |
|                                                                                                        |
+--------------------------------------------------------------------------------------------------------+
|                                                                                                        |
|   [THE MATRIX BOARD]                                                                                   |
|                                                                                                        |
|   FEATURE CARD         |  PRODUCT A:               |  PRODUCT B:               |  PRODUCT C:           |
|   (Metric Dimension)   |  Sony WH-1000XM6          |  Bose QuietComfort Ultra  |  Apple AirPods Max 2  |
|   ---------------------|---------------------------|---------------------------|---------------------- |
|   OVERALL DECISION     |  👑 WINNER                  |  ⚠️ DEPENDS                |  ❌ AVOID             |
|                        |  [ BUY ]                  |  [ DEPENDS ]              |  [ AVOID ]            |
|                        |                           |                           |                       |
|   CONFIDENCE LEVEL     |  💎 VERY HIGH             |  🟢 HIGH                  |  🟡 MEDIUM            |
|                        |  (Based on 382 sources)   |  (Based on 145 sources)   |  (Based on 84 sources)|
|                        |                           |                           |                       |
|   SENTIMENT RATIO      |  🟢 88%  🟡 8%  🔴 4%      |  🟢 64%  🟡 22%  🔴 14%    |  🟢 42%  🟡 18%  🔴 40%|
|                        |  [██████████████████░░]   |  [████████████░░░░░░░]     |  [████████░░░░░░░░░░] |
|                        |                           |                           |                       |
|   AI SUMMARY SHIFT     |  Phenomenal sound stage,   | Excellent comfort levels, | Clear highs, but high |
|                        |  unrivaled noise cancel,  | but companion settings is | weight and charging   |
|                        |  excellent value score.   | slightly clunky.          | limits restrict use.  |
|                        |                           |                           |                       |
|   ---------------------|---------------------------|---------------------------|-----------------------|
|   [CATEGORY WINNERS]   |                           |                           |                       |
|   Audio Performance    |  🟢 👑 WINNER (+0.92)     |  🟡 (+0.78)               |  🟡 (+0.81)           |
|   Battery Endurance    |  🟢 👑 WINNER (+0.88)     |  🟡 (+0.65)               |  🔴 (-0.12)           |
|   Retail Pricing Value |  🟢 👑 WINNER (+0.55)     |  🟡 (+0.24)               |  🔴 (-0.68)           |
|   Hardware Ergonomics  |  🟡 (+0.72)               |  🟢 👑 WINNER (+0.91)     |  🔴 (-0.15)           |
|   Stable Software Suite|  🟢 👑 WINNER (+0.81)     |  🔴 (-0.10)               |  🟡 (+0.52)           |
|   ---------------------|---------------------------|---------------------------|-----------------------|
|   KEY SPECIFICATIONS   |                           |                           |                       |
|   Release Date         |  March 2026               |  November 2025            |  October 2025         |
|   Battery Life Hr      |  42 hrs                   |  24 hrs                   |  20 hrs               |
|   Weight               |  250g                     |  252g                     |  385g                 |
|   ANC Type             |  Active Adaptive          |  Active Custom            |  Active Direct        |
|                                                                                                        |
+--------------------------------------------------------------------------------------------------------+
```

---

## 🧩 Detailed Functional Components

### 1. Comparative Action Header
*   **Search and Add Bar**: An interactive input field allowing the user to search products dynamically. Typing queries drops down matches that can be added into the active layout immediately (`Add to Comparison +`).
*   **Add Limit Prevention**: If the user has loaded 4 products, the bar behaves defensively: disables further additions, badges the bar with an informative warning (`⚠️ Comparison Limit of 4 reached`), and directs the user to remove an item before appending again.
*   **Global Reset Controls**: A clean button reading `Clear Balance ⌫` to return to an empty layout selection state easily.

### 2. Side-By-Side Product Cards
*   Each selected product column features an interactive header block:
    -   **Dismissal Pin**: A clean, top-right `✕` trigger to immediately drop that product column and dynamically slide the remaining items to absorb the grid width smoothly.
    -   **Title Tag**: Heavy typography detailing the manufacturer, name, and primary category tag.

### 3. Ultimate Recommendation and Category Winners
The top visual layer displays structural, calculated recommendations derived directly from the pipeline scores:
*   **Recommendation Row**: Displays `👑 WINNER` badges matched exclusively with numerical checks.
*   **Decision Markers**: Color-coded banners displaying the core decision criteria:
    -   `BUY 🟢` (Using `--primary-moss` hex highlight)
    -   `DEPENDS 🟡` (Using `--sand-tint` or `--vintage-parchment`)
    -   `AVOID 🔴` (Using `--warm-clay`)

### 4. Consolidated Sentiment and Confidence Meters
*   **Sentiment Comparison Tracks**: Renders horizontal Recharts Stacked Bar charts mapping out complete ratios (Positive vs. Neutral vs. Negative) side-by-side. 
*   **Confidence Badge Matchup**: Highlights differences in data density directly: e.g., representing Product A with a `💎 VERY HIGH` badge (based on 380 reviews), and Product B with a `🟡 MEDIUM` badge (based on 30 reviews) side-by-side to ensure the user can accurately evaluate the reliability of each recommendation.

### 5. Multi-Aspect Winners Breakdown
This component visualizes categorical feature comparisons directly. The backend reviews aspect averages across products and stamps crowns (`👑 Winner`) next to the best-performing item for each aspect:
*   **Audio quality Aspect**: Displays calculated sentiment scores side-by-side (e.g., `+0.92` vs `+0.78` vs `+0.81`).
*   **Battery aspect**: Compares battery performance values, applying the `Winner` badge to the highest score.
*   **Price and Build Quality**: Allows horizontal comparison of price categories, highlighting the model with the best overall value metrics.

---

## 📱 Mobile Adaptation: "The Scrollable Columns Model"
Rendering 4 columns side-by-side on an iPhone or Android screen is functionally impossible without breaking readability. The premium comparison page adapts elegantly:

1.  **Fixed Left Dimension Column**: The leftmost metric description column (e.g., Price, Sentiment, Battery) remains pinned to the left edge of the screen as a static anchor.
2.  **Horizontal Swipe Tracks**: The product columns exist inside a left-to-right swipeable horizontal viewport with subtle page indicators. This allows the user to swipe and compare details without sacrificing legibility or table alignment.
3.  **Sticky Target Match Indicator**: Displays an interactive sticky ribbon at the top showing the current visible models in the viewport to maintain clear context.
