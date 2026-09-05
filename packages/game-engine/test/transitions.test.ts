import { describe, expect, it } from "vitest";

import type { ClientCommand } from "@econova/contracts";

import {
  GameRuleError,
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  executeGameCommand,
  disconnectPlayer,
  handleAuctionTimeout,
  handleCouncilTimeout,
  handleEmergencySaleTimeout,
  handleReconnectTimeout,
  handleTurnTimeout,
  reconnectPlayer,
  startGame,
  type GameState,
  type RandomSource
} from "../src/index.js";

const setupPlayers = Array.from({ length: 4 }, (_, index) => ({
  id: `player-${index + 1}`,
  name: `Player ${index + 1}`
}));

const sequenceRandom = (...values: number[]): RandomSource => {
  let index = 0;
  return {
    nextInt(maxExclusive) {
      const value = values[index] ?? 0;
      index += 1;
      return Math.abs(value) % maxExclusive;
    }
  };
};

const readyGame = (): GameState => {
  let state = createInitialGame({
    gameId: "game-a",
    roomId: "room-a",
    players: setupPlayers,
    random: createSeededRandom(99)
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0]
    );
  }
  return state;
};

let commandSequence = 0;
const command = <T extends ClientCommand["type"]>(
  state: GameState,
  type: T,
  payload: Record<string, unknown> = {}
): ClientCommand => {
  commandSequence += 1;
  return {
    requestId: `request-${commandSequence}`,
    actionId: `action-${commandSequence}`,
    expectedStateVersion: state.version,
    type,
    ...payload
  } as ClientCommand;
};

const run = (
  state: GameState,
  actorPlayerId: string,
  nextCommand: ClientCommand,
  random: RandomSource = sequenceRandom(0)
): GameState =>
  executeGameCommand(state, actorPlayerId, nextCommand, {
    now: 1_000,
    random
  }).state;

const runAt = (
  state: GameState,
  actorPlayerId: string,
  nextCommand: ClientCommand,
  now: number,
  random: RandomSource = sequenceRandom(0)
): GameState =>
  executeGameCommand(state, actorPlayerId, nextCommand, {
    now,
    random
  }).state;

const setHand = (state: GameState, playerId: string, cardIds: string[]): void => {
  const player = state.players[playerId]!;
  state.strategyDeck.push(...player.cards);
  player.cards = [];
  for (const cardId of cardIds) {
    const deckIndex = state.strategyDeck.indexOf(cardId);
    if (deckIndex >= 0) state.strategyDeck.splice(deckIndex, 1);
    for (const other of Object.values(state.players)) {
      if (other.id !== playerId) other.cards = other.cards.filter((id) => id !== cardId);
    }
    player.cards.push(cardId);
  }
};

