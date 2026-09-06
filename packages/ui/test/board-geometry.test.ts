import { describe, expect, it } from "vitest";

import { BOARD_SPACES, PROPERTY_BY_ID } from "@econova/game-content";

import { cellForPosition } from "../src/theme.js";
import { travelPath } from "../src/board/usePieceTravel.js";

/**
 * The board's shape is presentation, but it has to agree exactly with the
 * canonical content: twenty spaces, each drawn once, in the right place.
 */
describe("board geometry", () => {
  it("places every canonical space on the perimeter of a 6x6 plate", () => {
    const cells = BOARD_SPACES.map((space) => cellForPosition(space.position));

    expect(cells).toHaveLength(20);
    for (const cell of cells) {
      expect(cell.row).toBeGreaterThanOrEqual(1);
      expect(cell.row).toBeLessThanOrEqual(6);
      expect(cell.column).toBeGreaterThanOrEqual(1);
      expect(cell.column).toBeLessThanOrEqual(6);
      // A perimeter cell touches at least one outer edge.
      expect(
        cell.row === 1 || cell.row === 6 || cell.column === 1 || cell.column === 6
      ).toBe(true);
    }
  });

  it("never draws two spaces in the same cell", () => {
    const seen = new Set(
      BOARD_SPACES.map((space) => {
        const cell = cellForPosition(space.position);
        return `${cell.row}:${cell.column}`;
      })
    );
    expect(seen.size).toBe(BOARD_SPACES.length);
  });

  it("leaves the inner 4x4 free for the city centre", () => {
    const occupied = new Set(
      BOARD_SPACES.map((space) => {
        const cell = cellForPosition(space.position);
        return `${cell.row}:${cell.column}`;
      })
    );
    for (let row = 2; row <= 5; row += 1) {
      for (let column = 2; column <= 5; column += 1) {
        expect(occupied.has(`${row}:${column}`)).toBe(false);
      }
    }
  });

  it("orients each space's district band toward the outside of the board", () => {
    for (const space of BOARD_SPACES) {
      const cell = cellForPosition(space.position);
      const edge = cell.edge;
      if (edge === "top") expect(cell.row).toBe(1);
      if (edge === "bottom") expect(cell.row).toBe(6);
      if (edge === "left") expect(cell.column).toBe(1);
      if (edge === "right") expect(cell.column).toBe(6);
    }
  });

  it("travels forward for a normal roll and backward for a shortcut", () => {
    expect(travelPath(2, 6)).toEqual([2, 3, 4, 5, 6]);
    // Wrapping past the City Center.
    expect(travelPath(18, 2)).toEqual([18, 19, 0, 1, 2]);
    // Shortcut moves backward by the unmodified roll.
    expect(travelPath(6, 2)).toEqual([6, 5, 4, 3, 2]);
    expect(travelPath(1, 18)).toEqual([1, 0, 19, 18]);
  });

  it("refuses to invent a path longer than a legal move", () => {
    // Nine spaces in either direction is not reachable by any die.
    expect(travelPath(0, 9)).toBeNull();
  });

  it("renders each canonical property exactly once", () => {
    const propertyIds = BOARD_SPACES.filter(
      (space) => space.type === "property"
    ).map((space) => (space.type === "property" ? space.propertyId : ""));

    expect(new Set(propertyIds).size).toBe(16);
    for (const id of propertyIds) expect(PROPERTY_BY_ID.has(id)).toBe(true);
  });
});
