import { describe, expect, it } from "vitest";
import { resolvePlanTier } from "./plans";

const productIds = {
  hobby: "legacy-hobby",
  pro: "new-pro",
  scale: "legacy-scale",
};

describe("resolvePlanTier", () => {
  it("returns free for inactive subscriptions", () => {
    expect(resolvePlanTier(false, "Scale", "legacy-scale", productIds)).toBe("free");
  });

  it("resolves the new Pro plan by product ID", () => {
    expect(resolvePlanTier(true, "Pro", "new-pro", productIds)).toBe("pro");
  });

  it("keeps legacy Pro subscriptions on Scale when product ID is absent", () => {
    expect(resolvePlanTier(true, "Pro", null, productIds)).toBe("scale");
  });

  it("keeps legacy Hobby subscriptions on Hobby", () => {
    expect(resolvePlanTier(true, "Hobby", null, productIds)).toBe("hobby");
  });

  it("resolves legacy Scale subscriptions by product ID", () => {
    expect(resolvePlanTier(true, "Pro", "legacy-scale", productIds)).toBe("scale");
  });
});
