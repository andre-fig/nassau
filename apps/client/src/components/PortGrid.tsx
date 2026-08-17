import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GOOD_INFO, Item } from "@nassau/game-engine";
import { ITEM_SQUARE } from "./SquareDimensions";

export function PortGrid({
  items,
  selectedItemIds,
  onSelectItem,
}: {
  items: Item[];
  selectedItemIds: string[];
  onSelectItem: (item: Item) => void;
}) {
  const rows = [items.slice(0, 2), items.slice(2, 5)];

  return (
    <View style={styles.port}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item) => {
            const isCrew = item.type === "crew";
            const info = isCrew ? undefined : GOOD_INFO[item.type];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Selecionar ${
                  isCrew ? "tripulação" : info?.shortLabel
                }`}
                onPress={() => onSelectItem(item)}
                style={[
                  styles.tile,
                  isCrew && styles.crewTile,
                  selectedItemIds.includes(item.id) && styles.selectedTile,
                ]}
              >
                <Text style={styles.tileIcon}>
                  {isCrew ? "👥" : info?.icon}
                </Text>
                <Text style={styles.tileText} numberOfLines={2}>
                  {isCrew ? "Tripulação" : info?.shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  port: { gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  tile: {
    width: ITEM_SQUARE,
    height: ITEM_SQUARE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3ead3",
    borderRadius: 16,
    padding: 9,
    overflow: "hidden",
  },
  crewTile: { backgroundColor: "#d8e0d1" },
  selectedTile: { borderColor: "#e0bd69", borderWidth: 3 },
  tileIcon: { color: "#8a542d", fontSize: 32, lineHeight: 38 },
  tileText: {
    color: "#193945",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 29,
  },
});
