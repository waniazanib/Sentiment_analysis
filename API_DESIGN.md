# Insights API Design Specification

This document details the backend REST API specifications for **Insights** / **ProductPulse**. It outlines endpoints, validation rules, request/response schemas, and error handling strategies in an OpenAPI 3.0 compatible format.

---

## 🛡️ Global Error Handling & Fault Tolerance Strategy

Our backend utilizes a zero-reveal, unified error reporting structure.

1. **Rule of Fault Isolation**: During multi-source parallel data fetching (Google Search, YouTube, Wikipedia, Open Review), **`Promise.allSettled()`** is used exclusively.
2. **Never leak implementation specifics**: If an external API fails (e.g., YouTube quota exceeded), the system logs the failure internally, falls back to remaining streams, and delivers results containing only successfully aggregated components.
3. **Structured RFC 7807 Error Responses**: Standard API failures use the following JSON payload:

```json
{
  "status": 400,
  "code": "BAD_REQUEST",
  "message": "The product comparison limit was exceeded.",
  "errors": [
    {
      "field": "productIds",
      "issue": "Array must contain between 2 and 4 elements."
    }
  ],
  "timestamp": "2026-06-03T17:39:36Z"
}
```

---

## 📂 Summary of Endpoints

| Method | Endpoint | Description |
|---|---|---|
| **GET** | `/api/products/search` | Dynamic keyword search across cached database products and Google Search suggestions. |
| **POST** | `/api/products/analyze` | Initiates the ingestion & analysis pipelines (multi-source retrieval + Gemini AI processing). |
| **GET** | `/api/products/{id}` | Retrieves full structural aggregation, topic clusters, sentiment chart values, and recommendations. |
| **POST** | `/api/products/compare` | Evaluates side-by-side performance grids for 2, 3, or 4 selected products. |
| **POST** | `/api/searches` | Saves search history records linked to active user sessions. |
| **GET** | `/api/products/cached` | Fetches a list of highly discussed, pre-analyzed products to render historical trend views instantly. |

---

## 📝 OpenAPI 3.0 Specification

