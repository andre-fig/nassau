import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { GOOD_INFO, GoodItem, GOODS } from "@nassau/game-engine";
import { ITEM_SQUARE } from "./SquareDimensions";

export function GoodsInventoryGrid({
  goods,
  selectedItemIds,
  onSelectItem,
}: {
  goods: GoodItem[];
  selectedItemIds: string[];
  onSelectItem: (item: GoodItem) => void;
}) {
  const orderedGoods = GOODS.flatMap((type) =>
    goods.filter((item) => item.type === type),
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.grid}
    >
      {orderedGoods.map((item) => {
        const info = GOOD_INFO[item.type];
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelectItem(item)}
            style={[
              styles.tile,
              selectedItemIds.includes(item.id) && styles.selected,
            ]}
          >
            <Text style={styles.icon}>{info.icon}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {info.shortLabel}
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
  selected: { borderColor: "#e0bd69", backgroundColor: "#173f49" },
  icon: { color: "#e1bd67", fontSize: 32, lineHeight: 38 },
  name: {
    color: "#f5eddb",
    fontSize: 12,
    fontWeight: "800",
    minHeight: 29,
    textAlign: "center",
  },
});
