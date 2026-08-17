import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  getPlayerView,
  getSalePreview,
  GOODS,
  GOOD_INFO,
} from "../src/index";

const game = (seed = 11) =>
  createGame(
    {
      players: [
        { id: "a", displayName: "Ana" },
        { id: "b", displayName: "Bia" },
      ],
    },
    seed,
  );

describe("Nassau game engine", () => {
  it("creates the deterministic setup with 43 items and a five-item port", () => {
    const state = game();
    expect(state.port).toHaveLength(5);
    expect(
      state.deck.length +
        state.port.length +
        state.players.reduce((sum, p) => sum + p.goods.length + p.crew, 0),
    ).toBe(43);
    expect(state.port.filter((item) => item.type === "crew")).toHaveLength(3);
    expect(state).toEqual(game());
  });

  it("keeps the opponent hand private in player views", () => {
    const state = game();
    const view = getPlayerView(state, "a");
    expect(view.me.goods).toBeDefined();
    expect(view.opponent).toMatchObject({ goodsCount: expect.any(Number) });
    expect(view.opponent).not.toHaveProperty("goods");
    expect(view).not.toHaveProperty("opponent.goods");
    expect(view.opponent).toMatchObject({ crew: expect.any(Number) });
  });

  it("takes goods and replenishes the port", () => {
    const state = game();
    state.currentPlayerId = "a";
    const good = state.port.find((item) => item.type !== "crew")!;
    const result = applyAction(state, {
      type: "take-good",
      playerId: "a",
      itemId: good.id,
    });
    expect(result.state.port).toHaveLength(5);
    expect(
      result.state.players[0].goods.some((item) => item.id === good.id),
    ).toBe(true);
  });

  it("advances the turn count only after both players act", () => {
    const state = game();
    const firstGood = state.port.find((item) => item.type !== "crew")!;
    const firstResult = applyAction(state, {
      type: "take-good",
      playerId: state.currentPlayerId,
      itemId: firstGood.id,
    });

    expect(firstResult.state.turn).toBe(1);

    const secondGood = firstResult.state.port.find(
      (item) => item.type !== "crew",
    )!;
    const secondResult = applyAction(firstResult.state, {
      type: "take-good",
      playerId: firstResult.state.currentPlayerId,
      itemId: secondGood.id,
    });

    expect(secondResult.state.turn).toBe(2);
  });

  it("rejects crew as a received item", () => {
    const state = game();
    const crew = state.port.find((item) => item.type === "crew")!;
    expect(() =>
      applyAction(state, {
        type: "trade",
        playerId: state.currentPlayerId,
        takeItemIds: [crew.id],
        giveGoodIds: [],
        giveCrewCount: 1,
      }),
    ).toThrow();
  });

  it("allows a one-for-one trade", () => {
    const state = game();
    const player = state.players.find(
      (candidate) => candidate.id === state.currentPlayerId,
    )!;
    const portGood = { id: "port-jewel", type: "royal-jewels" as const };
    state.port = [portGood];
    player.goods = [{ id: "give-rum", type: "rum" }];
    const result = applyAction(state, {
      type: "trade",
      playerId: player.id,
      takeItemIds: [portGood.id],
      giveGoodIds: ["give-rum"],
      giveCrewCount: 0,
    });
    expect(result.event.type).toBe("trade-complete");
    expect(
      result.state.players.find((candidate) => candidate.id === player.id)
        ?.goods,
    ).toContainEqual(portGood);
  });

  it("allows multiple units of the same good to be traded for crew", () => {
    const state = game();
    const player = state.players.find(
      (candidate) => candidate.id === state.currentPlayerId,
    )!;
    player.crew = 2;
    state.port = [
      { id: "silver-a", type: "spanish-silver" },
      { id: "silver-b", type: "spanish-silver" },
    ];
    const result = applyAction(state, {
      type: "trade",
      playerId: player.id,
      takeItemIds: ["silver-a", "silver-b"],
      giveGoodIds: [],
      giveCrewCount: 2,
    });
    expect(result.event.type).toBe("trade-complete");
    expect(
      result.state.players.find((candidate) => candidate.id === player.id)
        ?.crew,
    ).toBe(0);
  });

  it("uses highest rewards first and applies only one contract", () => {
    const state = game();
    const player = state.players.find((p) => p.id === state.currentPlayerId)!;
    player.goods = Array.from({ length: 5 }, (_, i) => ({
      id: `r-${i}`,
      type: "rum" as const,
    }));
    const result = applyAction(state, {
      type: "sell",
      playerId: player.id,
      goodType: "rum",
      quantity: 5,
    });
    expect(result.event.payload).toMatchObject({
      points: 15,
      contractPrestige: 9,
    });
    expect(player.prestige).toBe(0);
    expect(result.state.players.find((p) => p.id === player.id)?.prestige).toBe(
      24,
    );
  });

  it("allows selling one unit and previews a sale", () => {
    const state = game();
    const player = state.players.find((p) => p.id === state.currentPlayerId)!;
    player.goods = [
      { id: "silver-1", type: "spanish-silver" },
      { id: "silver-2", type: "spanish-silver" },
    ];
    expect(
      getSalePreview(state, player.id, "spanish-silver", 1).canSell,
    ).toBe(true);
    const result = applyAction(state, {
      type: "sell",
      playerId: player.id,
      goodType: "spanish-silver",
      quantity: 1,
    });
    expect(
      result.state.players.find((candidate) => candidate.id === player.id)
        ?.goods,
    ).toHaveLength(1);
  });

  it("finishes after two value tracks are empty and awards majority crew", () => {
    const state = game();
    const player = state.players.find((p) => p.id === state.currentPlayerId)!;
    player.goods = [
      { id: "r-1", type: "rum" },
      { id: "r-2", type: "rum" },
      { id: "r-3", type: "rum" },
      { id: "r-4", type: "rum" },
      { id: "r-5", type: "rum" },
    ];
    state.values.rum = [1];
    state.values.tobacco = [];
    player.crew = 4;
    state.players.find((candidate) => candidate.id !== player.id)!.crew = 1;
    const result = applyAction(state, {
      type: "sell",
      playerId: player.id,
      goodType: "rum",
      quantity: 5,
    });
    expect(result.state.phase).toBe("finished");
    expect(
      result.state.result?.players.find((p) => p.id === player.id)?.crewBonus,
    ).toBe(5);
    expect(GOODS).toHaveLength(6);
    expect(GOOD_INFO.provisions.values).toHaveLength(8);
  });
});
