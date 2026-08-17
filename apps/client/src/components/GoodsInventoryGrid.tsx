import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { GOOD_INFO, GoodItem, GoodType, GOODS } from "@nassau/game-engine";
import { ITEM_SQUARE } from "./SquareDimensions";

export function GoodsInventoryGrid({
  goods,
  crew,
  selected,
  onSelect,
}: {
  goods: GoodItem[];
  crew: number;
  selected?: GoodType;
  onSelect: (type: GoodType) => void;
}) {
  const orderedGoods = GOODS.flatMap((type) =>
    goods.filter((item) => item.type === type),
  );
  const cards = [
    ...orderedGoods,
    ...Array.from({ length: Math.max(0, crew) }, (_, index) => ({
      id: `crew-${index}`,
      type: "crew" as const,
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.grid}
    >
      {cards.map((item) => {
        const isCrew = item.type === "crew";
        const info = isCrew ? undefined : GOOD_INFO[item.type];
        return (
          <Pressable
            key={item.id}
            disabled={isCrew}
            onPress={() => {
              if (!isCrew) onSelect(item.type);
            }}
            style={[
              styles.tile,
              isCrew && styles.crewTile,
              !isCrew && selected === item.type && styles.selected,
            ]}
          >
            <Text style={[styles.icon, isCrew && styles.crewIcon]}>
              {isCrew ? "👥" : info?.icon}
            </Text>
            <Text style={styles.name} numberOfLines={2}>
              {isCrew ? "Tripulação" : info?.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
  },
  tile: {
    width: ITEM_SQUARE,
    height: ITEM_SQUARE,
    alignItems: "center",
    backgroundColor: "#103743",
    borderColor: "#1e5260",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 9,
  },
  crewTile: { backgroundColor: "#d8e0d1" },
  selected: { borderColor: "#e0bd69", backgroundColor: "#173f49" },
  icon: { color: "#e1bd67", fontSize: 32, lineHeight: 38 },
  crewIcon: { color: "#315b4d" },
  name: {
    color: "#f5eddb",
    fontSize: 12,
    fontWeight: "800",
    minHeight: 29,
    textAlign: "center",
  },
});
