import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayerSessionProvider } from "../src/state/PlayerSession.js";

describe("player session loading", () => {
  it("does not render a demonstration game while a live seat awaits its first snapshot", () => {
    const html = renderToStaticMarkup(createElement(PlayerSessionProvider, {
      session: { token: "test_session_token_12345678901234567890", roomId: "live-room", playerId: "live-player", expiresAt: Date.now() + 60_000 },
      onSignOut: () => undefined,
      children: createElement("div", null, "Game board with demo resources")
    }));
    expect(html).toContain("Connecting to your room");
    expect(html).not.toContain("Game board with demo resources");
  });

  it("renders an explicitly selected demonstration without requiring a connection", () => {
    const html = renderToStaticMarkup(createElement(PlayerSessionProvider, {
      session: null, onSignOut: () => undefined, children: createElement("div", null, "Demonstration board")
    }));
    expect(html).toContain("Demonstration board");
    expect(html).not.toContain("Connecting to your room");
  });
});
