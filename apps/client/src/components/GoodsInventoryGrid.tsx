import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GOOD_INFO, GoodItem, GoodType, GOODS } from "@nassau/game-engine";
import { ITEM_SQUARE } from "./SquareDimensions";

export function GoodsInventoryGrid({
  goods,
  values,
  selected,
  onSelect,
}: {
  goods: GoodItem[];
  values: Record<GoodType, number[]>;
  selected?: GoodType;
  onSelect: (type: GoodType) => void;
}) {
  return (
    <View style={styles.grid}>
      {GOODS.map((type) => {
        const info = GOOD_INFO[type];
        const count = goods.filter((item) => item.type === type).length;
        const canSell = count >= info.minimum;
        return (
          <Pressable
            key={type}
            onPress={() => onSelect(type)}
            style={[styles.tile, selected === type && styles.selected]}
          >
            <Text style={styles.icon}>{info.icon}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {info.shortLabel}
            </Text>
            <Text style={styles.count}>×{count}</Text>
            <Text style={styles.values} numberOfLines={1}>
              {values[type].join(" · ") || "esgotado"}
            </Text>
            <Text style={[styles.minimum, canSell && styles.ready]}>
              {canSell ? "VENDER" : `Mín. ${info.minimum}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  tile: {
    width: ITEM_SQUARE,
    height: ITEM_SQUARE,
    alignItems: "center",
    backgroundColor: "#103743",
    borderColor: "#1e5260",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "flex-start",
    overflow: "hidden",
    padding: 9,
  },
  selected: { borderColor: "#e0bd69", backgroundColor: "#173f49" },
  icon: { color: "#e1bd67", fontSize: 32, lineHeight: 38 },
  name: {
    color: "#f5eddb",
    fontSize: 12,
    fontWeight: "800",
    minHeight: 29,
    textAlign: "center",
  },
  count: { color: "#e1bd67", fontSize: 13, fontWeight: "800" },
  values: { color: "#94b6b6", fontSize: 10, marginTop: 1 },
  minimum: { color: "#d58075", fontSize: 10, fontWeight: "700", marginTop: 2 },
  ready: { color: "#9ed3a6" },
});