describe("authoritative turn transitions", () => {
  it("starts Round 1 and applies the first Breaking News before the first turn", () => {
    const result = startGame(readyGame(), sequenceRandom(4), 1_000);

    expect(result.state.round).toBe(1);
    expect(result.state.phase).toBe("player_turn");
    expect(result.state.activeBreakingNewsId).toBe("BN05");
    expect(result.state.turn?.playerId).toBe(result.state.currentTurnOrder[0]);
    expect(result.state.turn?.stage).toBe("awaiting_roll");
    expect(Object.values(result.state.players).every(({ credits }) => credits === 1_060)).toBe(
      true
    );
    expect(result.events[0]).toMatchObject({ type: "breaking_news_revealed" });
  });

  it("moves with server randomness, awards City Center, and buys atomically", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    state.players[playerId]!.position = 19;

    state = run(state, playerId, command(state, "roll"), sequenceRandom(0));
    expect(state.turn).toMatchObject({ roll: 1, stage: "awaiting_shortcut_choice" });
    state = run(
      state,
      playerId,
      command(state, "choose_shortcut", { useShortcut: false })
    );
    expect(state.players[playerId]).toMatchObject({ position: 0, credits: 1_150 });
    expect(state.turn?.stage).toBe("action_phase");

    state.players[playerId]!.position = 0;
    state.turn!.stage = "awaiting_roll";
    state.turn!.roll = null;
    state = run(state, playerId, command(state, "roll"), sequenceRandom(0));
    state = run(
      state,
      playerId,
      command(state, "choose_shortcut", { useShortcut: false })
    );
    expect(state.turn?.stage).toBe("awaiting_property_decision");
    const before = state.players[playerId]!.credits;
    state = run(
      state,
      playerId,
      command(state, "buy_property", { propertyId: "P01" })
    );
    expect(state.properties.P01).toMatchObject({ ownerId: playerId, developmentLevel: 0 });
    expect(state.players[playerId]!.credits).toBe(before - 80);
    expect(state.turn?.actionsRemaining).toBe(2);
  });

  it("rejects stale state versions before applying a transition", () => {
    const state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    const stale = command(state, "roll") as Extract<ClientCommand, { type: "roll" }>;
    stale.expectedStateVersion -= 1;

    expect(() => run(state, playerId, stale)).toThrowError(
      expect.objectContaining<GameRuleError>({ code: "STALE_STATE" })
    );
  });

  it("applies Insurance as a pre-payment reaction that consumes one Action", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const payerId = state.turn?.playerId ?? "";
    const ownerId = state.currentTurnOrder[1] ?? "";
    setHand(state, payerId, ["SC12"]);
    state.properties.P01!.ownerId = ownerId;
    state.players[ownerId]!.propertyIds.push("P01");
    const payerCredits = state.players[payerId]!.credits;
    const ownerCredits = state.players[ownerId]!.credits;

    state = run(state, payerId, command(state, "roll"), sequenceRandom(0));
    state = run(
      state,
      payerId,
      command(state, "choose_shortcut", { useShortcut: false })
    );
    expect(state.turn?.stage).toBe("landing_fee_reaction");
    state = run(
      state,
      payerId,
      command(state, "play_card", { cardId: "SC12", reactionTo: "landing_fee" })
    );

    expect(state.players[payerId]).toMatchObject({ credits: payerCredits });
    expect(state.players[ownerId]).toMatchObject({ credits: ownerCredits });
    expect(state.players[payerId]!.cards).not.toContain("SC12");
    expect(state.turn).toMatchObject({ stage: "action_phase", actionsRemaining: 1 });
    expect(state.pendingLandingFee).toBeNull();
  });
});

