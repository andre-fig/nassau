import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { GOOD_INFO, GoodType } from "@nassau/game-engine";
import { GameActionButton } from "./GameActionButton";

export function SellModal({
  visible,
  goodType,
  quantity,
  rewards,
  contractName,
  contractPrestige,
  total,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  goodType?: GoodType;
  quantity: number;
  rewards: number[];
  contractName?: string;
  contractPrestige: number;
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!goodType) return null;
  const label = GOOD_INFO[goodType].shortLabel.toUpperCase();
  const rewardTotal = rewards.reduce((sum, value) => sum + value, 0);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            VENDER {quantity} {label}
          </Text>
          <View style={styles.rule} />
          <Text style={styles.line}>
            Mercadorias: {rewards.join(" + ") || "—"}
          </Text>
          <Text style={styles.totalLine}>= {rewardTotal}</Text>
          <Text style={styles.line}>
            Contrato Comercial: {contractName ?? "Sem contrato"}
          </Text>
          {contractName ? (
            <Text style={styles.bonus}>+{contractPrestige}</Text>
          ) : null}
          <View style={styles.rule} />
          <Text style={styles.total}>TOTAL: +{total} Prestígio</Text>
          <GameActionButton action="sell" onPress={onConfirm} />
          <Text style={styles.cancel} onPress={onClose}>
            CANCELAR
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(2, 13, 19, 0.78)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#f3ead3",
    borderColor: "#d6ad5b",
    borderRadius: 14,
    borderWidth: 2,
    maxWidth: 410,
    padding: 22,
    width: "100%",
  },
  title: {
    color: "#193945",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  rule: { backgroundColor: "#c5a56c", height: 1, marginVertical: 12 },
  line: { color: "#304850", fontSize: 15, lineHeight: 23 },
  totalLine: {
    color: "#193945",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 2,
  },
  bonus: {
    alignSelf: "flex-end",
    color: "#2f7258",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  total: {
    color: "#193945",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  cancel: {
    color: "#6b7470",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 8,
    textAlign: "center",
  },
});
