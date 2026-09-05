import { BOARD_SPACES, PROPERTIES } from "./properties.js";
import { STRATEGY_CARDS } from "./cards.js";
import { BREAKING_NEWS, SPECIAL_EVENTS } from "./events.js";
import { POLICIES, POLICY_PAIRS } from "./policies.js";
import { SECRET_OBJECTIVES } from "./objectives.js";

const duplicateIds = (values: readonly { readonly id: string }[]): string[] => {
  const seen = new Set<string>();
  return values.flatMap(({ id }) => {
    if (seen.has(id)) return [id];
    seen.add(id);
    return [];
  });
};

export const validateGameContent = (): string[] => {
  const issues: string[] = [];
  const expectedCounts = [
    ["board spaces", BOARD_SPACES.length, 20],
    ["properties", PROPERTIES.length, 16],
    ["strategy cards", STRATEGY_CARDS.length, 12],
    ["special events", SPECIAL_EVENTS.length, 8],
    ["breaking news", BREAKING_NEWS.length, 10],
    ["policies", POLICIES.length, 8],
    ["policy pairs", POLICY_PAIRS.length, 4],
    ["secret objectives", SECRET_OBJECTIVES.length, 10]
  ] as const;

  for (const [name, actual, expected] of expectedCounts) {
    if (actual !== expected) issues.push(`Expected ${expected} ${name}; received ${actual}`);
  }

  const catalogs = [PROPERTIES, STRATEGY_CARDS, SPECIAL_EVENTS, BREAKING_NEWS, POLICIES, SECRET_OBJECTIVES];
  for (const catalog of catalogs) {
    for (const id of duplicateIds(catalog)) issues.push(`Duplicate content id: ${id}`);
  }

  const propertyIds = new Set(PROPERTIES.map(({ id }) => id));
  const boardPropertyIds = BOARD_SPACES.flatMap((space) =>
    space.type === "property" ? [space.propertyId] : []
  );
  for (const propertyId of propertyIds) {
    if (boardPropertyIds.filter((id) => id === propertyId).length !== 1) {
      issues.push(`Property ${propertyId} must appear on the board exactly once`);
    }
  }

  return issues;
};
