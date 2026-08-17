import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { chooseAction, Difficulty } from "@nassau/game-ai";
import {
  Action,
  applyAction,
  createGame,
  GameState,
  getPlayerView,
  getSalePreview,
  GOOD_INFO,
  GoodType,
  PlayerView,
} from "@nassau/game-engine";
import { io } from "socket.io-client";
import { LoadingVideo } from "./LoadingVideo";
import { GameActionButton } from "./components/GameActionButton";
import { GoodsInventoryGrid } from "./components/GoodsInventoryGrid";
import { OpponentHeader } from "./components/OpponentHeader";
import { PortGrid } from "./components/PortGrid";
import { SellModal } from "./components/SellModal";

type Screen =
  | "loading"
  | "menu"
  | "offline"
  | "difficulty"
  | "setup"
  | "online"
  | "game"
  | "result"
  | "settings";
type Profile = {
  guestId: string;
  displayName: string;
  musicEnabled: boolean;
  soundEffectsEnabled: boolean;
  tutorialEnabled: boolean;
};
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? "http://localhost:3000";
const profileKey = "nassau-profile";
const defaultProfile = (): Profile => ({
  guestId: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  displayName: `Capitão ${Math.floor(1000 + Math.random() * 9000)}`,
  musicEnabled: true,
  soundEffectsEnabled: true,
  tutorialEnabled: true,
});

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [game, setGame] = useState<GameState>();
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [error, setError] = useState("");
  const [pendingJoinCode, setPendingJoinCode] = useState("");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(profileKey),
      Linking.getInitialURL(),
    ]).then(([saved, url]) => {
      if (saved) setProfile(JSON.parse(saved));
      const match = url?.match(/join\/([a-z0-9]{6})/i);
      if (match) {
        setPendingJoinCode(match[1].toUpperCase());
        setScreen("online");
      } else setTimeout(() => setScreen("menu"), 450);
    });
  }, []);
  const saveProfile = (next: Profile) => {
    setProfile(next);
    void AsyncStorage.setItem(profileKey, JSON.stringify(next));
  };
  const startLocal = () => {
    const players = [
      { id: profile.guestId, displayName: profile.displayName },
      { id: "computer", displayName: "A Maré" },
    ];
    setGame(createGame({ players }, Date.now()));
    setScreen("game");
  };

  if (screen === "loading") return <Loading />;
  if (screen === "menu")
    return (
      <Menu
        profile={profile}
        onEdit={() => setScreen("settings")}
        onOffline={() => setScreen("offline")}
        onOnline={() => setScreen("online")}
      />
    );
  if (screen === "offline")
    return (
      <ModeScreen
        onBack={() => setScreen("menu")}
        onAI={() => setScreen("difficulty")}
      />
    );
  if (screen === "difficulty")
    return (
      <DifficultyScreen
        onBack={() => setScreen("offline")}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        onStart={startLocal}
      />
    );
  if (screen === "online")
    return (
      <OnlineScreen
        profile={profile}
        initialCode={pendingJoinCode}
        onBack={() => setScreen("menu")}
        onError={setError}
        error={error}
      />
    );
  if (screen === "settings")
    return (
      <Settings
        profile={profile}
        save={saveProfile}
        onBack={() => setScreen("menu")}
      />
    );
  if (screen === "result" && game?.result)
    return (
      <ResultScreen
        state={game}
        onAgain={startLocal}
        onMenu={() => setScreen("menu")}
      />
    );
  if (screen === "game" && game)
    return (
      <GameScreen
        state={game}
        difficulty={difficulty}
        setState={(next) => {
          setGame(next);
          if (next.phase === "finished") setScreen("result");
        }}
      />
    );
  return null;
}

