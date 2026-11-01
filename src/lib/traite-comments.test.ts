import { test, expect } from "vitest";
import { generateTraite, generateVente } from "./traite-comments";
test("rules", () => {
  for (const n of [100, 500, 1000, 2000]) {
    const o = generateTraite(n); expect(o.length).toBe(n);
    const c = new Map<string, number>(); o.forEach(x => c.set(x, (c.get(x) ?? 0) + 1));
    expect(Math.max(...c.values())).toBeLessThanOrEqual(4);
    expect(o.some(x => x.includes("'"))).toBe(false);
  }
  const o = generateTraite(150); expect(new Set(o).size).toBe(150);
  expect(generateVente(50).some(x => x.includes("'"))).toBe(false);
});
