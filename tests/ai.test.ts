import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { memoryRepo } from "@/lib/inventory/repo";
import { decideMatchUi, normalizeMatch, preFilterCandidates } from "@/lib/ai/rules";
import { lookupByPhoto } from "@/lib/ai/lookup";
import { simulatedProvider } from "@/lib/ai/simulated";
import type { AiProvider, PhotoInput } from "@/lib/ai/types";

const photo: PhotoInput = { mediaType: "image/jpeg", base64: "ZmFrZQ==" };

describe("normalizeMatch", () => {
  const ids = ["a", "b", "c", "d"];
  it("drops ids the model made up and clamps confidence", () => {
    const m = normalizeMatch({ best_match_id: "zzz", confidence: 1.7, reason: "", alternatives: [
      { id: "b", confidence: -2 }, { id: "c", confidence: 0.4 }] }, ids);
    expect(m.best).toMatchObject({ productId: "c", confidence: 0.4 });
    expect(m.options.map((o) => o.productId)).toEqual(["c", "b"]);
    expect(m.options.find((o) => o.productId === "b")!.confidence).toBe(0);
  });
  it("dedupes, sorts best first and keeps at most 3", () => {
    const m = normalizeMatch({ best_match_id: "a", confidence: 0.5, reason: "", alternatives: [
      { id: "a", confidence: 0.9 }, { id: "b", confidence: 0.7 }, { id: "c", confidence: 0.6 }, { id: "d", confidence: 0.55 }] }, ids);
    expect(m.options.map((o) => o.productId)).toEqual(["b", "c", "d"]);
  });
  it("treats NaN confidence as 0", () => {
    expect(normalizeMatch({ best_match_id: "a", confidence: NaN, reason: "", alternatives: [] }, ids).best!.confidence).toBe(0);
  });
});

describe("decideMatchUi (confidence rules)", () => {
  const m = (c: number) => normalizeMatch({ best_match_id: "a", confidence: c, reason: "", alternatives: [{ id: "b", confidence: 0.2 }] }, ["a", "b"]);
  it("offers a one-tap confirm at or above the threshold", () => {
    expect(decideMatchUi(m(0.85), 0.85)).toMatchObject({ mode: "confirm", option: { productId: "a" } });
    expect(decideMatchUi(m(0.99), 0.85).mode).toBe("confirm");
  });
  it("shows the top choices side by side below the threshold", () => {
    const ui = decideMatchUi(m(0.849), 0.85);
    expect(ui).toMatchObject({ mode: "choose" });
    if (ui.mode === "choose") expect(ui.options.map((o) => o.productId)).toEqual(["a", "b"]);
  });
  it("uses the store's configured threshold", () => {
    expect(decideMatchUi(m(0.8), 0.75).mode).toBe("confirm");
    expect(decideMatchUi(m(0.8), 0.95).mode).toBe("choose");
  });
  it("never lets a misconfigured threshold below 0.5 turn guesses into confirms", () => {
    expect(decideMatchUi(m(0.3), 0).mode).toBe("choose");
  });
  it("has nothing to show when no candidate matched", () => {
    expect(decideMatchUi(normalizeMatch({ best_match_id: null, confidence: 0, reason: "", alternatives: [] }, ["a"]), 0.85)).toEqual({ mode: "none" });
  });
});

describe("preFilterCandidates", () => {
  it("only offers items that can still be sold, closest category and color first", async () => {
    const products = await memoryRepo().listProducts();
    const c = preFilterCandidates(products, { category: "dresses", color: "red", description: "glossy vinyl mini" }, 5);
    expect(c.every((p) => p.status === "available" && p.quantity > 0)).toBe(true);
    expect(c[0].sku).toBe("FF-LV7DRS");
    expect(c.length).toBe(5);
  });
});

describe("lookupByPhoto never sells on its own", () => {
  it("leaves stock and the event log untouched, even at 99% confidence", async () => {
    const repo = memoryRepo();
    const before = JSON.stringify(await repo.listProducts());
    const eventsBefore = (await repo.listEvents(1000)).length;
    const sure: AiProvider = { ...simulatedProvider("high"), matchPhoto: async (_p, cands) =>
      ({ best_match_id: cands[0].id, confidence: 0.99, reason: "same item", alternatives: [] }) };
    const res = await lookupByPhoto(repo, sure, photo, { category: "tops" });
    expect(res.ui.mode).toBe("confirm");
    expect(JSON.stringify(await repo.listProducts())).toBe(before);
    expect((await repo.listEvents(1000)).length).toBe(eventsBefore);
  });
  it("uses the photo's category and color to narrow candidates when staff don't pick one", async () => {
    const res = await lookupByPhoto(memoryRepo(), simulatedProvider("low"), photo);
    expect(res.simulated).toBe(true);
    expect(res.ui.mode).toBe("choose");
    expect(res.candidates[0].category).toBe(res.hints.category);
  });
});
