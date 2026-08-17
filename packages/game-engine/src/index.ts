export type PlayerId = string;

export const GOODS = [
  "royal-jewels",
  "gold-chests",
  "spanish-silver",
  "rum",
  "tobacco",
  "provisions",
] as const;
export type GoodType = (typeof GOODS)[number];
export type ItemType = GoodType | "crew";

export const GOOD_INFO: Record<
  GoodType,
  {
    label: string;
    shortLabel: string;
    icon: string;
    supply: number;
    values: number[];
    minimum: number;
  }
> = {
  "royal-jewels": {
    label: "Joias Reais",
    shortLabel: "Joias",
    icon: "👑",
    supply: 5,
    values: [7, 7, 5, 5],
    minimum: 2,
  },
  "gold-chests": {
    label: "Baús de Ouro",
    shortLabel: "Baús",
    icon: "🪎",
    supply: 5,
    values: [6, 6, 5, 5],
    minimum: 2,
  },
  "spanish-silver": {
    label: "Prataria Espanhola",
    shortLabel: "Prataria",
    icon: "🥈",
    supply: 5,
    values: [5, 5, 5, 5],
    minimum: 2,
  },
  rum: {
    label: "Rum",
    shortLabel: "Rum",
    icon: "🛢️",
    supply: 5,
    values: [5, 3, 3, 2, 2],
    minimum: 1,
  },
  tobacco: {
    label: "Tabaco",
    shortLabel: "Tabaco",
    icon: "🍂",
    supply: 6,
    values: [5, 3, 3, 2, 2, 1],
    minimum: 1,
  },
  provisions: {
    label: "Mantimentos",
    shortLabel: "Mantimentos",
    icon: "📦",
    supply: 8,
    values: [4, 3, 2, 1, 1, 1, 1, 1],
    minimum: 1,
  },
};

export const CREW_SUPPLY = 9;
export type GamePhase = "playing" | "finished";

export type GoodItem = { id: string; type: GoodType };
export type CrewItem = { id: string; type: "crew" };
export type Item = GoodItem | CrewItem;
export type PlayerState = {
  id: PlayerId;
  displayName: string;
  goods: GoodItem[];
  crew: number;
  prestige: number;
  contracts: number;
  rewards: number;
  contractPrestige: number;
};
export type PublicPlayer = {
  id: PlayerId;
  displayName: string;
  goodsCount: number;
  prestige: number;
  contracts: number;
  rewards: number;
  crew: number;
};
export type GameState = {
  id: string;
  seed: number;
  phase: GamePhase;
  players: PlayerState[];
  deck: Item[];
  port: Item[];
  values: Record<GoodType, number[]>;
  currentPlayerId: PlayerId;
  turn: number;
  actionLog: string[];
  result?: GameResult;
};
export type GameResult = {
  winnerId?: PlayerId;
  draw: boolean;
  players: Array<
    PublicPlayer & {
      crew: number;
      finalPrestige: number;
      crewBonus: number;
      contractPrestige: number;
    }
  >;
  reason: "two-empty-tracks" | "stock-empty";
};

export type Action =
  | {
      type: "take-good";
      playerId: PlayerId;
      itemId: string;
      clientActionId?: string;
      expectedVersion?: number;
    }
  | {
      type: "recruit-crew";
      playerId: PlayerId;
      clientActionId?: string;
      expectedVersion?: number;
    }
  | {
      type: "trade";
      playerId: PlayerId;
      takeItemIds: string[];
      giveGoodIds: string[];
      giveCrewCount: number;
      clientActionId?: string;
      expectedVersion?: number;
    }
  | {
      type: "sell";
      playerId: PlayerId;
      goodType: GoodType;
      quantity: number;
      clientActionId?: string;
      expectedVersion?: number;
    };

export type ActionResult = { state: GameState; event: GameEvent };
export type GameEvent = {
  type:
    | "good-taken"
    | "crew-recruited"
    | "trade-complete"
    | "goods-sold"
    | "game-finished";
  playerId: PlayerId;
  payload: Record<string, unknown>;
};
export type PlayerView = {
  gameId: string;
  phase: GamePhase;
  me: {
    id: PlayerId;
    displayName: string;
    goods: GoodItem[];
    crew: number;
    prestige: number;
    contracts: number;
    rewards: number;
    contractPrestige: number;
  };
  opponent?: PublicPlayer;
  public: {
    port: Item[];
    values: Record<GoodType, number[]>;
    currentPlayerId: PlayerId;
    turn: number;
    stockRemaining: number;
    emptyTracks: GoodType[];
    actionLog: string[];
  };
  result?: GameResult;
};

