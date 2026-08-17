import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export type GameAction = 'take' | 'trade' | 'sell';

const LABELS: Record<GameAction, string> = {
  take: 'PEGAR',
  trade: 'TROCAR',
  sell: 'VENDER',
};

export function GameActionButton({ action, onPress, disabled = false, label }: { action: GameAction; onPress: () => void; disabled?: boolean; label?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? LABELS[action]} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, styles[action], disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.text}>{label ?? LABELS[action]}</Text></Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 38, paddingHorizontal: 13, borderRadius: 7, borderColor: '#d6ad5b', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 3 },
  take: { backgroundColor: '#2f7258' },
  trade: { backgroundColor: '#245a86' },
  sell: { backgroundColor: '#9b3f45' },
  text: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.97 }] },
});