describe("auctions and mandatory liquidation", () => {
  it("pauses the normal timer for an auction and resumes it after manual completion", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const triggererId = state.turn?.playerId ?? "";
    state.players[triggererId]!.position = 1;
    state.turn!.stage = "awaiting_property_decision";

    state = runAt(
      state,
      triggererId,
      command(state, "start_auction", { propertyId: "P01" }),
      11_000
    );

    expect(state.auction?.deadlineAt).toBe(41_000);
    expect(state.turn).toMatchObject({
      turnDeadlineAt: null,
      remainingTurnMilliseconds: 50_000
    });

    for (const playerId of state.currentTurnOrder) {
      state = runAt(
        state,
        playerId,
        command(state, "pass_auction", { auctionId: state.auction?.id }),
        20_000
      );
    }

    expect(state.auction).toBeNull();
    expect(state.turn).toMatchObject({
      stage: "action_phase",
      turnDeadlineAt: 70_000,
      remainingTurnMilliseconds: null
    });
  });

  it("allows the triggerer to bid and resolves sealed ties by current turn order", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const triggererId = state.turn?.playerId ?? "";
    state.players[triggererId]!.position = 1;
    state.turn!.stage = "awaiting_property_decision";

    state = run(
      state,
      triggererId,
      command(state, "start_auction", { propertyId: "P01" })
    );
    expect(state.auction?.eligiblePlayerIds).toContain(triggererId);
    const secondId = state.currentTurnOrder[1] ?? "";
    state = run(
      state,
      secondId,
      command(state, "submit_bid", { auctionId: state.auction?.id, amount: 100 })
    );
    state = run(
      state,
      triggererId,
      command(state, "submit_bid", { auctionId: state.auction?.id, amount: 100 })
    );
    for (const playerId of state.currentTurnOrder.slice(2)) {
      state = run(
        state,
        playerId,
        command(state, "pass_auction", { auctionId: state.auction?.id })
      );
    }

    expect(state.auction).toBeNull();
    expect(state.properties.P01?.ownerId).toBe(triggererId);
    expect(state.turn?.stage).toBe("action_phase");
  });

  it("automatically liquidates lowest values then lowest property ID on timeout", () => {
    const state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const payerId = state.turn?.playerId ?? "";
    const ownerId = state.currentTurnOrder[1] ?? "";
    state.players[payerId]!.credits = 0;
    state.players[payerId]!.propertyIds = ["P06", "P05", "P01"];
    state.properties.P06 = { id: "P06", ownerId: payerId, developmentLevel: 0, purchasedOnTurn: null, receivedOnTurn: null };
    state.properties.P05 = { id: "P05", ownerId: payerId, developmentLevel: 0, purchasedOnTurn: null, receivedOnTurn: null };
    state.properties.P01 = { id: "P01", ownerId: payerId, developmentLevel: 1, purchasedOnTurn: null, receivedOnTurn: null };
    state.pendingLandingFee = { payerId, ownerId, propertyId: "P13", amount: 120 };
    state.emergencySale = { payerId, ownerId, propertyId: "P13", amount: 120, deadlineAt: 31_000 };
    state.turn!.stage = "emergency_sale";
    state.turn!.turnDeadlineAt = null;
    state.turn!.remainingTurnMilliseconds = 60_000;
    const ownerCredits = state.players[ownerId]!.credits;

    const result = handleEmergencySaleTimeout(state, 31_000);

    expect(result.state.properties.P01?.ownerId).toBeNull();
    expect(result.state.properties.P05?.ownerId).toBeNull();
    expect(result.state.properties.P06?.ownerId).toBe(payerId);
    expect(result.state.players[payerId]!.credits).toBe(10);
    expect(result.state.players[ownerId]!.credits).toBe(ownerCredits + 120);
    expect(result.state.turn).toMatchObject({
      stage: "action_phase",
      turnDeadlineAt: 91_000,
      remainingTurnMilliseconds: null
    });
  });

  it("pauses the normal timer for emergency sale and resumes it after manual completion", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const payerId = state.turn?.playerId ?? "";
    const ownerId = state.currentTurnOrder[1] ?? "";
    state.players[payerId]!.credits = 0;
    state.players[payerId]!.propertyIds = ["P01"];
    state.properties.P01!.ownerId = payerId;
    state.properties.P13!.ownerId = ownerId;
    state.players[ownerId]!.propertyIds.push("P13");
    state.pendingLandingFee = { payerId, ownerId, propertyId: "P13", amount: 50 };
    state.turn!.stage = "landing_fee_reaction";

    state = runAt(state, payerId, command(state, "pay_landing_fee"), 11_000);

    expect(state.emergencySale?.deadlineAt).toBe(41_000);
    expect(state.turn).toMatchObject({
      stage: "emergency_sale",
      turnDeadlineAt: null,
      remainingTurnMilliseconds: 50_000
    });

    state = runAt(
      state,
      payerId,
      command(state, "emergency_sell", { propertyIds: ["P01"] }),
      20_000
    );

    expect(state.emergencySale).toBeNull();
    expect(state.turn).toMatchObject({
      stage: "action_phase",
      turnDeadlineAt: 70_000,
      remainingTurnMilliseconds: null
    });
  });

  it("resumes the paused normal timer after emergency-sale disconnect fallback", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const payerId = state.turn?.playerId ?? "";
    const ownerId = state.currentTurnOrder[1] ?? "";
    state.players[payerId]!.credits = 0;
    state.players[payerId]!.propertyIds = ["P01"];
    state.properties.P01!.ownerId = payerId;
    state.properties.P13!.ownerId = ownerId;
    state.players[ownerId]!.propertyIds.push("P13");
    state.pendingLandingFee = { payerId, ownerId, propertyId: "P13", amount: 50 };
    state.turn!.stage = "landing_fee_reaction";
    state = runAt(state, payerId, command(state, "pay_landing_fee"), 11_000);

    state = disconnectPlayer(state, payerId, 20_000).state;

    expect(state.emergencySale).toBeNull();
    expect(state.turn).toMatchObject({
      stage: "action_phase",
      turnDeadlineAt: 70_000,
      remainingTurnMilliseconds: null
    });
  });
});