function Loading() {
  return (
    <View style={styles.loadingRoot}>
      <LoadingVideo style={styles.loadingVideo} />
      <LinearGradient
        colors={["rgba(3, 20, 30, 0.28)", "rgba(3, 19, 29, 0.82)"]}
        style={styles.loadingShade}
      >
        <Text style={styles.brand}>NASSAU</Text>
        <Text style={styles.motto}>COMÉRCIO. MARÉS. PRESTÍGIO.</Text>
        <ActivityIndicator color="#d6ad5b" style={{ marginTop: 28 }} />
        <Text style={styles.muted}>Iniciando Nassau...</Text>
      </LinearGradient>
    </View>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#082f3d", "#061a27"]} style={styles.shell}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </LinearGradient>
  );
}
function Brand() {
  return (
    <View style={styles.brandBlock}>
      <Text style={styles.emblem}>☠︎</Text>
      <Text style={styles.brand}>NASSAU</Text>
      <Text style={styles.motto}>PORTO • COMÉRCIO • PRESTÍGIO</Text>
    </View>
  );
}
function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && styles.buttonSecondaryText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function Menu({
  profile,
  onEdit,
  onOffline,
  onOnline,
}: {
  profile: Profile;
  onEdit: () => void;
  onOffline: () => void;
  onOnline: () => void;
}) {
  return (
    <Shell>
      <Brand />
      <View style={styles.profile}>
        <Text style={styles.avatar}>⚓</Text>
        <View>
          <Text style={styles.eyebrow}>CAPITÃO LOCAL</Text>
          <Text style={styles.name}>{profile.displayName}</Text>
        </View>
        <Pressable onPress={onEdit} accessibilityLabel="Editar nome">
          <Text style={styles.edit}>Editar</Text>
        </Pressable>
      </View>
      <View style={styles.menuCard}>
        <Button label="JOGAR OFFLINE" onPress={onOffline} />
        <Button label="JOGAR COM AMIGO" onPress={onOnline} secondary />
        <Button label="AMIGOS RECENTES" onPress={() => {}} secondary />
      </View>
      <Text style={styles.quote}>
        “A melhor carga é a que chega antes da maré virar.”
      </Text>
    </Shell>
  );
}
function ModeScreen({
  onBack,
  onAI,
}: {
  onBack: () => void;
  onAI: () => void;
}) {
  return (
    <Shell>
      <Back onPress={onBack} />
      <Brand />
      <Text style={styles.title}>Escolha sua mesa</Text>
      <Text style={styles.muted}>Partidas rápidas, uma única rodada.</Text>
      <View style={styles.menuCard}>
        <Button label="CONTRA A MÁQUINA" onPress={onAI} />
      </View>
    </Shell>
  );
}
function DifficultyScreen({
  onBack,
  difficulty,
  setDifficulty,
  onStart,
}: {
  onBack: () => void;
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
  onStart: () => void;
}) {
  return (
    <Shell>
      <Back onPress={onBack} />
      <Text style={styles.title}>Escolha a maré</Text>
      {(["easy", "normal", "hard"] as Difficulty[]).map((value) => (
        <Pressable
          key={value}
          onPress={() => setDifficulty(value)}
          style={[styles.choice, difficulty === value && styles.choiceActive]}
        >
          <Text style={styles.choiceTitle}>
            {value === "easy"
              ? "MARÉ CALMA"
              : value === "normal"
                ? "MARÉ CHEIA"
                : "MARÉ BRAVA"}
          </Text>
          <Text style={styles.muted}>
            {value === "easy"
              ? "Para aprender o porto."
              : value === "normal"
                ? "Decisões equilibradas."
                : "A máquina bloqueia oportunidades."}
          </Text>
        </Pressable>
      ))}
      <Button label="COMEÇAR PARTIDA" onPress={onStart} />
    </Shell>
  );
}
function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Voltar">
      <Text style={styles.back}>‹ Voltar</Text>
    </Pressable>
  );
}