const clone = <T>(value: T): T => structuredClone(value);
const makeRng = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};
const shuffle = <T>(items: T[], seed: number): T[] => {
  const rng = makeRng(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
const item = (type: ItemType, index: number): Item =>
  ({ id: `${type}-${index + 1}`, type }) as Item;

export function createGame(
  config: {
    gameId?: string;
    players: Array<{ id: string; displayName: string }>;
  },
  seed = Date.now(),
): GameState {
  if (config.players.length !== 2)
    throw new Error("Nassau requires exactly two players");
  const allItems: Item[] = [];
  GOODS.forEach((type) => {
    for (let i = 0; i < GOOD_INFO[type].supply; i += 1)
      allItems.push(item(type, i));
  });
  for (let i = 0; i < CREW_SUPPLY; i += 1) allItems.push(item("crew", i));
  const crewInPort: CrewItem[] = allItems
    .filter((entry): entry is CrewItem => entry.type === "crew")
    .slice(0, 3);
  const shuffled = shuffle(
    allItems.filter(
      (entry) => !crewInPort.some((crew) => crew.id === entry.id),
    ),
    seed,
  );
  const players: PlayerState[] = config.players.map((player) => ({
    id: player.id,
    displayName: player.displayName,
    goods: [],
    crew: 0,
    prestige: 0,
    contracts: 0,
    rewards: 0,
    contractPrestige: 0,
  }));
  for (const player of players) {
    for (let i = 0; i < 5; i += 1) {
      const dealt = shuffled.shift();
      if (dealt?.type === "crew") player.crew += 1;
      else if (dealt) player.goods.push(dealt);
    }
  }
  const port: Item[] = [...crewInPort];
  for (let i = 0; i < 2; i += 1) {
    const revealed = shuffled.shift();
    if (revealed) port.push(revealed);
  }
  return {
    id: config.gameId ?? `game-${seed}`,
    seed,
    phase: "playing",
    players,
    deck: shuffled,
    port,
    values: Object.fromEntries(
      GOODS.map((type) => [type, [...GOOD_INFO[type].values]]),
    ) as Record<GoodType, number[]>,
    currentPlayerId: players[seed % 2].id,
    turn: 1,
    actionLog: [],
  };
}

const playerOf = (state: GameState, id: string) => {
  const player = state.players.find((candidate) => candidate.id === id);
  if (!player) throw new Error("Player is not part of this game");
  return player;
};
const assertTurn = (state: GameState, playerId: string) => {
  if (state.phase !== "playing") throw new Error("Game has finished");
  if (state.currentPlayerId !== playerId)
    throw new Error("It is not this player's turn");
};
const replenish = (state: GameState, count: number) => {
  for (let i = 0; i < count && state.deck.length > 0; i += 1)
    state.port.push(state.deck.shift() as Item);
};
const emptyTracks = (state: GameState) =>
  GOODS.filter((type) => state.values[type].length === 0);
const finishIfNeeded = (state: GameState, reason: GameResult["reason"]) => {
  const tracksEmpty = emptyTracks(state).length >= 2;
  const stockEmpty = reason === "stock-empty";
  if (!tracksEmpty && !stockEmpty) return false;
  const ranked = state.players.map((player) => ({
    id: player.id,
    displayName: player.displayName,
    goodsCount: player.goods.length,
    prestige: player.prestige,
    contracts: player.contracts,
    rewards: player.rewards,
    crew: player.crew,
    finalPrestige:
      player.prestige +
      (player.crew > state.players.find((other) => other.id !== player.id)!.crew
        ? 5
        : 0),
    crewBonus:
      player.crew > state.players.find((other) => other.id !== player.id)!.crew
        ? 5
        : 0,
    contractPrestige: player.contractPrestige,
  }));
  ranked.forEach((entry) => {
    const target = state.players.find((player) => player.id === entry.id)!;
    target.prestige = entry.finalPrestige;
  });
  const ordered = [...ranked].sort(
    (a, b) =>
      b.finalPrestige - a.finalPrestige ||
      b.contracts - a.contracts ||
      b.rewards - a.rewards,
  );
  const tied =
    ordered.length > 1 &&
    ordered[0].finalPrestige === ordered[1].finalPrestige &&
    ordered[0].contracts === ordered[1].contracts &&
    ordered[0].rewards === ordered[1].rewards;
  state.phase = "finished";
  state.result = {
    winnerId: tied ? undefined : ordered[0].id,
    draw: tied,
    players: ranked,
    reason: tracksEmpty ? "two-empty-tracks" : "stock-empty",
  };
  return true;
};

export function getLegalActions(
  state: GameState,
  playerId: PlayerId,
): Action[] {
  if (state.phase !== "playing" || state.currentPlayerId !== playerId)
    return [];
  const player = playerOf(state, playerId);
  const actions: Action[] = [];
  state.port.forEach((entry) => {
    if (entry.type !== "crew" && player.goods.length < 7)
      actions.push({ type: "take-good", playerId, itemId: entry.id });
  });
  if (state.port.some((entry) => entry.type === "crew"))
    actions.push({ type: "recruit-crew", playerId });
  const portGoods = state.port.filter(
    (entry): entry is GoodItem => entry.type !== "crew",
  );
  const take = portGoods
    .slice(0, Math.min(2, portGoods.length))
    .map((entry) => entry.id);
  const takenTypes = new Set(
    portGoods.slice(0, take.length).map((entry) => entry.type),
  );
  const giveGoodIds = player.goods
    .filter((entry) => !takenTypes.has(entry.type))
    .slice(0, take.length)
    .map((entry) => entry.id);
  const giveCrewCount = take.length - giveGoodIds.length;
  if (
    take.length >= 1 &&
    giveCrewCount >= 0 &&
    giveCrewCount <= player.crew &&
    player.goods.length - giveGoodIds.length + take.length <= 7
  )
    actions.push({
      type: "trade",
      playerId,
      takeItemIds: take,
      giveGoodIds,
      giveCrewCount,
    });
  GOODS.forEach((type) => {
    const count = player.goods.filter((entry) => entry.type === type).length;
    if (count >= GOOD_INFO[type].minimum)
      actions.push({
        type: "sell",
        playerId,
        goodType: type,
        quantity: GOOD_INFO[type].minimum,
      });
  });
  return actions;
}

export function applyAction(input: GameState, action: Action): ActionResult {
  const state = clone(input);
  assertTurn(state, action.playerId);
  const player = playerOf(state, action.playerId);
  let event: GameEvent;
  let endsBecauseStock = false;
  if (action.type === "take-good") {
    if (player.goods.length >= 7) throw new Error("Your cargo hold is full");
    const index = state.port.findIndex(
      (entry) => entry.id === action.itemId && entry.type !== "crew",
    );
    if (index < 0) throw new Error("That good is not available in the port");
    const [taken] = state.port.splice(index, 1);
    player.goods.push(taken as GoodItem);
    if (state.deck.length > 0) replenish(state, 1);
    else endsBecauseStock = true;
    event = {
      type: "good-taken",
      playerId: player.id,
      payload: { itemId: taken.id, goodType: taken.type },
    };
  } else if (action.type === "recruit-crew") {
    const crew = state.port.filter(
      (entry): entry is CrewItem => entry.type === "crew",
    );
    if (crew.length === 0) throw new Error("There is no crew in the port");
    state.port = state.port.filter((entry) => entry.type !== "crew");
    player.crew += crew.length;
    replenish(state, crew.length);
    endsBecauseStock = state.deck.length === 0 && state.port.length < 5;
    event = {
      type: "crew-recruited",
      playerId: player.id,
      payload: { count: crew.length },
    };
  } else if (action.type === "trade") {
    if (
      action.takeItemIds.length < 1 ||
      action.takeItemIds.length !==
        action.giveGoodIds.length + action.giveCrewCount
    )
      throw new Error("A trade must exchange one or more items one for one");
    if (new Set(action.takeItemIds).size !== action.takeItemIds.length)
      throw new Error("A port item cannot be selected twice");
    const taken = action.takeItemIds.map((id) =>
      state.port.find((entry) => entry.id === id),
    );
    if (taken.some((entry) => !entry || entry.type === "crew"))
      throw new Error("Only goods can be taken in a trade");
    if (new Set(action.giveGoodIds).size !== action.giveGoodIds.length)
      throw new Error("A good can only be given once");
    const given = action.giveGoodIds.map((id) =>
      player.goods.find((entry) => entry.id === id),
    );
    if (given.some((entry) => !entry))
      throw new Error("You can only give goods from your hand");
    if (
      given.some((entry) =>
        taken.some((portItem) => portItem!.type === entry!.type),
      )
    )
      throw new Error("A good cannot be both given and received");
    if (player.goods.length - given.length + taken.length > 7)
      throw new Error("Your cargo hold would be full");
    state.port = state.port.filter(
      (entry) => !action.takeItemIds.includes(entry.id),
    );
    player.goods = player.goods.filter(
      (entry) => !action.giveGoodIds.includes(entry.id),
    );
    player.goods.push(...(taken as GoodItem[]));
    state.port.push(...(given as GoodItem[]));
    for (let i = 0; i < action.giveCrewCount; i += 1) {
      if (player.crew <= 0) throw new Error("You do not have enough crew");
      player.crew -= 1;
      state.port.push(item("crew", 100 + state.port.length + i));
    }
    event = {
      type: "trade-complete",
      playerId: player.id,
      payload: {
        received: taken.map((entry) => entry!.type),
        given: action.giveGoodIds.length + action.giveCrewCount,
      },
    };
  } else {
    const count = player.goods.filter(
      (entry) => entry.type === action.goodType,
    ).length;
    const info = GOOD_INFO[action.goodType];
    if (
      !Number.isInteger(action.quantity) ||
      action.quantity < info.minimum ||
      action.quantity > count
    )
      throw new Error(`Sell at least ${info.minimum} ${info.label}`);
    const selected = player.goods
      .filter((entry) => entry.type === action.goodType)
      .slice(0, action.quantity);
    player.goods = player.goods.filter(
      (entry) => !selected.some((chosen) => chosen.id === entry.id),
    );
    const rewards = state.values[action.goodType].splice(0, action.quantity);
    const points = rewards.reduce((sum, value) => sum + value, 0);
    const contractPrestige =
      action.quantity >= 5
        ? 9
        : action.quantity === 4
          ? 5
          : action.quantity === 3
            ? 2
            : 0;
    player.rewards += points;
    player.prestige += points + contractPrestige;
    player.contractPrestige += contractPrestige;
    if (contractPrestige > 0) player.contracts += 1;
    event = {
      type: "goods-sold",
      playerId: player.id,
      payload: {
        goodType: action.goodType,
        quantity: action.quantity,
        rewards,
        points,
        contractPrestige,
      },
    };
  }
  state.actionLog.push(`${player.displayName}: ${action.type}`);
  if (
    finishIfNeeded(state, endsBecauseStock ? "stock-empty" : "two-empty-tracks")
  )
    event = {
      type: "game-finished",
      playerId: player.id,
      payload: { result: state.result! },
    };
  else {
    state.currentPlayerId = state.players.find(
      (candidate) => candidate.id !== player.id,
    )!.id;
    state.turn += 1;
  }
  return { state, event };
}

export function getPlayerView(
  state: GameState,
  playerId: PlayerId,
): PlayerView {
  const me = playerOf(state, playerId);
  const other = state.players.find((player) => player.id !== playerId);
  return {
    gameId: state.id,
    phase: state.phase,
    me: clone(me),
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
      port: clone(state.port),
      values: clone(state.values),
      currentPlayerId: state.currentPlayerId,
      turn: state.turn,
      stockRemaining: state.deck.length,
      emptyTracks: emptyTracks(state),
      actionLog: [...state.actionLog],
    },
    result: clone(state.result),
  };
}

export function getSalePreview(
  state: GameState,
  playerId: PlayerId,
  goodType: GoodType,
  quantity: number,
) {
  const player = playerOf(state, playerId);
  const available = state.values[goodType].slice(0, quantity);
  const contractPrestige =
    quantity >= 5 ? 9 : quantity === 4 ? 5 : quantity === 3 ? 2 : 0;
  return {
    goodType,
    quantity,
    rewards: available,
    rewardTotal: available.reduce((sum, value) => sum + value, 0),
    contractPrestige,
    total: available.reduce((sum, value) => sum + value, 0) + contractPrestige,
    canSell:
      player.goods.filter((entry) => entry.type === goodType).length >=
      Math.max(GOOD_INFO[goodType].minimum, quantity),
  };
}

export function isGameOver(state: GameState) {
  return state.phase === "finished";
}
export function getResult(state: GameState) {
  return state.result;
}
