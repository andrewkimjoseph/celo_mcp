import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function ok(data: unknown): CallToolResult {
  const text = JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    structuredContent:
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : { value: data },
  };
}

export function err(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
