import { describe, expect, it } from "vitest";
import { ok } from "../../src/tools/helpers.js";

describe("ok() structuredContent", () => {
  it("passes objects through unchanged", () => {
    const payload = { network: "mainnet", value: 1 };
    const result = ok(payload);
    expect(result.structuredContent).toEqual(payload);
  });

  it("wraps arrays in { result: data }", () => {
    const payload = [{ id: 1 }, { id: 2 }];
    const result = ok(payload);
    expect(result.structuredContent).toEqual({ result: payload });
  });

  it("wraps primitive values", () => {
    const result = ok("hello");
    expect(result.structuredContent).toEqual({ result: "hello" });
  });
});
