import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { GOOD_INFO, GoodItem, GoodType, GOODS } from "@nassau/game-engine";
import { ITEM_SQUARE } from "./SquareDimensions";

export function GoodsInventoryGrid({
  goods,
  selected,
  onSelect,
}: {
  goods: GoodItem[];
  selected?: GoodType;
  onSelect: (type: GoodType) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.grid}
    >
      {GOODS.map((type) => {
        const info = GOOD_INFO[type];
        const count = goods.filter((item) => item.type === type).length;
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
});