describe("actions, cards, and trades", () => {
  it("applies current Tech control to development and blocks same-turn acquisitions", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    state.turn!.stage = "action_phase";
    state.players[playerId]!.propertyIds = ["P01", "P02", "P06", "P09"];
    for (const propertyId of state.players[playerId]!.propertyIds) {
      state.properties[propertyId]!.ownerId = playerId;
    }
    const credits = state.players[playerId]!.credits;

    state = run(
      state,
      playerId,
      command(state, "develop_property", { propertyId: "P01" })
    );
    expect(state.properties.P01?.developmentLevel).toBe(1);
    expect(state.players[playerId]!.credits).toBe(credits - 20);

    state.properties.P01!.purchasedOnTurn = state.turn?.number ?? null;
    expect(() =>
      run(state, playerId, command(state, "develop_property", { propertyId: "P01" }))
    ).toThrowError(expect.objectContaining<GameRuleError>({ code: "SAME_TURN_DEVELOPMENT" }));
  });

  it("executes card effects server-side and enforces the one-card limit", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    state.turn!.stage = "action_phase";
    setHand(state, playerId, ["SC06", "SC09"]);
    const credits = state.players[playerId]!.credits;

    state = run(state, playerId, command(state, "play_card", { cardId: "SC06" }));
    expect(state.players[playerId]!.credits).toBe(credits + 120);
    expect(() =>
      run(state, playerId, command(state, "play_card", { cardId: "SC09" }))
    ).toThrowError(expect.objectContaining<GameRuleError>({ code: "CARD_LIMIT" }));
  });

  it("validates and executes a confirmed trade atomically", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const proposerId = state.turn?.playerId ?? "";
    const counterpartyId = state.currentTurnOrder[1] ?? "";
    state.turn!.stage = "action_phase";
    state.properties.P01!.ownerId = proposerId;
    state.players[proposerId]!.propertyIds.push("P01");
    state.properties.P02!.ownerId = counterpartyId;
    state.players[counterpartyId]!.propertyIds.push("P02");
    const proposerCredits = state.players[proposerId]!.credits;
    const counterpartyCredits = state.players[counterpartyId]!.credits;

    state = run(
      state,
      proposerId,
      command(state, "propose_trade", {
        counterpartyPlayerId: counterpartyId,
        offeredCredits: 50,
        offeredPropertyIds: ["P01"],
        requestedCredits: 20,
        requestedPropertyIds: ["P02"]
      })
    );
    const tradeId = state.trade?.id;
    expect(tradeId).toBeTruthy();
    state = run(
      state,
      counterpartyId,
      command(state, "respond_trade", { tradeId, response: "accept" })
    );

    expect(state.trade).toBeNull();
    expect(state.properties.P01?.ownerId).toBe(counterpartyId);
    expect(state.properties.P02?.ownerId).toBe(proposerId);
    expect(state.players[proposerId]!.credits).toBe(proposerCredits - 30);
    expect(state.players[counterpartyId]!.credits).toBe(counterpartyCredits + 30);
    expect(state.properties.P02?.receivedOnTurn).toBe(state.turn?.number);
  });

  it("cancels a pending trade when the active turn times out", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const proposerId = state.turn?.playerId ?? "";
    const counterpartyId = state.currentTurnOrder[1] ?? "";
    state.turn!.stage = "action_phase";

    state = run(
      state,
      proposerId,
      command(state, "propose_trade", {
        counterpartyPlayerId: counterpartyId,
        offeredCredits: 50,
        offeredPropertyIds: [],
        requestedCredits: 20,
        requestedPropertyIds: []
      })
    );
    const tradeId = state.trade?.id;

    const timedOut = handleTurnTimeout(state, 61_000, sequenceRandom(0));

    expect(timedOut.state.trade).toBeNull();
    expect(timedOut.state.turn?.playerId).not.toBe(proposerId);
    expect(timedOut.events).toContainEqual(
      expect.objectContaining({
        type: "trade_rejected",
        payload: expect.objectContaining({ tradeId })
      })
    );
  });
});

