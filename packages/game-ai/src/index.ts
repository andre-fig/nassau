import {
  Action,
  GameState,
  GoodType,
  GOOD_INFO,
  PlayerId,
  PlayerView,
} from "@nassau/game-engine";

export type Difficulty = "easy" | "normal" | "hard";

const saleScore = (
  view: PlayerView,
  type: GoodType,
  quantity: number,
  difficulty: Difficulty,
) => {
  const count = view.me.goods.filter((item) => item.type === type).length;
  if (quantity < GOOD_INFO[type].minimum || quantity > count) return -Infinity;
  const preview = getSalePreviewFromView(view, type, quantity);
  const remainingValue = view.me.goods
    .filter((item) => item.type !== type)
    .reduce((sum, item) => sum + valueOfType(view, item.type) * 0.45, 0);
  return (
    preview.total +
    (quantity >= 3 ? 2 : 0) +
    (view.public.values[type].length <= quantity ? 4 : 0) +
    remainingValue +
    (difficulty === "hard" && quantity === count ? 1 : 0)
  );
};

const getSalePreviewFromView = (
  view: PlayerView,
  type: GoodType,
  quantity: number,
) => {
  const rewards = view.public.values[type].slice(0, quantity);
  const contractPrestige =
    quantity >= 5 ? 9 : quantity === 4 ? 5 : quantity === 3 ? 2 : 0;
  return {
    total: rewards.reduce((sum, value) => sum + value, 0) + contractPrestige,
  };
};

export function chooseAction(
  view: PlayerView,
  difficulty: Difficulty,
): Action | undefined {
  if (view.phase !== "playing" || view.public.currentPlayerId !== view.me.id)
    return undefined;
  const legal = getLegalActionsFromView(view);
  if (legal.length === 0) return undefined;
  const sells = legal.filter(
    (action): action is Extract<Action, { type: "sell" }> =>
      action.type === "sell",
  );
  const trades = legal.filter(
    (action): action is Extract<Action, { type: "trade" }> =>
      action.type === "trade",
  );
  if (difficulty === "hard") {
    const best = legal
      .map((action) => ({ action, score: hardActionScore(view, action) }))
      .sort((a, b) => b.score - a.score)[0];
    return best
      ? { ...best.action, clientActionId: `ai-${view.public.turn}` }
      : undefined;
  }
  if (sells.length > 0) {
    const ranked = sells
      .map((action) => ({
        action,
        score: saleScore(view, action.goodType, action.quantity, difficulty),
      }))
      .sort((a, b) => b.score - a.score);
    if (difficulty !== "easy" || ranked[0].score > 6)
      return { ...ranked[0].action, clientActionId: `ai-${view.public.turn}` };
  }
  const recruit = legal.find((action) => action.type === "recruit-crew");
  if (
    recruit &&
    (difficulty !== "easy" || view.me.crew < (view.opponent?.goodsCount ?? 0))
  )
    return { ...recruit, clientActionId: `ai-${view.public.turn}` };
  const takes = legal.filter(
    (action): action is Extract<Action, { type: "take-good" }> =>
      action.type === "take-good",
  );
  takes.sort((a, b) => valueOf(view, b.itemId) - valueOf(view, a.itemId));
  return takes[0]
    ? { ...takes[0], clientActionId: `ai-${view.public.turn}` }
    : legal[0];
}

const valueOfType = (view: PlayerView, type: GoodType) =>
  view.public.values[type][0] ?? 0;

const collectionBonus = (view: PlayerView, types: GoodType[]) => {
  const counts = new Map<GoodType, number>();
  view.me.goods.forEach((item) => {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  });
  return types.reduce((bonus, type) => {
    const count = counts.get(type) ?? 0;
    counts.set(type, count + 1);
    return bonus + (count === 1 ? 2 : count === 2 ? 3 : 1);
  }, 0);
};

