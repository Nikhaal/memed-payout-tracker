import type { Platform } from "../models/Campaign";

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
};

/**
 * True if `link` is a valid URL on the campaign's platform
 * (www., m. and other subdomains are accepted).
 */
export function matchesPlatform(link: string, platform: Platform): boolean {
  let host: string;
  try {
    host = new URL(link).hostname.toLowerCase();
  } catch {
    return false;
  }
  return PLATFORM_HOSTS[platform].some((h) => host === h || host.endsWith(`.${h}`));
}
