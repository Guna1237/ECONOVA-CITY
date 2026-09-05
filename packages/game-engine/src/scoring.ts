import { PROPERTY_BY_ID } from "@econova/game-content";

import type { OwnedPropertyForCalculation } from "./calculations.js";
import { GameRuleError } from "./errors.js";

export const evaluateSecretObjective = (
  objectiveId: string,
  player: {
    readonly credits: number;
    readonly influence: number;
    readonly properties: readonly OwnedPropertyForCalculation[];
  }
): boolean => {
  const propertyDefinitions = player.properties.map(({ propertyId }) => {
    const definition = PROPERTY_BY_ID.get(propertyId);
    if (definition === undefined) {
      throw new GameRuleError("UNKNOWN_PROPERTY", `Unknown property: ${propertyId}`);
    }
    return definition;
  });
  const ownsFullDistrict = (district: string): boolean =>
    propertyDefinitions.filter((property) => property.district === district).length === 4;

  switch (objectiveId) {
    case "OBJ01":
      return player.properties.length >= 5;
    case "OBJ02":
      return player.properties.filter(({ developmentLevel }) => developmentLevel === 3).length >= 3;
    case "OBJ03":
      return ownsFullDistrict("food");
    case "OBJ04":
      return ownsFullDistrict("tech");
    case "OBJ05":
      return player.credits >= 1_200;
    case "OBJ06":
      return (
        player.properties.length >= 5 &&
        new Set(propertyDefinitions.map(({ district }) => district)).size === 4
      );
    case "OBJ07":
      return player.influence >= 10;
    case "OBJ08":
      return ownsFullDistrict("entertainment");
    case "OBJ09":
      return propertyDefinitions.filter(({ tier }) => tier === "premium").length >= 3;
    case "OBJ10":
      return player.properties.filter(({ developmentLevel }) => developmentLevel >= 1).length >= 6;
    default:
      throw new GameRuleError("UNKNOWN_OBJECTIVE", `Unknown secret objective: ${objectiveId}`);
  }
};

export interface RankableFinalScore {
  readonly playerId: string;
  readonly total: number;
  readonly credits: number;
  readonly propertyValue: number;
  readonly propertyCount: number;
}

export const rankFinalScores = <T extends RankableFinalScore>(
  scores: readonly T[]
): Array<T & { readonly rank: number }> => {
  const sorted = [...scores].sort(
    (left, right) =>
      right.total - left.total ||
      right.credits - left.credits ||
      right.propertyValue - left.propertyValue ||
      right.propertyCount - left.propertyCount
  );
  let previous: T | undefined;
  let previousRank = 0;
  return sorted.map((score, index) => {
    const jointWithPrevious =
      previous !== undefined &&
      score.total === previous.total &&
      score.credits === previous.credits &&
      score.propertyValue === previous.propertyValue &&
      score.propertyCount === previous.propertyCount;
    const rank = jointWithPrevious ? previousRank : index + 1;
    previous = score;
    previousRank = rank;
    return { ...score, rank };
  });
};
