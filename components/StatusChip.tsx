import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type ChipVariant = "success" | "warning" | "error" | "info" | "muted";

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
}

export function StatusChip({ label, variant = "info" }: StatusChipProps) {
  const colors = useColors();

  const bgMap: Record<ChipVariant, string> = {
    success: colors.success + "18",
    warning: colors.warning + "18",
    error: colors.destructive + "18",
    info: colors.primary + "18",
    muted: colors.muted,
  };
  const fgMap: Record<ChipVariant, string> = {
    success: colors.success,
    warning: colors.warning,
    error: colors.destructive,
    info: colors.primary,
    muted: colors.mutedForeground,
  };

  return (
    <View
      style={[styles.chip, { backgroundColor: bgMap[variant] }]}
    >
      <Text style={[styles.text, { color: fgMap[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
