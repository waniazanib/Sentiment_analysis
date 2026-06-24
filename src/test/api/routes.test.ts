// @vitest-environment node

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../../../server.ts";

describe("Express REST API Route Tests", () => {
  // Test: GET /api/products/cached
  test("GET /api/products/cached returns list of trending catalog products", async () => {
    const res = await request(app)
      .get("/api/products/cached")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // At least the seeded products or an empty fallback list should return
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("name");
      expect(res.body[0]).toHaveProperty("brand");
      expect(res.body[0]).toHaveProperty("category");
    }
  });

  // Test: GET /api/products/search
  test("GET /api/products/search fails with 400 Bad Request if q is missing", async () => {
    const res = await request(app)
      .get("/api/products/search")
      .expect(400);

    expect(res.body.code).toBe("BAD_REQUEST");
    expect(res.body.message).toContain("query parameter 'q' is required");
  });

  test("GET /api/products/search returns subset matching key search", async () => {
    const res = await request(app)
      .get("/api/products/search?q=sony")
      .expect(200);

    expect(res.body).toHaveProperty("hits");
    expect(Array.isArray(res.body.hits)).toBe(true);
  });

  // Test: POST /api/searches
  test("POST /api/searches successfully logs user search queries", async () => {
    const res = await request(app)
      .post("/api/searches")
      .send({ query: "Apple AirPods" })
      .expect(201); // In server.ts: res.status(201) with { id, success }

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("audit-uuid");
    expect(res.body.success).toBe(true);
  });

  test("POST /api/searches rejects with status 400 if search term is omitted", async () => {
    const res = await request(app)
      .post("/api/searches")
      .send({})
      .expect(400);

    expect(res.body.code).toBe("BAD_REQUEST");
  });

  // Test: POST /api/products/analyze Validation
  test("POST /api/products/analyze rejects query when name payload parameter is missing", async () => {
    const res = await request(app)
      .post("/api/products/analyze")
      .send({ brand: "Sony" })
      .expect(400);

    expect(res.body.code).toBe("BAD_REQUEST");
    expect(res.body.message).toContain("name' is required");
  });

  // Test: POST /api/products/compare Validation
  test("POST /api/products/compare rejects payload with fewer than two product records", async () => {
    const res = await request(app)
      .post("/api/products/compare")
      .send({ productIds: ["id1"] })
      .expect(400);

    expect(res.body.code).toBe("BAD_REQUEST");
    expect(res.body.message).toContain("expects between 2 and 4");
  });
});
