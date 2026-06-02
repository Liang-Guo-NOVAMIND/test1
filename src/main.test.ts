import { describe, it, expect } from "vitest";
import { setupApp } from "./main";

describe("setupApp", () => {
  it("renders the welcome message", () => {
    const el = document.createElement("div");
    setupApp(el);
    expect(el.querySelector("h1")?.textContent).toBe("Ludo");
    expect(el.querySelector("p")?.textContent).toContain("Welcome to Ludo");
  });
});
