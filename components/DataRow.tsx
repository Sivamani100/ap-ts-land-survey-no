import React from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface DataRowProps {
  label: string;
  value: string;
  dimEmpty?: boolean;
  editable?: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}

export function DataRow({
  label,
  value,
  dimEmpty = true,
  editable = false,
  onChangeText,
  placeholder,
}: DataRowProps) {
  const colors = useColors();
  const isEmpty = !value;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "Tap to enter"}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.value,
            {
              paddingVertical: 0,
              color: value ? colors.foreground : colors.mutedForeground,
            },
          ]}
          textAlign="right"
        />
      ) : (
        <Text
          style={[
            styles.value,
            {
              color:
                isEmpty && dimEmpty ? colors.mutedForeground : colors.foreground,
              fontStyle: isEmpty ? "italic" : "normal",
            },
          ]}
          numberOfLines={2}
        >
          {isEmpty ? "—" : value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 2,
    textAlign: "right",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
});

