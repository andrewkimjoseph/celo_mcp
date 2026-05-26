import { keccak256, toBytes, type Hex } from "viem";

export function canonicalizeSigningUrl(url: string): string {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      return (parsed.pathname || "/") + parsed.search;
    } catch {
      return url;
    }
  }

  if (url.startsWith("?")) {
    return `/${url}`;
  }

  if (url.startsWith("/")) {
    return url;
  }

  try {
    const parsed = new URL(url, "http://self.local");
    return (parsed.pathname || "/") + parsed.search;
  } catch {
    return url;
  }
}

export function computeBodyHash(body?: string | null): Hex {
  const payload = body ?? "";
  return keccak256(toBytes(payload));
}

export function computeSigningMessage(
  timestamp: string,
  method: string,
  url: string,
  body?: string | null,
): Hex {
  const canonicalUrl = canonicalizeSigningUrl(url);
  const bodyHash = computeBodyHash(body);
  return keccak256(
    toBytes(timestamp + method.toUpperCase() + canonicalUrl + bodyHash),
  );
}