```yaml
openid: "3.0.3"
info:
  title: "Insights / ProductPulse API"
  version: "1.0.0"
  description: "Production-grade backend core for ProductPulse product review aggregation and sentiment analysis."
paths:

  /api/products/search:
    get:
      summary: "Search Product"
      description: "Performs full-text indexing queries over the PostgreSQL database of products and returns key autocomplete attributes."
      parameters:
        - name: "q"
          in: "query"
          required: true
          schema:
            type: "string"
            minLength: 2
          description: "Search keyword (e.g., 'iPhone 15')"
        - name: "limit"
          in: "query"
          required: false
          schema:
            type: "integer"
            default: 10
            maximum: 50
      responses:
        '200':
          description: "Successful search operation"
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  hits:
                    type: "array"
                    items:
                      $ref: '#/components/schemas/ProductPreview'
        '400':
          $ref: '#/components/responses/400BadRequest'

  /api/products/analyze:
    post:
      summary: "Analyze Product"
      description: "The pipeline entrypoint. Tries to find a cached product. If stale or new, triggers parallel fetches via Google Custom Search, YouTube, Wikipedia, and Open Review. Runs Gemini LLM sentiment mining, aspect-based clustering, and outputs full decision card results within a strict 10-second target."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: "object"
              required:
                - name
                - brand
              properties:
                name:
                  type: "string"
                  minLength: 1
                  maxLength: 100
                  example: "Galaxy S25"
                brand:
                  type: "string"
                  minLength: 1
                  maxLength: 50
                  example: "Samsung"
                category:
                  type: "string"
                  example: "Smartphones"
                forceRefresh:
                  type: "boolean"
                  default: false
                  description: "True forces real-time update, skipping cached thresholds."
      responses:
        '200':
          description: "Returns completed aggregate analysis successfully"
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductAnalysis'
        '202':
          description: "Triggered analysis in background (for long-wait conditions)"
        '400':
          $ref: '#/components/responses/400BadRequest'
        '502':
          description: "Upstream failure / Gemini quota execution aborts"

  /api/products/{id}:
    get:
      summary: "Product Details"
      description: "Recovers structured product aggregates, factual specifications, comprehensive pros/cons lists, and confidence indicators."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
            format: "uuid"
      responses:
        '200':
          description: "Highly polished analysis overview payload"
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductAnalysis'
        '404':
          $ref: '#/components/responses/404NotFound'

  /api/products/compare:
    post:
      summary: "Compare Products"
      description: "Loads exact metadata arrays and matches horizontal categories (Winner state, side-by-side AI summaries, and rating counts)."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: "object"
              required:
                - productIds
              properties:
                productIds:
                  type: "array"
                  minItems: 2
                  maxItems: 4
                  items:
                    type: "string"
                    format: "uuid"
                  example: ["a3b83984-9de5-427f-8ff3-14980bb6be02", "d71b3e9a-7c90-4da0-9907-8e67a6d8c368"]
      responses:
        '200':
          description: "A complete side-by-side comparison matrix layout"
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  comparison_id:
                    type: "string"
                    format: "uuid"
                  products:
                    type: "array"
                    items:
                      type: "object"
                      properties:
                        id:
                          type: "string"
                          format: "uuid"
                        name:
                          type: "string"
                        brand:
                          type: "string"
                        sentiment_score:
                          type: "number"
                        average_rating:
                          type: "number"
                        ai_summary:
                          type: "string"
                  category_winners:
                    type: "object"
                    properties:
                      battery:
                        type: "string"
                        description: "Product UUID indicating winner"
                      camera:
                        type: "string"
                      price:
                        type: "string"
                      display:
                        type: "string"
                      build_quality:
                        type: "string"
        '400':
          $ref: '#/components/responses/400BadRequest'

  /api/searches:
    post:
      summary: "Save Search History Logs"
      description: "Records queries made by users into telemetry tracking table. Integrates with auth user identities."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: "object"
              required:
                - query
              properties:
                query:
                  type: "string"
                  minLength: 1
                productId:
                  type: "string"
                  format: "uuid"
                  nullable: true
      responses:
        '201':
          description: "Audit trail log generated"
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  id:
                    type: "string"
                    format: "uuid"
                  success:
                    type: "boolean"

  /api/products/cached:
    get:
      summary: "Fetch Cached Results"
      description: "Returns general pre-populated catalog options with high discussion counts, allowing home feed presentation without cold queries."
      parameters:
        - name: "category"
          in: "query"
          required: false
          schema:
            type: "string"
        - name: "limit"
          in: "query"
          required: false
          schema:
            type: "integer"
            default: 6
      responses:
        '200':
          description: "Successful response"
          content:
            application/json:
              schema:
                type: "array"
                items:
                  type: "object"
                  properties:
                    id:
                      type: "string"
                      format: "uuid"
                    name:
                      type: "string"
                    brand:
                      type: "string"
                    category:
                      type: "string"
                    confidence_score:
                      type: "string"
                    recommendation_status:
                      type: "string"
                    sentiment_ratio:
                      type: "object"
                      properties:
                        positive:
                          type: "number"
                        negative:
                          type: "number"
                        neutral:
                          type: "number"

components:
  schemas:
    ProductPreview:
      type: "object"
      properties:
        id:
          type: "string"
          format: "uuid"
        name:
          type: "string"
        brand:
          type: "string"
        category:
          type: "string"

    ProductAnalysis:
      type: "object"
      properties:
        product_metadata:
          type: "object"
          properties:
            id:
              type: "string"
              format: "uuid"
            name:
              type: "string"
            brand:
              type: "string"
            category:
              type: "string"
            manufacturer:
              type: "string"
            release_date:
              type: "string"
            specifications:
              type: "object"
        overall_sentiment:
          type: "object"
          properties:
            positive:
              type: "number"
              example: 65.4
            negative:
              type: "number"
              example: 22.1
            neutral:
              type: "number"
              example: 12.5
        confidence:
          type: "object"
          properties:
            score:
              type: "string"
              enum: ["Low", "Medium", "High", "Very High"]
            total_discussions:
              type: "integer"
            total_articles:
              type: "integer"
            total_reviews:
              type: "integer"
            total_videos:
              type: "integer"
            total_ratings_count:
              type: "integer"
        ai_summary:
          type: "string"
          example: "Users consistently praise performance and battery life. The most common complaints involve overheating during gaming."
        pros:
          type: "array"
          items:
            type: "string"
          example: ["Strong battery endurance", "Exceptional camera sensor", "Vibrant colors", "Fast performance", "Ergonomic form"]
        cons:
          type: "array"
          items:
            type: "string"
          example: ["Slightly expensive", "No charging block in box", "Runs warm during intense tasks", "Glossy back attracts dust", "Heavy weight"]
        topics:
          type: "array"
          items:
            $ref: '#/components/schemas/TopicAspect'
        recommendation:
          type: "object"
          properties:
            status:
              type: "string"
              enum: ["BUY", "DEPENDS", "AVOID"]
            explanation:
              type: "string"
        rating_distribution:
          type: "object"
          properties:
            stars_5:
              type: "integer"
            stars_4:
              type: "integer"
            stars_3:
              type: "integer"
            stars_2:
              type: "integer"
            stars_1:
              type: "integer"

    TopicAspect:
      type: "object"
      properties:
        name:
          type: "string"
          example: "Battery"
        mention_count:
          type: "integer"
        average_sentiment:
          type: "string"
          enum: ["positive", "negative", "neutral"]
        sentiment_score:
          type: "number"
        representative_quotes:
          type: "array"
          items:
            type: "string"

  responses:
    400BadRequest:
      description: "Validation or semantic mapping constraint failure."
      content:
        application/json:
          schema:
            type: "object"
            properties:
              status:
                type: "integer"
              code:
                type: "string"
              message:
                type: "string"
              errors:
                type: "array"
                items:
                  type: "object"
                  properties:
                    field:
                      type: "string"
                    issue:
                      type: "string"
    404NotFound:
      description: "No product matches the provided identity records."
```

