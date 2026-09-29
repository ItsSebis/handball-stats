import { describe, expect, it } from "vitest";
import { computeQuote, formatQuote } from "./format-quote";

describe("computeQuote", () => {
  it("returns null when there are no attempts", () => {
    expect(computeQuote(0, 0)).toBeNull();
  });

  it("divides made by attempts", () => {
    expect(computeQuote(3, 4)).toBe(0.75);
  });
});

describe("formatQuote", () => {
  it("renders a null quote as an em dash", () => {
    expect(formatQuote(null)).toBe("—");
  });

  it("renders a quote as a rounded percentage", () => {
    expect(formatQuote(computeQuote(1, 3))).toBe("33%");
  });

  it("rounds to the nearest percent", () => {
    expect(formatQuote(0.995)).toBe("100%");
  });
});
