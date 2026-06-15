import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useLand } from "@/context/LandContext";
import { clearHistory, deleteRecord, getHistory, updateRecord } from "@/utils/storage";
import type { LandRecord } from "@/utils/storage";
import { HistoryCard } from "@/components/HistoryCard";
import { DataRow } from "@/components/DataRow";
import { formatCoordinate } from "@/utils/coordinates";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { coordsFormat } = useLand();
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [selected, setSelected] = useState<LandRecord | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSurveyNo, setEditSurveyNo] = useState("");
  const [editArea, setEditArea] = useState("");

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setRecords);
    }, [])
  );

  const startEditing = async () => {
    if (!selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditTitle(selected.customTitle || "");
    setEditNotes(selected.customNotes || "");
    setEditSurveyNo(selected.surveyNo || "");
    setEditArea(selected.areaAcres || "");
    setEditing(true);
  };

  const handleSaveChanges = async () => {
    if (!selected) return;
    const updatedRecord: LandRecord = {
      ...selected,
      customTitle: editTitle.trim() || undefined,
      customNotes: editNotes.trim() || undefined,
      surveyNo: editSurveyNo.trim(),
      areaAcres: editArea.trim(),
    };

    await updateRecord(updatedRecord);
    setSelected(updatedRecord);
    setRecords((prev) => prev.map((r) => (r.id === selected.id ? updatedRecord : r)));
    setEditing(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClear = () => {
    Alert.alert(
      "Clear history",
      "Remove all saved land records?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            setRecords([]);
            setSelected(null);
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web"
    ? 20
    : insets.top > 0
    ? insets.top
    : Platform.OS === "ios"
    ? 44
    : 36;
  const bottomPad = Platform.OS === "web" ? 34 + 75 : insets.bottom + 75;

  if (selected) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.detailHeader,
            {
              paddingTop: topPad + 12,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setSelected(null)}
            hitSlop={10}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back-outline" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>
            Land Details
          </Text>
          <View style={styles.detailHeaderRight}>
            <Pressable
              onPress={startEditing}
              hitSlop={10}
              style={[styles.detailBtn, { marginRight: 16 }]}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(selected.id)}
              hitSlop={10}
              style={styles.detailBtn}
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </Pressable>
          </View>
        </View>
        <FlatList
          data={[selected]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: bottomPad,
          }}
          renderItem={() => (
            <View
              style={[
                styles.detailCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Custom Title & Notes */}
              {(!!selected.customTitle || !!selected.customNotes) && (
                <View style={styles.customTextSection}>
                  {!!selected.customTitle && (
                    <Text style={[styles.customDetailTitle, { color: colors.foreground }]}>
                      {selected.customTitle}
                    </Text>
                  )}
                  {!!selected.customNotes && (
                    <Text style={[styles.customDetailNotes, { color: colors.mutedForeground }]}>
                      {selected.customNotes}
                    </Text>
                  )}
                  <View style={[styles.detailDivider, { backgroundColor: colors.border, marginVertical: 12 }]} />
                </View>
              )}
              {/* Coords */}
              <View
                style={[
                  styles.coordRow,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.coordText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {formatCoordinate(selected.lat, selected.lng, coordsFormat)}
                </Text>
              </View>
              <Text
                style={[styles.savedAt, { color: colors.mutedForeground }]}
              >
                Saved{" "}
                {new Date(selected.timestamp).toLocaleString("en-IN")}
              </Text>
              <View
                style={[
                  styles.detailDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="State" value={selected.state} />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="District" value={selected.district} />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="Mandal" value={selected.mandal} />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="Village" value={selected.village} />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="Survey No." value={selected.surveyNo} />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="Area (Acres)" value={selected.areaAcres} />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />
              <DataRow label="Land Use" value={selected.landUse} />
              {!!selected.layerName && (
                <>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <DataRow label="APSAC Layer" value={selected.layerName} />
                </>
              )}
            </View>
          )}
        />

        {/* Edit Record Modal */}
        <Modal
          visible={editing}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditing(false)}
        >
          <KeyboardAvoidingView
            style={[styles.modalContainer, { backgroundColor: colors.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  paddingTop: Platform.OS === "ios" ? 12 : insets.top + 6,
                  backgroundColor: colors.card,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Pressable onPress={() => setEditing(false)} hitSlop={12} style={styles.modalHeaderBtn}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Details</Text>
              <Pressable onPress={handleSaveChanges} hitSlop={12} style={styles.modalHeaderBtn}>
                <Text style={[styles.modalSaveText, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              <Text style={[styles.modalSectionLabel, { color: colors.mutedForeground }]}>Label &amp; Notes</Text>
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.modalInput, { color: colors.foreground }]}
                  placeholder="Custom Label (e.g. My Plot)"
                  placeholderTextColor={colors.mutedForeground}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />
                <TextInput
                  style={[styles.modalInput, styles.modalInputMultiline, { color: colors.foreground }]}
                  placeholder="Custom Notes or Description"
                  placeholderTextColor={colors.mutedForeground}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <Text style={[styles.modalSectionLabel, { color: colors.mutedForeground }]}>Survey Details</Text>
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.modalInput, { color: colors.foreground }]}
                  placeholder="Survey Number (e.g. 124/A)"
                  placeholderTextColor={colors.mutedForeground}
                  value={editSurveyNo}
                  onChangeText={setEditSurveyNo}
                />
                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />
                <TextInput
                  style={[styles.modalInput, { color: colors.foreground }]}
                  placeholder="Area (Acres) (e.g. 2.45)"
                  placeholderTextColor={colors.mutedForeground}
                  value={editArea}
                  onChangeText={setEditArea}
                  keyboardType="decimal-pad"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPad + 12, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.foreground }]}>
              History
            </Text>
            {records.length > 0 && (
              <Pressable onPress={handleClear}>
                <Text
                  style={[
                    styles.clearText,
                    { color: colors.destructive },
                  ]}
                >
                  Clear all
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.muted },
              ]}
            >
              <Ionicons name="time-outline" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No saved records
            </Text>
            <Text
              style={[styles.emptySub, { color: colors.mutedForeground }]}
            >
              Pin a location on the map or search by coordinates to save land
              records here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryCard
            record={item}
            onPress={() => setSelected(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  clearText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 12 },
  detailTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  detailHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailBtn: {
    padding: 6,
  },
  detailCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  customTextSection: {
    marginBottom: 4,
  },
  customDetailTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  customDetailNotes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 18,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  coordText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  savedAt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  detailDivider: {
    height: 1,
    marginBottom: 4,
  },
  divider: { height: StyleSheet.hairlineWidth },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  modalSaveText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
    gap: 16,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: -8,
  },
  inputGroup: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 4,
  },
  modalInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 10,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
  modalInputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