describe("round, Council, and final-scoring lifecycle", () => {
  it("resolves Round 2 then opens the separately timed Round 3 Council", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    state.round = 2;
    state.currentTurnOrder = [
      ...state.turnOrder.slice(1),
      state.turnOrder[0]!
    ];
    state.currentTurnIndex = state.currentTurnOrder.length - 1;
    const activeId = state.currentTurnOrder[state.currentTurnIndex] ?? "";
    state.turn = {
      number: 8,
      playerId: activeId,
      stage: "action_phase",
      actionsRemaining: 2,
      cardPlayed: false,
      roll: 3,
      actionsUsed: 0,
      turnDeadlineAt: 61_000,
      remainingTurnMilliseconds: null,
      effects: []
    };

    state = run(state, activeId, command(state, "end_turn"), sequenceRandom(0, 0));

    expect(state.round).toBe(3);
    expect(state.phase).toBe("council");
    expect(state.turn).toBeNull();
    expect(state.council).toMatchObject({
      id: "council-round-3",
      optionAId: "POL01A",
      optionBId: "POL01B",
      deadlineAt: 46_000
    });
  });

  it("keeps Council allocations secret in state and resolves Option A on a tie", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    state.round = 3;
    state.phase = "council";
    state.turn = null;
    state.council = {
      id: "council-round-3",
      round: 3,
      optionAId: "POL01A",
      optionBId: "POL01B",
      allocations: {},
      deadlineAt: 46_000
    };
    for (const playerId of state.currentTurnOrder) {
      state = run(
        state,
        playerId,
        command(state, "council_vote", {
          councilId: "council-round-3",
          optionAInfluence: 1,
          optionBInfluence: 1
        })
      );
    }

    expect(state.council).toBeNull();
    expect(state.phase).toBe("player_turn");
    expect(state.activePolicyIds).toContain("POL01A");
    expect(state.demand).toMatchObject({ food: 1, mobility: 1, entertainment: -1 });
  });

  it("pays Round 8 income before freezing and ranking final scores", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    state.round = 8;
    state.currentTurnIndex = state.currentTurnOrder.length - 1;
    const activeId = state.currentTurnOrder[state.currentTurnIndex] ?? "";
    state.turn = {
      number: 32,
      playerId: activeId,
      stage: "action_phase",
      actionsRemaining: 1,
      cardPlayed: false,
      roll: 2,
      actionsUsed: 1,
      turnDeadlineAt: 61_000,
      remainingTurnMilliseconds: null,
      effects: []
    };
    state.properties.P01!.ownerId = activeId;
    state.players[activeId]!.propertyIds = ["P01"];
    const credits = state.players[activeId]!.credits;

    state = run(state, activeId, command(state, "end_turn"));

    expect(state.phase).toBe("completed");
    expect(state.players[activeId]!.credits).toBe(credits + 10);
    expect(state.results).toHaveLength(4);
    expect(state.results.map(({ rank }) => rank)).toContain(1);
  });
});

