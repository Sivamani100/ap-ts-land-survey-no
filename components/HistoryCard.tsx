import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { LandRecord } from "@/utils/storage";

interface HistoryCardProps {
  record: LandRecord;
  onDelete: () => void;
  onPress: () => void;
}

export function HistoryCard({ record, onDelete, onPress }: HistoryCardProps) {
  const colors = useColors();
  const date = new Date(record.timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = new Date(record.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.muted : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <Ionicons name="location-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.textBlock}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {record.customTitle || record.village || record.mandal || record.district || "Location"}
          </Text>
          <Text
            style={[styles.sub, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {[record.mandal, record.district].filter(Boolean).join(", ")}
          </Text>
          {!!record.customNotes && (
            <Text
              style={[styles.notes, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              "{record.customNotes}"
            </Text>
          )}
          {!!record.surveyNo && (
            <Text style={[styles.survey, { color: colors.accent }]}>
              Survey: {record.surveyNo}
            </Text>
          )}
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {date} · {time}
          </Text>
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  notes: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 15,
  },
  survey: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
