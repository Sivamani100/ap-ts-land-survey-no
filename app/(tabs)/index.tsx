import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLand } from "@/context/LandContext";
import { LandInfoPanel } from "@/components/LandInfoPanel";
import { LandMap } from "@/components/LandMap";
import type { LandMapWebRef } from "@/components/LandMap";
import { Ionicons } from "@expo/vector-icons";
import { searchVillages } from "@/utils/nominatim";
import type { GeocodeResult } from "@/utils/nominatim";
import * as Haptics from "expo-haptics";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    dropPin,
    clearPin,
    mapType,
    setMapType,
    showCadastral,
    setShowCadastral,
    isVillageView,
    setIsVillageView,
  } = useLand();

  const mapRef = useRef<LandMapWebRef | null>(null);
  const nativeMapRef = useRef<any>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const topPad = Platform.OS === "web"
    ? 20
    : insets.top > 0
    ? insets.top
    : Platform.OS === "ios"
    ? 44
    : 36;

  const handleSearchChange = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchVillages(text);
      setResults(res);
    } catch (err) {
      console.error("Village search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVillage = async (village: GeocodeResult) => {
    setSelectedVillageName(village.name);
    setQuery("");
    setResults([]);
    setIsVillageView(true);
    setMapType("lines"); // Default to Survey Lines Only
    setShowCadastral(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dropPin(village.lat, village.lng);
  };

  const handleExitVillageView = async () => {
    setIsVillageView(false);
    setSelectedVillageName("");
    clearPin();
    setMapType("standard");
    setQuery("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LandMap mapRef={Platform.OS === "web" ? mapRef : nativeMapRef} />

      {/* Top Search Bar */}
      <View
        style={[
          styles.topBar,
          {
            top: topPad + 12,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {isVillageView ? (
          <View style={styles.villageHeaderRow}>
            <Ionicons name="map" size={16} color={colors.primary} />
            <Text style={[styles.villageTitle, { color: colors.foreground }]} numberOfLines={1}>
              {selectedVillageName || "Survey Lines Active"}
            </Text>
            <Pressable onPress={handleExitVillageView} style={styles.exitBtn} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.destructive} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search village name..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={handleSearchChange}
              autoCorrect={false}
            />
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
            {query.length > 0 && !loading && (
              <Pressable onPress={() => { setQuery(""); setResults([]); }} hitSlop={8}>
                <Ionicons name="close" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}

        {/* Suggestion list */}
        {results.length > 0 && (
          <View style={[styles.suggestionContainer, { borderColor: colors.border }]}>
            <ScrollView style={styles.suggestionScroll} keyboardShouldPersistTaps="handled">
              {results.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSelectVillage(item)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    {
                      borderBottomWidth: idx === results.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.muted : "transparent",
                    },
                  ]}
                >
                  <Ionicons name="location-outline" size={12} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Village View Map Options Bar */}
      {isVillageView && (
        <View
          style={[
            styles.villageOptionsBar,
            {
              top: topPad + 72,
              backgroundColor: colors.card + "F2",
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.villageOptionsRow}>
            {[
              { id: "lines", label: "Lines Only", image: require("@/assets/images/map_type_lines.png") },
              { id: "satellite", label: "Satellite", image: require("@/assets/images/map_type_satellite.png") },
              { id: "standard", label: "Standard", image: require("@/assets/images/map_type_standard.png") },
              { id: "terrain", label: "Terrain", image: require("@/assets/images/map_type_terrain.png") },
              { id: "dark", label: "Dark Mode", image: require("@/assets/images/map_type_dark.png") },
            ].map((opt) => {
              const isActive = mapType === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={async () => {
                    setMapType(opt.id as any);
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.optCol}
                >
                  <View
                    style={[
                      styles.optSquare,
                      {
                        borderColor: isActive ? colors.primary : colors.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={opt.image}
                      style={styles.optImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.optLabel,
                      {
                        color: isActive ? colors.primary : colors.foreground,
                        fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <LandInfoPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  villageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: 32,
  },
  villageTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 8,
  },
  exitBtn: {
    padding: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 32,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 4,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
  suggestionContainer: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 200,
  },
  suggestionScroll: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  villageOptionsBar: {
    position: "absolute",
    left: 14,
    width: 66,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  villageOptionsRow: {
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
  },
  optCol: {
    alignItems: "center",
    width: 54,
  },
  optSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 6,
    overflow: "hidden",
  },
  optImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  optLabel: {
    fontSize: 9,
    textAlign: "center",
  },
});