function GameScreen({
  state,
  difficulty,
  setState,
}: {
  state: GameState;
  difficulty: Difficulty;
  setState: (next: GameState) => void;
}) {
  const [selectedType, setSelectedType] = useState<GoodType>();
  const [selectedGoodIds, setSelectedGoodIds] = useState<string[]>([]);
  const [selectedPortIds, setSelectedPortIds] = useState<string[]>([]);
  const [sellType, setSellType] = useState<GoodType>();
  const [message, setMessage] = useState("");
  const current = state.players.find(
    (player) => player.id === state.currentPlayerId,
  )!;
  const view = getPlayerView(state, current.id);
  const isAI = current.id === "computer";
  useEffect(() => {
    if (!isAI || state.phase !== "playing") return;
    const chosen = chooseAction(getPlayerView(state, "computer"), difficulty);
    if (!chosen) return;
    const timer = setTimeout(() => {
      try {
        setState(applyAction(state, chosen).state);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "A IA não conseguiu agir.",
        );
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [isAI, state, difficulty, setState]);
  if (isAI)
    return (
      <Shell>
        <View style={styles.centerSmall}>
          <ActivityIndicator color="#d6ad5b" />
          <Text style={styles.title}>A Maré está pensando...</Text>
          <Text style={styles.muted}>
            O oponente vê apenas o que é público.
          </Text>
        </View>
      </Shell>
    );
  const act = (action: Action) => {
    try {
      setSelectedType(undefined);
      setSelectedGoodIds([]);
      setSelectedPortIds([]);
      setSellType(undefined);
      setState(applyAction(state, action).state);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ação inválida");
    }
  };
  const saleCount = sellType ? selectedGoodIds.length : 0;
  const preview = sellType
    ? getSalePreview(state, current.id, sellType, saleCount)
    : undefined;
  const contractName =
    saleCount >= 5
      ? "Contrato Grande"
      : saleCount === 4
        ? "Contrato Médio"
        : saleCount === 3
          ? "Contrato Pequeno"
          : undefined;
  const selectedPortItems = view.public.port.filter((item) =>
    selectedPortIds.includes(item.id),
  );
  const selectedPortGoods = selectedPortItems.filter(
    (item) => item.type !== "crew",
  );
  const selectedPortTypes = new Set(selectedPortGoods.map((item) => item.type));
  const selectedInventoryGoods = current.goods.filter((item) =>
    selectedGoodIds.includes(item.id),
  );
  const tradeGiveGoods = selectedInventoryGoods.filter(
    (item) => !selectedPortTypes.has(item.type),
  );
  const tradeCrewCount = selectedPortGoods.length - tradeGiveGoods.length;
  const canTradePort =
    selectedPortGoods.length >= 1 &&
    selectedPortItems.length === selectedPortGoods.length &&
    tradeGiveGoods.length === selectedInventoryGoods.length &&
    tradeCrewCount >= 0 &&
    tradeCrewCount <= current.crew;
  const allSelectedCrew =
    selectedPortItems.length > 0 &&
    selectedPortItems.every((item) => item.type === "crew") &&
    selectedPortItems.length ===
      view.public.port.filter((item) => item.type === "crew").length;
  const canTakePort =
    (selectedGoodIds.length === 0 &&
      selectedPortItems.length === 1 &&
      selectedPortItems[0].type !== "crew") ||
    (selectedGoodIds.length === 0 && allSelectedCrew);
  const canSellInventory =
    selectedPortItems.length === 0 &&
    selectedGoodIds.length > 0 &&
    Boolean(selectedType) &&
    selectedGoodIds.length >=
      (selectedType ? GOOD_INFO[selectedType].minimum : 1);
  return (
    <Shell>
      <OpponentHeader
        displayName={view.opponent?.displayName}
        cardCount={view.opponent?.goodsCount}
        prestige={view.opponent?.prestige}
        crew={view.opponent?.crew}
      />
      <Text style={styles.section}>PORTO DE NASSAU</Text>
      <PortGrid
        items={view.public.port}
        selectedItemIds={selectedPortIds}
        onSelectItem={(item) => {
          if (item.type === "crew") {
            setSelectedType(undefined);
            setSelectedGoodIds([]);
            const crewIds = view.public.port
              .filter((entry) => entry.type === "crew")
              .map((entry) => entry.id);
            setSelectedPortIds((currentIds) =>
              crewIds.every((id) => currentIds.includes(id)) &&
              currentIds.length === crewIds.length
                ? []
                : crewIds,
            );
          } else {
            setSelectedPortIds((currentIds) => {
              const selectedGoods = currentIds.filter(
                (id) =>
                  view.public.port.find((entry) => entry.id === id)?.type !==
                  "crew",
              );
              return selectedGoods.includes(item.id)
                ? selectedGoods.filter((id) => id !== item.id)
                : [...selectedGoods, item.id];
            });
          }
        }}
      />
      <View style={styles.handHeader}>
        <View>
          <Text style={styles.section}>SEU INVENTÁRIO (PRIVADO)</Text>
          <Text style={styles.turnLabel}>
            TURNO {state.turn} · {current.displayName}
          </Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.eyebrow}>PRESTÍGIO</Text>
          <Text style={styles.scoreText}>{current.prestige}</Text>
        </View>
      </View>
      <View style={styles.cargoBar}>
        <Text style={styles.cargo}>
          {current.goods.length}/7 cargas · 👥 {current.crew}
        </Text>
      </View>
      <GoodsInventoryGrid
        goods={current.goods}
        selectedItemIds={selectedGoodIds}
        onSelectItem={(item) => {
          setSellType(undefined);
          if (selectedPortItems.some((entry) => entry.type === "crew")) {
            setSelectedPortIds([]);
          }
          if (selectedGoodIds.includes(item.id)) {
            const nextIds = selectedGoodIds.filter((id) => id !== item.id);
            setSelectedGoodIds(nextIds);
          } else {
            setSelectedGoodIds([...selectedGoodIds, item.id]);
          }
          const nextTypeIds = selectedGoodIds.includes(item.id)
            ? selectedGoodIds.filter((id) => id !== item.id)
            : [...selectedGoodIds, item.id];
          const nextTypes = new Set(
            current.goods
              .filter((entry) => nextTypeIds.includes(entry.id))
              .map((entry) => entry.type),
          );
          setSelectedType(nextTypes.size === 1 ? [...nextTypes][0] : undefined);
        }}
      />
      <View style={styles.actionBar}>
        <GameActionButton
          action="take"
          label="PEGAR"
          onPress={() => {
            if (allSelectedCrew) {
              act({ type: "recruit-crew", playerId: current.id });
            } else if (canTakePort) {
              act({
                type: "take-good",
                playerId: current.id,
                itemId: selectedPortItems[0].id,
              });
            }
          }}
          disabled={
            !canTakePort || (!allSelectedCrew && current.goods.length >= 7)
          }
        />
        <GameActionButton
          action="trade"
          label="TROCAR"
          onPress={() => {
            if (canTradePort) {
              act({
                type: "trade",
                playerId: current.id,
                takeItemIds: selectedPortGoods.map((item) => item.id),
                giveGoodIds: tradeGiveGoods.map((item) => item.id),
                giveCrewCount: tradeCrewCount,
              });
            }
          }}
          disabled={!canTradePort}
        />
        <GameActionButton
          action="sell"
          label="VENDER"
          onPress={() => {
            if (selectedType) setSellType(selectedType);
          }}
          disabled={!canSellInventory}
        />
      </View>
      <SellModal
        visible={Boolean(sellType)}
        goodType={sellType}
        quantity={saleCount}
        rewards={preview?.rewards ?? []}
        contractName={contractName}
        contractPrestige={preview?.contractPrestige ?? 0}
        total={preview?.total ?? 0}
        onClose={() => setSellType(undefined)}
        onConfirm={() => {
          if (sellType)
            act({
              type: "sell",
              playerId: current.id,
              goodType: sellType,
              quantity: saleCount,
            });
        }}
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Text style={styles.stock}>
        Estoque oculto: {view.public.stockRemaining} itens · Trilhas esgotadas:{" "}
        {view.public.emptyTracks.length}/2
      </Text>
    </Shell>
  );
}

function ResultScreen({
  state,
  onAgain,
  onMenu,
}: {
  state: GameState;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const result = state.result!;
  return (
    <Shell>
      <Brand />
      <Text style={styles.title}>
        {result.draw
          ? "EMPATE NO PORTO"
          : `${result.players.find((p) => p.id === result.winnerId)?.displayName} VENCE`}
      </Text>
      {result.players.map((player) => (
        <View key={player.id} style={styles.resultCard}>
          <View>
            <Text style={styles.name}>{player.displayName}</Text>
            <Text style={styles.muted}>
              {player.goodsCount} cargas · {player.contracts} contratos · 👥{" "}
              {player.crew}
            </Text>
          </View>
          <Text style={styles.finalScore}>{player.finalPrestige}</Text>
        </View>
      ))}
      <Button label="JOGAR NOVAMENTE" onPress={onAgain} />
      <Button label="VOLTAR AO MENU" onPress={onMenu} secondary />
    </Shell>
  );
}

function Settings({
  profile,
  save,
  onBack,
}: {
  profile: Profile;
  save: (next: Profile) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(profile.displayName);
  return (
    <Shell>
      <Back onPress={onBack} />
      <Text style={styles.title}>Configurações</Text>
      <Text style={styles.label}>Nome do capitão</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Button
        label="SALVAR NOME"
        onPress={() => {
          save({ ...profile, displayName: name.trim() || profile.displayName });
          onBack();
        }}
      />
      {(
        ["musicEnabled", "soundEffectsEnabled", "tutorialEnabled"] as const
      ).map((key) => (
        <Pressable
          key={key}
          onPress={() => save({ ...profile, [key]: !profile[key] })}
          style={styles.toggle}
        >
          <Text style={styles.muted}>
            {key === "musicEnabled"
              ? "Música ambiente"
              : key === "soundEffectsEnabled"
                ? "Efeitos sonoros"
                : "Tutorial contextual"}
          </Text>
          <Text style={styles.toggleValue}>
            {profile[key] ? "LIGADO" : "DESLIGADO"}
          </Text>
        </Pressable>
      ))}
    </Shell>
  );
}

function OnlineScreen({
  profile,
  initialCode,
  onBack,
  onError,
  error,
}: {
  profile: Profile;
  initialCode: string;
  onBack: () => void;
  onError: (value: string) => void;
  error: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{
    code: string;
    reconnectToken: string;
    guestPublicId: string;
    view?: PlayerView;
  }>();
  const [view, setView] = useState<PlayerView>();
  useEffect(() => {
    if (!session) return;
    const socket = io(`${WS_URL}/game`, { transports: ["websocket"] });
    socket.on("connect", () =>
      socket.emit("room:subscribe", {
        code: session.code,
        reconnectToken: session.reconnectToken,
      }),
    );
    socket.on("game:state", (next: PlayerView) => setView(next));
    socket.on("game:error", (next: { message?: string }) =>
      onError(next.message ?? "A conexão foi recusada."),
    );
    const poll = setInterval(async () => {
      if (view) return;
      try {
        const room = (await fetch(`${API_URL}/rooms/${session.code}`).then(
          (response) => response.json(),
        )) as { seats?: unknown[] };
        if ((room.seats?.length ?? 0) === 2) {
          const reconnected = (await fetch(
            `${API_URL}/rooms/${session.code}/reconnect`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reconnectToken: session.reconnectToken }),
            },
          ).then((response) => response.json())) as { view?: PlayerView };
          if (reconnected.view) setView(reconnected.view);
        }
      } catch {
        /* the socket will report an actionable error */
      }
    }, 1800);
    return () => {
      clearInterval(poll);
      socket.disconnect();
    };
  }, [session, view, onError]);
  if (view)
    return (
      <OnlineMatch
        view={view}
        onView={setView}
        code={session?.code ?? ""}
        reconnectToken={session?.reconnectToken ?? ""}
        onBack={onBack}
      />
    );
  const create = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName,
          guestPublicId: profile.guestId,
        }),
      });
      const data = await response.json();
      setInvite(data.inviteUrl);
      setSession({
        code: data.code,
        reconnectToken: data.reconnectToken,
        guestPublicId: profile.guestId,
      });
    } catch {
      onError(
        "Não foi possível conectar ao porto. Inicie a API em localhost:3000.",
      );
    } finally {
      setLoading(false);
    }
  };
  const join = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/rooms/${code.toUpperCase()}/join`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            displayName: profile.displayName,
            guestPublicId: profile.guestId,
          }),
        },
      );
      if (!response.ok)
        throw new Error((await response.json()).message ?? "Sala cheia");
      const data = (await response.json()) as {
        code: string;
        reconnectToken: string;
        view?: PlayerView;
      };
      setSession({
        code: data.code,
        reconnectToken: data.reconnectToken,
        guestPublicId: profile.guestId,
      });
      if (data.view) setView(data.view);
    } catch (caught) {
      onError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível entrar na sala.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell>
      <Back onPress={onBack} />
      <Brand />
      <Text style={styles.title}>Jogar com amigo</Text>
      <Button
        label={loading ? "CONECTANDO..." : "CRIAR PARTIDA"}
        onPress={create}
        disabled={loading}
      />
      {session ? (
        <View style={styles.invite}>
          <Text style={styles.eyebrow}>SALA {session.code}</Text>
          <Text style={styles.inviteText}>
            {invite || "Aguardando seu oponente..."}
          </Text>
          {invite ? (
            <Button
              label="COMPARTILHAR"
              onPress={() => void Share.share({ message: invite })}
              secondary
            />
          ) : null}
        </View>
      ) : null}
      <Text style={styles.label}>Entrar por código</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={6}
        placeholder="ABCD12"
        placeholderTextColor="#7895a0"
      />
      <Button
        label="ENTRAR NA SALA"
        onPress={join}
        disabled={loading || code.length !== 6}
        secondary
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Shell>
  );
}

function OnlineMatch({
  view,
  onView,
  code,
  reconnectToken,
  onBack,
}: {
  view: PlayerView;
  onView: (next: PlayerView) => void;
  code: string;
  reconnectToken: string;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<GoodType>();
  const [selectedGoodIds, setSelectedGoodIds] = useState<string[]>([]);
  const [selectedPortIds, setSelectedPortIds] = useState<string[]>([]);
  const [sellType, setSellType] = useState<GoodType>();
  const [message, setMessage] = useState("");
  const socket = useMemo(
    () => io(`${WS_URL}/game`, { transports: ["websocket"] }),
    [],
  );
  useEffect(() => {
    socket.on("game:state", onView);
    socket.on("game:error", (next: { message?: string }) =>
      setMessage(next.message ?? "Ação inválida"),
    );
    socket.emit("room:subscribe", { code, reconnectToken });
    return () => {
      socket.disconnect();
    };
  }, [socket, code, reconnectToken, onView]);
  const send = (action: Record<string, unknown>) => {
    setMessage("");
    setSelectedGoodIds([]);
    setSelected(undefined);
    setSelectedPortIds([]);
    setSellType(undefined);
    socket.emit("game:action", {
      ...action,
      playerId: view.me.id,
      expectedVersion: view.public.turn,
      clientActionId: `${view.me.id}-${view.public.turn}-${Date.now()}`,
    });
  };
  const myTurn = view.public.currentPlayerId === view.me.id;
  const count = sellType ? selectedGoodIds.length : 0;
  const values = sellType ? view.public.values[sellType].slice(0, count) : [];
  const contractPrestige =
    count >= 5 ? 9 : count === 4 ? 5 : count === 3 ? 2 : 0;
  const contractName =
    count >= 5
      ? "Contrato Grande"
      : count === 4
        ? "Contrato Médio"
        : count === 3
          ? "Contrato Pequeno"
          : undefined;
  const selectedPortItems = view.public.port.filter((item) =>
    selectedPortIds.includes(item.id),
  );
  const selectedPortGoods = selectedPortItems.filter(
    (item) => item.type !== "crew",
  );
  const selectedPortTypes = new Set(selectedPortGoods.map((item) => item.type));
  const selectedInventoryGoods = view.me.goods.filter((item) =>
    selectedGoodIds.includes(item.id),
  );
  const tradeGiveGoods = selectedInventoryGoods.filter(
    (item) => !selectedPortTypes.has(item.type),
  );
  const tradeCrewCount = selectedPortGoods.length - tradeGiveGoods.length;
  const canTradePort =
    myTurn &&
    selectedPortGoods.length >= 1 &&
    selectedPortItems.length === selectedPortGoods.length &&
    tradeGiveGoods.length === selectedInventoryGoods.length &&
    tradeCrewCount >= 0 &&
    tradeCrewCount <= view.me.crew;
  const allSelectedCrew =
    selectedPortItems.length > 0 &&
    selectedPortItems.every((item) => item.type === "crew") &&
    selectedPortItems.length ===
      view.public.port.filter((item) => item.type === "crew").length;
  const canTakePort =
    selectedGoodIds.length === 0 &&
    ((selectedPortItems.length === 1 && selectedPortItems[0].type !== "crew") ||
      allSelectedCrew);
  const canSellInventory =
    myTurn &&
    selectedPortItems.length === 0 &&
    selectedGoodIds.length > 0 &&
    Boolean(selected) &&
    selectedGoodIds.length >= (selected ? GOOD_INFO[selected].minimum : 1);
  if (view.phase === "finished")
    return (
      <Shell>
        <Brand />
        <Text style={styles.title}>Fim da partida</Text>
        <Text style={styles.muted}>
          Sala {code} · resultado calculado pelo servidor.
        </Text>
        <Button label="VOLTAR AO MENU" onPress={onBack} />
      </Shell>
    );
  return (
    <Shell>
      <OpponentHeader
        displayName={view.opponent?.displayName}
        cardCount={view.opponent?.goodsCount}
        prestige={view.opponent?.prestige}
        crew={view.opponent?.crew}
      />
      <Text style={styles.section}>PORTO DE NASSAU</Text>
      <PortGrid
        items={view.public.port}
        selectedItemIds={selectedPortIds}
        onSelectItem={(item) => {
          if (item.type === "crew") {
            setSelected(undefined);
            setSelectedGoodIds([]);
            const crewIds = view.public.port
              .filter((entry) => entry.type === "crew")
              .map((entry) => entry.id);
            setSelectedPortIds((currentIds) =>
              crewIds.every((id) => currentIds.includes(id)) &&
              currentIds.length === crewIds.length
                ? []
                : crewIds,
            );
          } else {
            setSelectedPortIds((currentIds) => {
              const selectedGoods = currentIds.filter(
                (id) =>
                  view.public.port.find((entry) => entry.id === id)?.type !==
                  "crew",
              );
              return selectedGoods.includes(item.id)
                ? selectedGoods.filter((id) => id !== item.id)
                : [...selectedGoods, item.id];
            });
          }
        }}
      />
      <View style={styles.handHeader}>
        <View>
          <Text style={styles.section}>SEU INVENTÁRIO (PRIVADO)</Text>
          <Text style={styles.turnLabel}>
            SALA {code} ·{" "}
            {myTurn ? "SEU TURNO" : `TURNO DE ${view.opponent?.displayName}`}
          </Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.eyebrow}>PRESTÍGIO</Text>
          <Text style={styles.scoreText}>{view.me.prestige}</Text>
        </View>
      </View>
      <View style={styles.cargoBar}>
        <Text style={styles.cargo}>
          {view.me.goods.length}/7 cargas · 👥 {view.me.crew}
        </Text>
      </View>
      <GoodsInventoryGrid
        goods={view.me.goods}
        selectedItemIds={selectedGoodIds}
        onSelectItem={(item) => {
          setSellType(undefined);
          if (selectedPortItems.some((entry) => entry.type === "crew")) {
            setSelectedPortIds([]);
          }
          if (selectedGoodIds.includes(item.id)) {
            const nextIds = selectedGoodIds.filter((id) => id !== item.id);
            setSelectedGoodIds(nextIds);
          } else {
            setSelectedGoodIds([...selectedGoodIds, item.id]);
          }
          const nextTypeIds = selectedGoodIds.includes(item.id)
            ? selectedGoodIds.filter((id) => id !== item.id)
            : [...selectedGoodIds, item.id];
          const nextTypes = new Set(
            view.me.goods
              .filter((entry) => nextTypeIds.includes(entry.id))
              .map((entry) => entry.type),
          );
          setSelected(nextTypes.size === 1 ? [...nextTypes][0] : undefined);
        }}
      />
      <View style={styles.actionBar}>
        <GameActionButton
          action="take"
          label="PEGAR"
          onPress={() => {
            if (allSelectedCrew) {
              send({ type: "recruit-crew" });
            } else if (canTakePort) {
              send({ type: "take-good", itemId: selectedPortItems[0].id });
            }
          }}
          disabled={
            !myTurn ||
            !canTakePort ||
            (!allSelectedCrew && view.me.goods.length >= 7)
          }
        />
        <GameActionButton
          action="trade"
          label="TROCAR"
          onPress={() => {
            if (canTradePort)
              send({
                type: "trade",
                takeItemIds: selectedPortGoods.map((item) => item.id),
                giveGoodIds: tradeGiveGoods.map((item) => item.id),
                giveCrewCount: tradeCrewCount,
              });
          }}
          disabled={!canTradePort}
        />
        <GameActionButton
          action="sell"
          label="VENDER"
          onPress={() => {
            if (selected) setSellType(selected);
          }}
          disabled={!canSellInventory}
        />
      </View>
      <SellModal
        visible={Boolean(sellType)}
        goodType={sellType}
        quantity={count}
        rewards={values}
        contractName={contractName}
        contractPrestige={contractPrestige}
        total={values.reduce((sum, value) => sum + value, 0) + contractPrestige}
        onClose={() => setSellType(undefined)}
        onConfirm={() => {
          if (sellType)
            send({ type: "sell", goodType: sellType, quantity: count });
        }}
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: "100%" },
  content: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 64,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingRoot: { flex: 1, backgroundColor: "#062d3b" },
  loadingVideo: { ...StyleSheet.absoluteFillObject },
  loadingShade: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerSmall: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 520,
  },
  brandBlock: { alignItems: "center", marginVertical: 18 },
  emblem: { color: "#d6ad5b", fontSize: 44, marginBottom: 4 },
  brand: {
    color: "#e6c16a",
    fontSize: 42,
    letterSpacing: 8,
    fontWeight: "800",
  },
  motto: { color: "#9ec4c7", letterSpacing: 2, fontSize: 11, marginTop: 5 },
  profile: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "#123e4a",
    borderColor: "#316875",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginVertical: 18,
  },
  avatar: { color: "#d6ad5b", fontSize: 30 },
  eyebrow: { color: "#91b6b8", fontSize: 11, letterSpacing: 1.5 },
  name: { color: "#f5eddb", fontSize: 20, fontWeight: "700", marginTop: 3 },
  edit: { color: "#e6c16a", marginLeft: "auto" },
  menuCard: { gap: 12, maxWidth: 460, alignSelf: "center", width: "100%" },
  button: {
    backgroundColor: "#ba8745",
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderColor: "#b68c52",
    borderWidth: 1,
  },
  buttonText: {
    color: "#111d25",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  buttonSecondaryText: { color: "#e1c77e" },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.98 }] },
  quote: {
    color: "#71959d",
    textAlign: "center",
    marginTop: 42,
    fontStyle: "italic",
  },
  back: { color: "#b8d1cd", fontSize: 16, marginBottom: 18 },
  title: {
    color: "#f5eddb",
    fontSize: 28,
    fontWeight: "800",
    marginVertical: 12,
  },
  muted: { color: "#9bb8bb", fontSize: 14, lineHeight: 21 },
  choice: {
    borderWidth: 1,
    borderColor: "#285664",
    borderRadius: 12,
    padding: 18,
    marginVertical: 7,
  },
  choiceActive: { borderColor: "#e0bd69", backgroundColor: "#173f49" },
  choiceTitle: { color: "#f5eddb", fontWeight: "800", letterSpacing: 1 },
  label: { color: "#d3dacc", fontSize: 13, marginTop: 22, marginBottom: 8 },
  input: {
    backgroundColor: "#0e3542",
    color: "#f5eddb",
    borderColor: "#46747c",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  gameTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  score: { alignItems: "flex-end" },
  scoreText: { color: "#e6c16a", fontSize: 28, fontWeight: "800" },
  opponent: {
    backgroundColor: "#0c3540",
    borderLeftColor: "#bf4e46",
    borderLeftWidth: 3,
    padding: 12,
    marginVertical: 12,
    borderRadius: 8,
  },
  section: {
    color: "#d6ad5b",
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: 15,
    marginBottom: 8,
  },
  port: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    backgroundColor: "#f3ead3",
    borderRadius: 10,
    padding: 10,
    minWidth: 130,
    flexGrow: 1,
    flexBasis: 125,
  },
  crewTile: { backgroundColor: "#d8e0d1" },
  tileIcon: { color: "#8a542d", fontSize: 23 },
  tileText: { color: "#193945", fontWeight: "800", marginTop: 4 },
  tileSub: { color: "#5f7672", fontSize: 12, marginVertical: 3 },
  handHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  turnLabel: { color: "#91b6b8", fontSize: 11, marginTop: 2 },
  cargoBar: { alignItems: "flex-end", marginBottom: 7 },
  cargo: { color: "#b8d1cd", fontSize: 13 },
  actionBar: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 14,
  },
  goodsGrid: { gap: 7 },
  goodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#103743",
    borderRadius: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e5260",
  },
  goodSelected: { borderColor: "#e0bd69", backgroundColor: "#173f49" },
  goodIcon: { color: "#e1bd67", fontSize: 24, width: 31, textAlign: "center" },
  goodName: { color: "#f5eddb", fontWeight: "700" },
  count: { color: "#e1bd67" },
  values: { color: "#94b6b6", fontSize: 12, marginTop: 3 },
  minimum: { color: "#d58075", fontSize: 11, fontWeight: "700" },
  minimumReady: { color: "#9ed3a6" },
  preview: {
    backgroundColor: "#152f38",
    borderColor: "#c79a53",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  previewTitle: { color: "#f5eddb", fontSize: 17, fontWeight: "800" },
  total: {
    color: "#e6c16a",
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 8,
  },
  error: { color: "#f5a19a", marginVertical: 10 },
  stock: { color: "#648b92", fontSize: 12, marginTop: 18, textAlign: "center" },
  resultCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#103743",
    padding: 16,
    borderRadius: 10,
    marginVertical: 5,
  },
  finalScore: { color: "#e6c16a", fontSize: 30, fontWeight: "800" },
  toggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomColor: "#24505b",
    borderBottomWidth: 1,
  },
  toggleValue: { color: "#e1bd67", fontWeight: "800" },
  invite: {
    backgroundColor: "#113f4a",
    padding: 16,
    borderRadius: 10,
    marginVertical: 14,
  },
  inviteText: { color: "#f5eddb", fontSize: 15, marginVertical: 8 },
});
