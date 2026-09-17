import { describe, it, expect } from "vitest";
import { asBlitzQuestion, getInstagramUrl } from "./utils";

describe("asBlitzQuestion", () => {
  it("appends a question mark if missing", () => {
    expect(asBlitzQuestion("Kaffee")).toBe("Kaffee?");
  });

  it("does not double up an existing question mark", () => {
    expect(asBlitzQuestion("Kaffee?")).toBe("Kaffee?");
  });

  it("trims surrounding whitespace", () => {
    expect(asBlitzQuestion("  Kaffee  ")).toBe("Kaffee?");
    expect(asBlitzQuestion("  Kaffee?  ")).toBe("Kaffee?");
  });
});

describe("getInstagramUrl", () => {
  it("returns null for empty/missing input", () => {
    expect(getInstagramUrl(undefined)).toBeNull();
    expect(getInstagramUrl(null)).toBeNull();
    expect(getInstagramUrl("")).toBeNull();
    expect(getInstagramUrl("   ")).toBeNull();
  });

  it("normalizes a bare username", () => {
    expect(getInstagramUrl("evendle")).toBe("https://www.instagram.com/evendle/");
  });

  it("strips a leading @", () => {
    expect(getInstagramUrl("@evendle")).toBe("https://www.instagram.com/evendle/");
  });

  it("normalizes a full profile URL", () => {
    expect(getInstagramUrl("https://www.instagram.com/evendle/")).toBe("https://www.instagram.com/evendle/");
    expect(getInstagramUrl("https://instagram.com/evendle")).toBe("https://www.instagram.com/evendle/");
  });

  it("rejects a URL from a different domain", () => {
    expect(getInstagramUrl("https://evil.example.com/evendle")).toBeNull();
  });

  it("strips disallowed characters from a plain handle", () => {
    expect(getInstagramUrl("evendle$$!")).toBe("https://www.instagram.com/evendle/");
  });
});
