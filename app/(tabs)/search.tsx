import React, { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { getAdminHierarchy } from "@/utils/overpass";
import { reverseGeocode } from "@/utils/nominatim";
import { saveRecord } from "@/utils/storage";
import { DataRow } from "@/components/DataRow";
import { StatusChip } from "@/components/StatusChip";
import { InAppBrowser } from "@/components/InAppBrowser";

const AP_CITIES = [
  { name: "Vijayawada", lat: 16.5062, lng: 80.648 },
  { name: "Guntur", lat: 16.3067, lng: 80.4365 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Tirupati", lat: 13.6288, lng: 79.4192 },
  { name: "Kurnool", lat: 15.8281, lng: 78.0373 },
  { name: "Eluru", lat: 16.7104, lng: 81.0952 },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState("");
  const [googleMapsVisible, setGoogleMapsVisible] = useState(false);

  const [result, setResult] = useState<{
    state: string;
    district: string;
    mandal: string;
    village: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 75 + 12 : insets.bottom + 75 + 12;

  const handleSearch = async () => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Invalid coordinates", "Enter valid decimal degree values.");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Out of range", "Lat: -90 to 90, Lng: -180 to 180.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");
    setSaved(false);
    setLoadStep("Reverse geocoding…");

    try {
      const [geo, admin] = await Promise.all([
        reverseGeocode(lat, lng).catch(() => null),
        (async () => {
          setLoadStep("Looking up admin boundaries…");
          return getAdminHierarchy(lat, lng);
        })(),
      ]);

      setResult({
        state: admin.state || "Andhra Pradesh",
        district: admin.district,
        mandal: admin.mandal,
        village: admin.village || geo?.village || "",
        lat,
        lng,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Search failed";
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setLoadStep("");
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const id =
      Date.now().toString() +
      Math.random().toString(36).substring(2, 9);
    await saveRecord({
      id,
      lat: result.lat,
      lng: result.lng,
      timestamp: Date.now(),
      displayName: `${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`,
      state: result.state,
      district: result.district,
      mandal: result.mandal,
      village: result.village,
      surveyNo: "",
      areaAcres: "",
      landUse: "",
      layerName: "",
      pinSource: "search",
    });
    setSaved(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const [portalVisible, setPortalVisible] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");

  const handleOpenPortal = async () => {
    if (!result) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isTG = result.state?.toLowerCase() === "telangana";
    const url = isTG ? "https://dharani.telangana.gov.in" : "https://meebhoomi.ap.gov.in";
    if (Platform.OS === "web") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setPortalUrl(url);
      setPortalVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Search by Coordinates
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Enter decimal degree coordinates for any location in Andhra Pradesh to get state, district, and mandal via OpenStreetMap boundary data.
        </Text>

        {/* Pinpoint Selection Cards */}
        <View style={styles.squaresContainer}>
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (Platform.OS === "web") {
                window.open("https://www.google.com/maps", "_blank", "noopener,noreferrer");
              } else {
                setGoogleMapsVisible(true);
              }
            }}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.squareIconBox, { backgroundColor: colors.accent + "15" }]}>
              <Ionicons name="map" size={24} color={colors.accent} />
            </View>
            <Text style={[styles.squareTitle, { color: colors.foreground }]}>Google Maps</Text>
            <Text style={[styles.squareDesc, { color: colors.mutedForeground }]}>
              Pinpoint on Google Maps to gather coordinates
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/(tabs)"); // Redirects to Map tab!
            }}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.squareIconBox, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="locate" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.squareTitle, { color: colors.foreground }]}>Survey No Map</Text>
            <Text style={[styles.squareDesc, { color: colors.mutedForeground }]}>
              Pinpoint directly on our app survey map
            </Text>
          </Pressable>
        </View>

        {/* Inputs */}
        <View style={styles.inputGroup}>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="locate-outline" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Latitude (e.g. 16.5062)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={latStr}
              onChangeText={setLatStr}
              returnKeyType="next"
            />
          </View>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="navigate-outline" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Longitude (e.g. 80.6480)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={lngStr}
              onChangeText={setLngStr}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
        </View>

        {/* Quick locations */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Quick locations
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
          {AP_CITIES.map((loc) => (
            <Pressable
              key={loc.name}
              onPress={() => {
                setLatStr(loc.lat.toString());
                setLngStr(loc.lng.toString());
              }}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: pressed ? colors.primary + "20" : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: colors.primary }]}>{loc.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Search button */}
        <Pressable
          onPress={handleSearch}
          disabled={loading}
          style={({ pressed }) => [
            styles.searchBtn,
            { backgroundColor: loading || pressed ? colors.primary + "CC" : colors.primary },
          ]}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.searchBtnText}>{loadStep || "Loading…"}</Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.searchBtnText}>Look Up Location</Text>
            </>
          )}
        </Pressable>

        {/* Error */}
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "40" }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <StatusChip label="Location identified" variant="success" />
              {!saved ? (
                <Pressable onPress={handleSave} style={[styles.saveChip, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="bookmark-outline" size={13} color={colors.primary} />
                  <Text style={[styles.saveChipText, { color: colors.primary }]}>Save</Text>
                </Pressable>
              ) : (
                <StatusChip label="Saved ✓" variant="success" />
              )}
            </View>

            <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />

            <DataRow label="State" value={result.state} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow label="District" value={result.district} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow label="Mandal" value={result.mandal} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow label="Village" value={result.village} />

            {/* Portal CTA */}
            <View style={[styles.meebhoomiBox, { backgroundColor: colors.accent + "10", borderColor: colors.accent + "25" }]}>
              <View style={styles.meebhoomiTop}>
                <Ionicons name="information-circle-outline" size={14} color={colors.accent} style={{ marginTop: 1 }} />
                <Text style={[styles.meebhoomiNote, { color: colors.mutedForeground }]}>
                  Survey no. &amp; owner details require {result.state?.toLowerCase() === "telangana" ? "Dharani" : "MeeBhoomi"} portal {result.state?.toLowerCase() === "telangana" ? "" : "(OTP login required)"}
                </Text>
              </View>
              <Pressable
                onPress={handleOpenPortal}
                style={({ pressed }) => [
                  styles.meebhoomiBtn,
                  { backgroundColor: pressed ? colors.accent + "CC" : colors.accent },
                ]}
              >
                <Ionicons name="open-outline" size={14} color="#fff" />
                <Text style={styles.meebhoomiText}>
                  Open {result.state?.toLowerCase() === "telangana" ? "Dharani" : "MeeBhoomi"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Google Maps Pinpoint Browser */}
      <InAppBrowser
        visible={googleMapsVisible}
        url="https://www.google.com/maps"
        onClose={() => setGoogleMapsVisible(false)}
      />

      {/* Portal Web Browser */}
      <InAppBrowser
        visible={portalVisible}
        url={portalUrl}
        onClose={() => setPortalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 0 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 20 },
  inputGroup: { gap: 10, marginBottom: 20 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pillRow: { marginBottom: 20 },
  pill: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  pillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  resultCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  saveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  saveChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  resultDivider: { height: 1, marginVertical: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  meebhoomiBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 14,
    gap: 8,
  },
  meebhoomiTop: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  meebhoomiNote: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  meebhoomiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
  },
  meebhoomiText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  squaresContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    width: "100%",
  },
  squareCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  squareIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  squareTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  squareDesc: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
});
