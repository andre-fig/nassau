import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GOOD_INFO, GoodItem, GoodType, Item } from "@nassau/game-engine";
import { GameActionButton } from "./GameActionButton";
import { ITEM_SQUARE } from "./SquareDimensions";

type PortValues = Record<GoodType, number[]>;

export function PortGrid({
  items,
  values,
  canAct,
  canTakeGoods = true,
  onTake,
  onRecruit,
}: {
  items: Item[];
  values: PortValues;
  canAct: boolean;
  canTakeGoods?: boolean;
  onTake?: (item: GoodItem) => void;
  onRecruit?: () => void;
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
              <View
                key={item.id}
                style={[styles.tile, isCrew && styles.crewTile]}
              >
                <Text style={styles.tileIcon}>
                  {isCrew ? "👥" : info?.icon}
                </Text>
                <Text style={styles.tileText} numberOfLines={2}>
                  {isCrew ? "Tripulação" : info?.shortLabel}
                </Text>
                <Text style={styles.tileSub} numberOfLines={1}>
                  {isCrew ? "recrutar" : `${values[item.type][0] ?? "—"} ouro`}
                </Text>
                {canAct && isCrew && onRecruit ? (
                  <GameActionButton
                    action="take"
                    label="RECRUTAR"
                    onPress={onRecruit}
                  />
                ) : canAct && canTakeGoods && !isCrew && onTake ? (
                  <GameActionButton
                    action="take"
                    onPress={() => onTake(item)}
                  />
                ) : (
                  <View style={styles.actionSpacer} />
                )}
              </View>
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
    justifyContent: "flex-start",
    backgroundColor: "#f3ead3",
    borderRadius: 16,
    padding: 9,
    overflow: "hidden",
  },
  crewTile: { backgroundColor: "#d8e0d1" },
  tileIcon: { color: "#8a542d", fontSize: 32, lineHeight: 38 },
  tileText: {
    color: "#193945",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 29,
  },
  tileSub: { color: "#5f7672", fontSize: 11, marginTop: 1 },
  actionSpacer: { height: 44 },
});
