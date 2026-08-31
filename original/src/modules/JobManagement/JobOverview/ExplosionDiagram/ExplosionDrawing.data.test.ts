import { describe, it, expect } from "vitest";
import { explosionDrawingData1, explosionDrawingData2 } from "./ExplosionDrawing.data";

describe("ExplosionDrawing.data", () => {
  it("exports explosionDrawingData1 with a list array", () => {
    expect(explosionDrawingData1).toBeDefined();
    expect(Array.isArray(explosionDrawingData1.list)).toBe(true);
    expect(explosionDrawingData1.list.length).toBeGreaterThan(0);
  });

  it("list items have expected shape", () => {
    const item = explosionDrawingData1.list[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("partNumber");
    expect(item).toHaveProperty("position");
  });

  it("exports explosionDrawingData2 with a list array", () => {
    expect(explosionDrawingData2).toBeDefined();
    expect(Array.isArray(explosionDrawingData2.list)).toBe(true);
    expect(explosionDrawingData2.list.length).toBeGreaterThan(0);
  });
});