---

## 🎯 Detail Validation Rules for Each Endpoint

### 1. `GET /api/products/search`
- **Query `q`**: Required. Must be a string of length $2 \le \text{length} \le 128$. Trim leading and trailing spaces to prevent empty string queries. Strip SQL characters or special wildcard tags to guarantee robust sanitization prior to index querying.
- **Query `limit`**: Numeric, optional. Must be within $[1, 50]$. Defaults to $10$.

### 2. `POST /api/products/analyze`
- **Body `name`**: Required. String, length $1 \le \text{length} \le 100$. Must not contain scripting or custom HTML blocks.
- **Body `brand`**: Required. String, length $1 \le \text{length} \le 50$.
- **Body `category`**: Optional. String, default blank or inferred by the system.
- **Body `forceRefresh`**: Optional. Boolean. Used to force a crawl of third-party platforms. Rate-limited to prevent abuse ($1$ trigger per user per product every $30$ minutes).

### 3. `POST /api/products/compare`
- **Body `productIds`**: Required. Array of UUIDs.
- **Size Bounds**: `minItems: 2`, `maxItems: 4`. Custom logic fails gracefully with a standard `400 BAD_REQUEST` status if 0, 1, or 5+ products are requested.
- **Database matching**: Each string must be a structurally valid V4 UUID. Missing items are filtered out; if fewer than 2 valid items exist after filtering, a standard validation error is returned.

### 4. `POST /api/searches`
- **Body `query`**: Required. String, length $1 \le \text{length} \le 255$.
- **Body `productId`**: Optional. Must match a valid V4 UUID pattern if present, representing a successful match.

### 5. `GET /api/products/cached`
- **Query `category`**: Optional. Filter string validated against standard category schemas.
- **Query `limit`**: Optional. Defaults to $6$, $\max = 24$.

---

## 🛑 Endpoint Error Handling Strategy & Error Codes

Each endpoint is protected by a standard pipeline validation interceptor.

| Error Code | Occurs When | Status Code | Client Resolution Guideline |
|---|---|---|---|
| `VALIDATION_FAILED` | Input fields violate standard rules or properties. | `400 Bad Request` | Inspect validation fields array and retry. |
| `RATE_LIMIT_EXCEEDED`| The user exceeds configured queries or analysis limits. | `429 Too Many Requests` | Show cool-down screen with timer. |
| `PRODUCT_NOT_FOUND` | Path ID does not resolve to a cached index. | `404 Not Found` | Redirect to the Search page for analysis. |
| `PIPELINE_STALL` | Gemini or data fetching timed out ($>10$ seconds). | `504 Gateway Timeout` | Fallback to cached state or offer retry. |
| `UPSTREAM_FAILED` | Key services are down, and no redundant backup caches are present. | `502 Bad Gateway` | Provide clean interface messaging. |