describe("timer and connection transitions", () => {
  it("pauses and resumes the remaining normal-turn time across reconnect", () => {
    const state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    const disconnected = disconnectPlayer(state, playerId, 11_000).state;

    expect(disconnected.players[playerId]).toMatchObject({
      connected: false,
      disconnectedAt: 11_000
    });
    expect(disconnected.turn).toMatchObject({
      remainingTurnMilliseconds: 50_000,
      turnDeadlineAt: null
    });

    const reconnected = reconnectPlayer(disconnected, playerId, 20_000).state;
    expect(reconnected.players[playerId]).toMatchObject({ connected: true, disconnectedAt: null });
    expect(reconnected.turn?.turnDeadlineAt).toBe(70_000);
    expect(reconnected.turn?.remainingTurnMilliseconds).toBeNull();
  });

  it("auto-passes missing auction bids at the 30-second deadline", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    state.players[playerId]!.position = 1;
    state.turn!.stage = "awaiting_property_decision";
    state = run(state, playerId, command(state, "start_auction", { propertyId: "P01" }));

    state = handleAuctionTimeout(state, 31_000).state;

    expect(state.auction).toBeNull();
    expect(state.properties.P01?.ownerId).toBeNull();
    expect(state.turn).toMatchObject({
      stage: "action_phase",
      turnDeadlineAt: 91_000,
      remainingTurnMilliseconds: null
    });
  });

  it("resumes the paused normal timer when an auction completes after a disconnect", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const triggererId = state.turn?.playerId ?? "";
    state.players[triggererId]!.position = 1;
    state.turn!.stage = "awaiting_property_decision";
    state = runAt(
      state,
      triggererId,
      command(state, "start_auction", { propertyId: "P01" }),
      11_000
    );
    const disconnectedId = state.currentTurnOrder.at(-1) ?? "";
    for (const playerId of state.currentTurnOrder.slice(0, -1)) {
      state = runAt(
        state,
        playerId,
        command(state, "pass_auction", { auctionId: state.auction?.id }),
        20_000
      );
    }

    state = disconnectPlayer(state, disconnectedId, 20_000).state;

    expect(state.auction).toBeNull();
    expect(state.turn).toMatchObject({
      stage: "action_phase",
      turnDeadlineAt: 70_000,
      remainingTurnMilliseconds: null
    });
  });

  it("deterministically resolves an event district choice after reconnect timeout", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    state.turn!.stage = "awaiting_event_choice";
    state.pendingEventChoice = { playerId, eventId: "SE03" };
    state.demand.food = 2;
    state.demand.tech = 0;
    state = disconnectPlayer(state, playerId, 11_000).state;

    const resolved = handleReconnectTimeout(state, 71_000, sequenceRandom(0));

    expect(resolved.state.pendingEventChoice).toBeNull();
    expect(resolved.state.demand).toMatchObject({ food: 2, tech: 1 });
    expect(resolved.state.turn?.playerId).not.toBe(playerId);
    expect(resolved.events).toContainEqual(
      expect.objectContaining({
        type: "special_event_choice_resolved",
        payload: expect.objectContaining({ eventId: "SE03", districtId: "tech", value: 1 })
      })
    );
  });

  it("deterministically discards the lowest card ID after reconnect timeout", () => {
    let state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const playerId = state.turn?.playerId ?? "";
    setHand(state, playerId, ["SC03", "SC01", "SC02"]);
    const drawnCardId = state.strategyDeck[0];
    state.turn!.stage = "awaiting_card_discard";
    state.pendingCardDraw = { playerId, count: 1, resumePhase: "player_turn" };
    state = disconnectPlayer(state, playerId, 11_000).state;

    const resolved = handleReconnectTimeout(state, 71_000, sequenceRandom(0));

    expect(resolved.state.pendingCardDraw).toBeNull();
    expect(resolved.state.players[playerId]?.cards).toEqual(
      expect.arrayContaining(["SC02", "SC03", drawnCardId])
    );
    expect(resolved.state.players[playerId]?.cards).not.toContain("SC01");
    expect(resolved.state.strategyDeck.at(-1)).toBe("SC01");
    expect(resolved.state.turn?.playerId).not.toBe(playerId);
  });

  it("treats missing Council votes as abstentions at 45 seconds", () => {
    const state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    state.round = 3;
    state.phase = "council";
    state.turn = null;
    state.council = {
      id: "council-round-3",
      round: 3,
      optionAId: "POL01A",
      optionBId: "POL01B",
      allocations: {},
      deadlineAt: 46_000
    };

    const resolved = handleCouncilTimeout(state, 46_000).state;

    expect(resolved.council).toBeNull();
    expect(resolved.activePolicyIds).toContain("POL01A");
    expect(resolved.turn?.stage).toBe("awaiting_roll");
  });

  it("forfeits remaining actions when the normal turn timer expires", () => {
    const state = startGame(readyGame(), sequenceRandom(0), 1_000).state;
    const originalPlayerId = state.turn?.playerId ?? "";
    state.turn!.stage = "action_phase";

    const timedOut = handleTurnTimeout(state, 61_000, sequenceRandom(0)).state;

    expect(timedOut.turn?.playerId).not.toBe(originalPlayerId);
    expect(timedOut.turn?.stage).toBe("awaiting_roll");
  });
});
