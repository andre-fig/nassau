import {
  Action,
  GameState,
  GoodType,
  GOOD_INFO,
  PlayerId,
  PlayerView,
  getLegalActions,
  getSalePreview,
} from "@nassau/game-engine";

export type Difficulty = "easy" | "normal" | "hard";

const saleScore = (
  view: PlayerView,
  playerId: PlayerId,
  type: GoodType,
  difficulty: Difficulty,
) => {
  const count = view.me.goods.filter((item) => item.type === type).length;
  if (count < GOOD_INFO[type].minimum) return -Infinity;
  const quantity = difficulty === "easy" ? GOOD_INFO[type].minimum : count;
  const preview = getSalePreviewFromView(view, type, quantity);
  return (
    preview.total +
    (count >= 3 ? 4 : 0) +
    (view.public.values[type].length <= quantity ? 3 : 0)
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
  if (sells.length > 0) {
    const ranked = sells
      .map((action) => ({
        action,
        score: saleScore(view, view.me.id, action.goodType, difficulty),
      }))
      .sort((a, b) => b.score - a.score);
    if (difficulty !== "easy" || ranked[0].score > 6)
      return { ...ranked[0].action, clientActionId: `ai-${view.public.turn}` };
  }
  if (difficulty === "hard" && trades.length > 0)
    return { ...trades[0], clientActionId: `ai-${view.public.turn}` };
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

const valueOf = (view: PlayerView, itemId: string) => {
  const item = view.public.port.find((entry) => entry.id === itemId);
  return item && item.type !== "crew"
    ? (view.public.values[item.type][0] ?? 0)
    : 0;
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
  const portGoods = view.public.port.filter((entry) => entry.type !== "crew");
  const takeItemIds = portGoods
    .slice(0, Math.min(2, portGoods.length))
    .map((entry) => entry.id);
  const takenTypes = new Set(
    portGoods.slice(0, takeItemIds.length).map((entry) => entry.type),
  );
  const giveGoodIds = view.me.goods
    .filter((entry) => !takenTypes.has(entry.type))
    .slice(0, takeItemIds.length)
    .map((entry) => entry.id);
  const giveCrewCount = takeItemIds.length - giveGoodIds.length;
  if (
    takeItemIds.length >= 1 &&
    giveCrewCount >= 0 &&
    giveCrewCount <= view.me.crew &&
    view.me.goods.length - giveGoodIds.length + takeItemIds.length <= 7
  ) {
    actions.push({
      type: "trade",
      playerId: view.me.id,
      takeItemIds,
      giveGoodIds,
      giveCrewCount,
    });
  }
  for (const type of Object.keys(GOOD_INFO) as GoodType[]) {
    const count = view.me.goods.filter((entry) => entry.type === type).length;
    if (count >= GOOD_INFO[type].minimum)
      actions.push({
        type: "sell",
        playerId: view.me.id,
        goodType: type,
        quantity: count,
      });
  }
  return actions;
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
