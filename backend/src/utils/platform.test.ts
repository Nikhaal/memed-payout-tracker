import { matchesPlatform } from "./platform";

describe("matchesPlatform", () => {
  it("accepts instagram links", () => {
    expect(matchesPlatform("https://www.instagram.com/p/abc123/", "instagram")).toBe(true);
    expect(matchesPlatform("https://instagram.com/reel/xyz", "instagram")).toBe(true);
  });

  it("accepts youtube links, including short links", () => {
    expect(matchesPlatform("https://www.youtube.com/watch?v=abc", "youtube")).toBe(true);
    expect(matchesPlatform("https://youtu.be/abc", "youtube")).toBe(true);
    expect(matchesPlatform("https://m.youtube.com/shorts/abc", "youtube")).toBe(true);
  });

  it("rejects a link from the wrong platform", () => {
    expect(matchesPlatform("https://youtube.com/watch?v=abc", "instagram")).toBe(false);
    expect(matchesPlatform("https://instagram.com/p/abc", "youtube")).toBe(false);
  });

  it("rejects look-alike domains and invalid URLs", () => {
    expect(matchesPlatform("https://notinstagram.com/p/abc", "instagram")).toBe(false);
    expect(matchesPlatform("https://instagram.com.evil.io/p/abc", "instagram")).toBe(false);
    expect(matchesPlatform("not a url", "instagram")).toBe(false);
  });
});