const hardActionScore = (view: PlayerView, action: Action) => {
  if (action.type === "sell") {
    return saleScore(view, action.goodType, action.quantity, "hard");
  }
  if (action.type === "take-good") {
    const item = view.public.port.find((entry) => entry.id === action.itemId);
    if (!item || item.type === "crew") return -Infinity;
    return (
      valueOfType(view, item.type) * 2 +
      collectionBonus(view, [item.type]) +
      (view.me.goods.length >= 6 ? 1 : 0)
    );
  }
  if (action.type === "recruit-crew") {
    const crewCount = view.public.port.filter(
      (entry) => entry.type === "crew",
    ).length;
    const opponentCrew = view.opponent?.crew ?? 0;
    const crewAfter = view.me.crew + crewCount;
    return (
      crewCount * 4 +
      (crewAfter > opponentCrew ? 4 : 0) +
      (view.me.crew <= opponentCrew ? 2 : 0)
    );
  }
  const received = action.takeItemIds
    .map((id) => view.public.port.find((entry) => entry.id === id))
    .filter(
      (
        entry,
      ): entry is Extract<
        (typeof view.public.port)[number],
        { type: GoodType }
      > => Boolean(entry && entry.type !== "crew"),
    );
  const given = action.giveGoodIds
    .map((id) => view.me.goods.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const receivedValue = received.reduce(
    (sum, item) => sum + valueOfType(view, item.type) * 1.9,
    0,
  );
  const givenValue = given.reduce(
    (sum, item) => sum + valueOfType(view, item.type) * 1.1,
    0,
  );
  const crewCost = action.giveCrewCount * 4;
  const crewAfter = view.me.crew - action.giveCrewCount;
  const crewLeadBonus =
    crewAfter > (view.opponent?.crew ?? 0)
      ? 2
      : crewAfter < (view.opponent?.crew ?? 0)
        ? -2
        : 0;
  return (
    receivedValue -
    givenValue -
    crewCost +
    collectionBonus(
      view,
      received.map((item) => item.type),
    ) +
    crewLeadBonus
  );
};

const valueOf = (view: PlayerView, itemId: string) => {
  const item = view.public.port.find((entry) => entry.id === itemId);
  return item && item.type !== "crew" ? valueOfType(view, item.type) : 0;
};

function getLegalActionsFromView(view: PlayerView): Action[] {
  const actions: Action[] = [];
  view.public.port.forEach((entry) => {
    if (entry.type !== "crew" && view.me.goods.length < 7)
      actions.push({
        type: "take-good",
        playerId: view.me.id,
        itemId: entry.id,
      });
  });
  if (view.public.port.some((entry) => entry.type === "crew"))
    actions.push({ type: "recruit-crew", playerId: view.me.id });
  const portGoods = view.public.port.filter(
    (
      entry,
    ): entry is Extract<
      (typeof view.public.port)[number],
      { type: GoodType }
    > => entry.type !== "crew",
  );
  for (const takeItems of combinations(portGoods)) {
    const takenTypes = new Set(takeItems.map((entry) => entry.type));
    const compatibleGoods = view.me.goods.filter(
      (entry) => !takenTypes.has(entry.type),
    );
    const minimumGoods = Math.max(0, takeItems.length - view.me.crew);
    const maximumGoods = Math.min(takeItems.length, compatibleGoods.length);
    for (
      let giveCount = minimumGoods;
      giveCount <= maximumGoods;
      giveCount += 1
    ) {
      for (const giveGoods of combinations(compatibleGoods, giveCount)) {
        if (view.me.goods.length - giveGoods.length + takeItems.length <= 7) {
          actions.push({
            type: "trade",
            playerId: view.me.id,
            takeItemIds: takeItems.map((entry) => entry.id),
            giveGoodIds: giveGoods.map((entry) => entry.id),
            giveCrewCount: takeItems.length - giveGoods.length,
          });
        }
      }
    }
  }
  for (const type of Object.keys(GOOD_INFO) as GoodType[]) {
    const count = view.me.goods.filter((entry) => entry.type === type).length;
    for (
      let quantity = GOOD_INFO[type].minimum;
      quantity <= Math.min(count, view.public.values[type].length);
      quantity += 1
    ) {
      actions.push({
        type: "sell",
        playerId: view.me.id,
        goodType: type,
        quantity,
      });
    }
  }
  return actions;
}

function combinations<T>(items: T[], exactSize?: number): T[][] {
  const result: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length > 0 && exactSize === undefined)
      result.push([...selected]);
    if (exactSize !== undefined && selected.length === exactSize) {
      result.push([...selected]);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      selected.push(items[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return result;
}

export function chooseActionFromState(
  state: GameState,
  playerId: PlayerId,
  difficulty: Difficulty,
): Action | undefined {
  // Kept as a small adapter for offline callers. The AI still receives only its sanitized view.
  return chooseAction(requireView(state, playerId), difficulty);
}

const requireView = (state: GameState, playerId: PlayerId) => {
  // Dynamic import is intentionally avoided; this adapter is not used by the client bundle.
  const me = state.players.find((player) => player.id === playerId)!;
  const other = state.players.find((player) => player.id !== playerId);
  return {
    gameId: state.id,
    phase: state.phase,
    me: me as PlayerView["me"],
    opponent: other
      ? {
          id: other.id,
          displayName: other.displayName,
          goodsCount: other.goods.length,
          prestige: other.prestige,
          contracts: other.contracts,
          rewards: other.rewards,
          crew: other.crew,
        }
      : undefined,
    public: {
      port: state.port,
      values: state.values,
      currentPlayerId: state.currentPlayerId,
      turn: state.turn,
      stockRemaining: state.deck.length,
      emptyTracks: [],
      actionLog: state.actionLog,
    },
    result: state.result,
  } as PlayerView;
};
