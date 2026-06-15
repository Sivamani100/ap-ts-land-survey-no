import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import { useLand } from "@/context/LandContext";
import { DataRow } from "./DataRow";
import { SkeletonRow } from "./SkeletonRow";
import { StatusChip } from "./StatusChip";
import { formatCoordinate } from "@/utils/coordinates";
import { InAppBrowser } from "./InAppBrowser";
import { saveRecord } from "@/utils/storage";
import type { LandRecord } from "@/utils/storage";

export function LandInfoPanel() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    status,
    statusMsg,
    record,
    errorMsg,
    clearPin,
    saveCurrentRecord,
    droppedPin,
    setRecord,
    coordsFormat,
  } = useLand();

  const [saved, setSaved] = useState(false);
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("");

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Fetch weather and elevation when lookup is done
  useEffect(() => {
    if (status === "done" && droppedPin) {
      setWeatherLoading(true);
      setWeatherData(null);
      setCustomTitle("");
      setCustomNotes("");
      import("@/utils/weather").then(({ fetchAgriWeather }) => {
        fetchAgriWeather(droppedPin.lat, droppedPin.lng)
          .then((data) => {
            setWeatherData(data);
            setWeatherLoading(false);
          })
          .catch(() => {
            setWeatherLoading(false);
          });
      });
    }
  }, [status, droppedPin]);

  // Reset saved state when a new lookup starts
  useEffect(() => {
    if (status !== "done") {
      setSaved(false);
    }
  }, [status, droppedPin]);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const isVisible = status !== "idle";

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 400,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [isVisible, slideAnim]);

  const isLoading =
    status === "geocoding" || status === "admin" || status === "survey";
  const isDone = status === "done";
  const isError = status === "error";
  const hasSurveyNo = isDone && !!record?.surveyNo;

  const handleSave = async () => {
    if (!record) return;
    const updated = {
      ...record,
      customTitle: customTitle.trim() || undefined,
      customNotes: customNotes.trim() || undefined,
    };
    setRecord(updated);
    await saveRecord(updated as LandRecord);
    setSaved(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    clearPin();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMeeBhoomi = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isTG = record?.state?.toLowerCase() === "telangana";
    const url = isTG
      ? "https://dharani.telangana.gov.in"
      : "https://meebhoomi.ap.gov.in";
    if (Platform.OS === "web") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: "#0D5F4E",
          controlsColor: "#ffffff",
        });
      } catch (err) {
        console.error("Failed to open WebBrowser:", err);
        setBrowserUrl(url);
        setBrowserVisible(true);
      }
    }
  };

  const handleCopySurveyNo = async () => {
    if (record?.surveyNo) {
      const shareMsg = `Land Record Found!\n` +
        `Survey No: ${record.surveyNo}\n` +
        `Location: ${record.village || ""}, ${record.mandal || ""} Mandal, ${record.district || ""} District, ${record.state || ""}\n\n` +
        `View this and search other survey parcels using the AP & TS Land Records App. Download here:\n` +
        `https://aptslandrecords.page.link/download`;
      await Share.share({
        message: shareMsg,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const bottomPad =
    Platform.OS === "web" ? 75 + 16 : insets.bottom + 75 + 16;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          backgroundColor: colors.panelBackground,
          transform: [{ translateY: slideAnim }],
          bottom: bottomPad,
        },
      ]}
    >
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isLoading && (
            <StatusChip
              label={statusMsg || "Looking up…"}
              variant="info"
            />
          )}
          {isDone && (
            <StatusChip label="Location identified" variant="success" />
          )}
          {isError && <StatusChip label="Lookup failed" variant="error" />}
        </View>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Coordinates badge */}
        {droppedPin && (
          <View
            style={[styles.coordsBadge, { backgroundColor: colors.muted }]}
          >
            <Ionicons
              name="location-outline"
              size={12}
              color={colors.primary}
              style={styles.coordIcon}
            />
            <Text
              style={[styles.coordsText, { color: colors.mutedForeground }]}
            >
              {formatCoordinate(droppedPin.lat, droppedPin.lng, coordsFormat)}
            </Text>
          </View>
        )}

        <View
          style={[styles.separator, { backgroundColor: colors.border }]}
        />

        {isLoading && (
          <>
            <SkeletonRow />
            <SkeletonRow wide />
            <SkeletonRow />
            <SkeletonRow wide />
          </>
        )}

        {isError && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {errorMsg || "Could not fetch data. Check your connection."}
          </Text>
        )}

        {isDone && record && (
          <>
            {/* Weather & Elevation Card */}
            {(weatherLoading || weatherData) && (
              <View style={[styles.weatherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {weatherLoading ? (
                  <View style={styles.weatherLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.weatherText, { color: colors.mutedForeground, marginLeft: 8 }]}>
                      Loading weather and elevation...
                    </Text>
                  </View>
                ) : (
                  weatherData && (
                    <View style={styles.weatherGrid}>
                      <View style={styles.weatherGridRow}>
                        <View style={styles.weatherItem}>
                          <Ionicons name={weatherData.weatherIcon || "cloudy"} size={16} color={colors.primary} />
                          <Text style={[styles.weatherVal, { color: colors.foreground }]}>
                            {weatherData.temp}°C
                          </Text>
                          <Text style={[styles.weatherLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {weatherData.weatherString}
                          </Text>
                        </View>
                        <View style={styles.weatherItem}>
                          <Ionicons name="water-outline" size={16} color={colors.primary} />
                          <Text style={[styles.weatherVal, { color: colors.foreground }]}>
                            {weatherData.humidity}%
                          </Text>
                          <Text style={[styles.weatherLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
                            Humidity
                          </Text>
                        </View>
                        <View style={styles.weatherItem}>
                          <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                          <Text style={[styles.weatherVal, { color: colors.foreground }]}>
                            {weatherData.windSpeed}k/h
                          </Text>
                          <Text style={[styles.weatherLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
                            Wind
                          </Text>
                        </View>
                        <View style={styles.weatherItem}>
                          <Ionicons name="trending-up" size={16} color={colors.primary} />
                          <Text style={[styles.weatherVal, { color: colors.foreground }]}>
                            {weatherData.elevation}m
                          </Text>
                          <Text style={[styles.weatherLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
                            Altitude (MSL)
                          </Text>
                        </View>
                      </View>
                      
                      {/* Advisory Alert */}
                      {!!weatherData.advisory && (
                        <View style={[styles.advisoryBox, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "25" }]}>
                          <Text style={[styles.advisoryText, { color: colors.foreground }]}>
                            {weatherData.advisory}
                          </Text>
                        </View>
                      )}
                    </View>
                  )
                )}
              </View>
            )}

            {/* Survey number — prominent card when found */}
            {hasSurveyNo ? (
              <View
                style={[
                  styles.surveyFoundCard,
                  {
                    backgroundColor: colors.primary + "12",
                    borderColor: colors.primary + "40",
                  },
                ]}
              >
                <View style={styles.surveyFoundTop}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text
                    style={[styles.surveyFoundLabel, { color: colors.primary }]}
                  >
                    Survey / Parcel Number
                  </Text>
                </View>
                <View style={styles.surveyFoundRow}>
                  <Text
                    style={[styles.surveyFoundNo, { color: colors.foreground }]}
                  >
                    {record.surveyNo}
                  </Text>
                  <Pressable
                    onPress={handleCopySurveyNo}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.copyBtn,
                      {
                        backgroundColor: pressed
                          ? colors.primary + "20"
                          : colors.primary + "10",
                        borderColor: colors.primary + "30",
                      },
                    ]}
                  >
                    <Ionicons name="share-social-outline" size={12} color={colors.primary} />
                    <Text
                      style={[styles.copyBtnText, { color: colors.primary }]}
                    >
                      Share
                    </Text>
                  </Pressable>
                </View>
                <Text
                  style={[
                    styles.surveyFoundHint,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Source: Bhuvan cadastral (NRSC)
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.surveyBox,
                  {
                    backgroundColor: colors.primary + "0E",
                    borderColor: colors.primary + "28",
                  },
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={14}
                  color={colors.primary}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.surveyTitle, { color: colors.foreground }]}
                  >
                    Survey number shown on map
                  </Text>
                  <Text
                    style={[
                      styles.surveyBody,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    The map has zoomed in — look for the number printed inside
                    your parcel boundary. Then open MeeBhoomi and select{" "}
                    {record?.district ? `${record.district} › ` : ""}
                    {record?.mandal ? `${record.mandal} › ` : ""}
                    {record?.village || "your village"}.
                  </Text>
                </View>
              </View>
            )}

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow label="State" value={record.state || ""} />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow label="District" value={record.district || ""} />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow label="Mandal" value={record.mandal || ""} />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow label="Village" value={record.village || ""} />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow
              label="Survey No"
              value={record.surveyNo || ""}
              editable={true}
              onChangeText={(text) => {
                setRecord((prev) => (prev ? { ...prev, surveyNo: text } : null));
              }}
              placeholder="Tap to enter"
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow
              label="Custom Label"
              value={saved ? (record.customTitle || "—") : customTitle}
              editable={!saved}
              onChangeText={setCustomTitle}
              placeholder="e.g. My Plot"
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <DataRow
              label="Custom Notes"
              value={saved ? (record.customNotes || "—") : customNotes}
              editable={!saved}
              onChangeText={setCustomNotes}
              placeholder="Add details/notes"
            />
          </>
        )}
      </ScrollView>

      {isDone && record && (
        <View style={styles.actions}>
          <Pressable
            onPress={handleMeeBhoomi}
            style={({ pressed }) => [
              styles.meebhoomiBtn,
              {
                backgroundColor: pressed
                  ? colors.primary + "CC"
                  : colors.primary,
                flex: 1,
              },
            ]}
          >
            <Ionicons name="open-outline" size={15} color="#fff" />
            <Text style={styles.actionBtnText}>
              {record.state?.toLowerCase() === "telangana" ? "Open Dharani" : "Open MeeBhoomi"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: pressed
                  ? colors.muted
                  : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={15} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {/* Custom Premium In-App Browser modal */}
      <InAppBrowser
        visible={browserVisible}
        url={browserUrl}
        onClose={() => setBrowserVisible(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
    maxHeight: 480,
    overflow: "hidden",
    zIndex: 999,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  closeBtn: { padding: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 8 },
  coordsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  coordIcon: { marginRight: 5 },
  coordsText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  separator: { height: 1, marginVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
    lineHeight: 20,
  },
  // Survey number found — prominent display
  surveyFoundCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  surveyFoundTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  surveyFoundLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  surveyFoundRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  surveyFoundNo: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  surveyFoundHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  // Survey number not available — guidance box
  surveyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  surveyTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  surveyBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  meebhoomiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    height: 48,
  },
  saveBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    width: 48,
    height: 48,
    borderWidth: 0.5,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  weatherCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginBottom: 12,
  },
  weatherLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  weatherText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  weatherGrid: {
    gap: 8,
  },
  weatherGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weatherItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  weatherVal: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  weatherLbl: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  advisoryBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginTop: 4,
  },
  advisoryText: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
});
