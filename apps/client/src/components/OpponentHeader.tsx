import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { ITEM_SQUARE } from "./SquareDimensions";

const CARD_BACK = require("../../assets/cards/card-back.jpeg");

export function OpponentHeader({
  displayName,
  cardCount,
  prestige,
  crew,
}: {
  displayName?: string;
  cardCount?: number;
  prestige?: number;
  crew?: number;
}) {
  const hiddenCardCount = Math.max(0, Math.floor(cardCount ?? 0));
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <Text style={styles.avatar}>🧑‍🌾</Text>
        <Text style={styles.name} numberOfLines={2}>
          {displayName ?? "Adversário"}
        </Text>
      </View>
      <ScrollView
        style={styles.cards}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContent}
        accessibilityLabel={`${hiddenCardCount} cartas ocultas do adversário`}
      >
        {Array.from({ length: hiddenCardCount }, (_, index) => (
          <Image key={index} source={CARD_BACK} style={styles.card} />
        ))}
      </ScrollView>
      <View style={styles.stats}>
        <Text style={styles.score}>{prestige ?? 0}</Text>
        <Text style={styles.label}>PRESTÍGIO</Text>
        <View style={styles.divider} />
        <Text style={styles.crew}>👥 Tripulação ×{crew ?? 0}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b2f3b",
    borderColor: "#285965",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginVertical: 12,
  },
  identity: { width: 74, alignItems: "center" },
  avatar: { fontSize: 35 },
  name: {
    color: "#f5eddb",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 5,
  },
  cards: { flex: 1, minWidth: 1 },
  cardsContent: { flexDirection: "row", gap: 8, alignItems: "center" },
  card: {
    width: ITEM_SQUARE,
    height: ITEM_SQUARE,
    borderRadius: 16,
    borderColor: "#d6ad5b",
    borderWidth: 1,
    overflow: "hidden",
    resizeMode: "cover",
    transform: [{ rotate: "180deg" }],
  },
  stats: {
    width: 94,
    alignItems: "center",
    borderLeftColor: "#285965",
    borderLeftWidth: 1,
    paddingLeft: 10,
  },
  score: { color: "#e6c16a", fontSize: 24, fontWeight: "900" },
  crew: { color: "#f5eddb", fontSize: 17, fontWeight: "800" },
  label: {
    color: "#9bb8bb",
    fontSize: 9,
    letterSpacing: 0.7,
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    width: "70%",
    height: 1,
    backgroundColor: "#285965",
    marginVertical: 8,
  },
});
