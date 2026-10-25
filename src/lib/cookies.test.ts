import { describe, expect, it } from "vitest";
import { hasCookie } from "./cookies";

describe("hasCookie", () => {
  it("finds a non-empty cookie among others", () => {
    expect(hasCookie("a=1; v2_session=abc; b=2", "v2_session")).toBe(true);
  });

  it("requires a non-empty value", () => {
    expect(hasCookie("v2_session=", "v2_session")).toBe(false);
    expect(hasCookie("v2_session=   ", "v2_session")).toBe(false);
  });

  it("returns false when the header or cookie is missing", () => {
    expect(hasCookie(null, "v2_session")).toBe(false);
    expect(hasCookie("a=1", "v2_session")).toBe(false);
  });

  it("does not match a suffix of another cookie name", () => {
    expect(hasCookie("xv2_session=abc", "v2_session")).toBe(false);
  });
});
