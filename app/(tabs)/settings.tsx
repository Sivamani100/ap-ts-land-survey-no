import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";
import { useLand } from "@/context/LandContext";
import { clearHistory, getHistory } from "@/utils/storage";
import { toSqMeters, convertSqMeters } from "@/utils/geometry";
import { useRouter } from "expo-router";

type SubPage = "main" | "location" | "theme" | "opacity" | "format" | "data" | "converter";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    theme,
    setTheme,
    coordsFormat,
    setCoordsFormat,
    surveyOpacity,
    setSurveyOpacity,
    showCadastral,
    setShowCadastral,
  } = useLand();

  const [subPage, setSubPage] = useState<SubPage>("main");
  const [locPermission, setLocPermission] = useState<string>("checking");

  const [convValue, setConvValue] = useState("1");
  const [convUnit, setConvUnit] = useState<"acres" | "guntas" | "cents" | "sqYards" | "hectares" | "sqMeters">("acres");

  const topPad = Platform.OS === "web"
    ? 20
    : insets.top > 0
    ? insets.top
    : Platform.OS === "ios"
    ? 44
    : 36;
  const bottomPad = Platform.OS === "web" ? 34 + 75 : insets.bottom + 75;

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocPermission(status);
    } catch {
      setLocPermission("undetermined");
    }
  };

  const requestLocationPermission = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocPermission(status);
      if (status === "granted") {
        Alert.alert("Permission Granted", "Location services are now enabled.");
      } else {
        Alert.alert("Permission Denied", "Enable location services in your device settings.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearHistory = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Clear History",
      "Are you sure you want to permanently delete all saved land records?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("History Cleared", "All local history records have been deleted.");
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const history = await getHistory();
    if (history.length === 0) {
      Alert.alert("No Records", "There are no saved records to export.");
      return;
    }

    const headers = "ID,Timestamp,Latitude,Longitude,State,District,Mandal,Village,SurveyNo,Area(Acres),LandUse,PinSource\n";
    const rows = history.map((r) => 
      `"${r.id}","${new Date(r.timestamp).toISOString()}",${r.lat},${r.lng},"${r.state}","${r.district}","${r.mandal}","${r.village}","${r.surveyNo}","${r.areaAcres}","${r.landUse}","${r.pinSource}"`
    ).join("\n");

    const csvContent = headers + rows;

    try {
      await Share.share({
        message: csvContent,
        title: "AP_Land_Records_Export.csv",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const navigateTo = async (page: SubPage) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubPage(page);
  };

  const goBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubPage("main");
  };

  // Sub-page headers
  const renderSubHeader = (title: string) => (
    <View style={styles.subHeader}>
      <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} style={{ marginLeft: -4 }} />
      </Pressable>
      <Text style={[styles.subTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {subPage === "main" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Configure surveyor preferences, location services, and map settings.
            </Text>

            {/* Menu List */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Location */}
              <Pressable onPress={() => navigateTo("location")} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Location Services</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      {locPermission === "granted" ? "Permission enabled" : "Configure GPS access"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Theme */}
              <Pressable onPress={() => navigateTo("theme")} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>App Theme</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Active: {theme === "system" ? "System Default" : theme === "dark" ? "Dark Mode" : "Light Mode"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Opacity */}
              <Pressable onPress={() => navigateTo("opacity")} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="color-filter-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Survey Lines Opacity</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Adjust opacity: {Math.round(surveyOpacity * 100)}%
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Coordinates Format */}
              <Pressable onPress={() => navigateTo("format")} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="compass-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Coordinate Notation</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Format: {coordsFormat === "DD" ? "Decimal Degrees" : "DMS (Deg, Min, Sec)"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Data Management */}
              <Pressable onPress={() => navigateTo("data")} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="server-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Data &amp; Backup</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Export CSV records or reset app data
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Land Area Converter */}
              <Pressable onPress={() => navigateTo("converter")} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calculator-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Land Area Converter</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Convert between Acres, Guntas, Cents, Yards, Hectares
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Data Sources */}
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/sources" as any);
                }}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Official Data Sources</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      List of government portals and mapping services used
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* About & Disclaimer */}
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/disclaimer" as any);
                }}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>About &amp; Disclaimer</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Government disclaimer and official data sources
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Privacy Policy */}
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const privacyUrl = "https://sivamani100.github.io/ap-ts-land-survey-no/privacy.html";
                  try {
                    await WebBrowser.openBrowserAsync(privacyUrl, {
                      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                      toolbarColor: colors.primary,
                      controlsColor: colors.primaryForeground || "#ffffff",
                    });
                  } catch (err) {
                    console.error("Failed to open Privacy Policy:", err);
                    Linking.openURL(privacyUrl).catch((e) => console.error(e));
                  }
                }}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Privacy Policy</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      View location data collection and sharing policy
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Contact Support */}
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const mailUrl = "mailto:support@aptslandrecords.mobile?subject=AP%20TS%20Land%20Survey%20Finder%20Support";
                  Linking.openURL(mailUrl).catch((err) => {
                    Alert.alert(
                      "Contact Support",
                      "Email: support@aptslandrecords.mobile\n\nPlease email us for any assistance."
                    );
                  });
                }}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  <View style={styles.rowTextContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Contact Support</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Get email support for the application
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Land Records Cadastral Map v{Constants.expoConfig?.version ?? "1.0.3"} · NRSC Bhuvan API
            </Text>
          </>
        )}

        {/* Location Services Sub-page */}
        {subPage === "location" && (
          <>
            {renderSubHeader("Location Services")}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowNoAction}>
                <Text style={[styles.detailTextHeader, { color: colors.foreground }]}>GPS Location Access</Text>
                <Text style={[styles.detailTextDescription, { color: colors.mutedForeground }]}>
                  The app uses your device's GPS to identify your active location on the cadastral survey map, display orientation compass rose directions, and show your facing heading cone.
                </Text>
                
                <View style={[styles.permissionBox, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.permissionLabel, { color: colors.foreground }]}>Permission Status:</Text>
                  <View style={[styles.badge, { backgroundColor: locPermission === "granted" ? colors.success + "20" : colors.destructive + "20" }]}>
                    <Text style={[styles.badgeText, { color: locPermission === "granted" ? colors.success : colors.destructive }]}>
                      {locPermission === "granted" ? "Granted" : "Not Active"}
                    </Text>
                  </View>
                </View>

                {locPermission !== "granted" && (
                  <Pressable
                    onPress={requestLocationPermission}
                    style={({ pressed }) => [
                      styles.btn,
                      { backgroundColor: pressed ? colors.primary + "CC" : colors.primary, marginTop: 12 },
                    ]}
                  >
                    <Text style={styles.btnText}>Enable Location Permissions</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}

        {/* App Theme Sub-page */}
        {subPage === "theme" && (
          <>
            {renderSubHeader("App Theme")}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { id: "system", label: "System Default", desc: "Follow device dark mode settings automatically" },
                { id: "light", label: "Light Theme", desc: "Classic high-contrast light scheme" },
                { id: "dark", label: "Dark Theme", desc: "Premium energy-saving dark glassmorphism mode" },
              ].map((opt, idx, arr) => {
                const isActive = theme === opt.id;
                return (
                  <View key={opt.id}>
                    <Pressable
                      onPress={async () => {
                        await setTheme(opt.id as any);
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={styles.row}
                    >
                      <View style={styles.rowLeft}>
                        <Ionicons
                          name={isActive ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={isActive ? colors.primary : colors.mutedForeground}
                        />
                        <View>
                          <Text style={[styles.label, { color: colors.foreground }]}>{opt.label}</Text>
                          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                        </View>
                      </View>
                    </Pressable>
                    {idx < arr.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Opacity Sub-page */}
        {subPage === "opacity" && (
          <>
            {renderSubHeader("Survey Lines Opacity")}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowNoAction}>
                <Text style={[styles.detailTextHeader, { color: colors.foreground }]}>Adjust Transparency</Text>
                <Text style={[styles.detailTextDescription, { color: colors.mutedForeground }]}>
                  Select the default visibility opacity of cadastral survey lines overlaid on the maps.
                </Text>

                <View style={styles.interactiveOpacityList}>
                  {[
                    { val: 0.4, label: "40% Opacity", desc: "Subtle lines overlay" },
                    { val: 0.65, label: "65% Opacity", desc: "Balanced transparency" },
                    { val: 0.85, label: "85% Opacity", desc: "Highly visible survey lines (Default)" },
                    { val: 1.0, label: "100% Opacity", desc: "Solid boundary lines" },
                  ].map((opt) => {
                    const isActive = surveyOpacity === opt.val;
                    return (
                      <Pressable
                        key={opt.val}
                        onPress={async () => {
                          await setSurveyOpacity(opt.val);
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.opacitySelectorBtn,
                          {
                            backgroundColor: isActive ? colors.primary + "12" : colors.muted + "40",
                            borderColor: isActive ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <View style={styles.opacitySelectorTextCol}>
                          <Text style={[styles.opacityLabelText, { color: colors.foreground, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                            {opt.label}
                          </Text>
                          <Text style={[styles.opacityDescText, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                        </View>
                        {isActive && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Coordinate Format Sub-page */}
        {subPage === "format" && (
          <>
            {renderSubHeader("Coordinate Notation")}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowNoAction}>
                <Text style={[styles.detailTextHeader, { color: colors.foreground }]}>Surveyor Grid Format</Text>
                <Text style={[styles.detailTextDescription, { color: colors.mutedForeground }]}>
                  Toggle the coordinate system format display across land cards, history list and coordinates badges.
                </Text>

                <View style={styles.notationBoxGroup}>
                  {[
                    { id: "DD", label: "Decimal Degrees (DD)", example: "16.506200, 80.648000" },
                    { id: "DMS", label: "Degrees, Minutes, Seconds (DMS)", example: "16° 30' 22\" N, 80° 38' 52\" E" },
                  ].map((opt) => {
                    const isActive = coordsFormat === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={async () => {
                          await setCoordsFormat(opt.id as any);
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.notationCard,
                          {
                            backgroundColor: isActive ? colors.primary + "12" : colors.muted + "40",
                            borderColor: isActive ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <View style={styles.notationHeaderRow}>
                          <Ionicons
                            name={isActive ? "radio-button-on" : "radio-button-off"}
                            size={16}
                            color={isActive ? colors.primary : colors.mutedForeground}
                          />
                          <Text style={[styles.notationCardLabel, { color: colors.foreground, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                            {opt.label}
                          </Text>
                        </View>
                        <Text style={[styles.notationCardExample, { color: colors.mutedForeground }]}>
                          Example: {opt.example}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Data & Backup Sub-page */}
        {subPage === "data" && (
          <>
            {renderSubHeader("Data Management")}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Export CSV */}
              <Pressable onPress={handleExportCSV} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Export History as CSV</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                      Share or backup your saved survey database to Excel or CSV editors
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Clear History */}
              <Pressable onPress={handleClearHistory} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.destructive }]}>Clear Saved History</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                      Permanently delete all local survey and land records from this device
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </>
        )}

        {/* Land Area Converter Sub-page */}
        {subPage === "converter" && (() => {
          const numericVal = parseFloat(convValue) || 0;
          const sqMeters = convUnit === "sqMeters" ? numericVal : toSqMeters(numericVal, convUnit);
          const converted = convertSqMeters(sqMeters);

          const unitsList: Array<{ key: typeof convUnit; label: string; suffix: string }> = [
            { key: "acres", label: "Acres", suffix: "ac" },
            { key: "guntas", label: "Guntas", suffix: "gunta" },
            { key: "cents", label: "Cents", suffix: "cent" },
            { key: "sqYards", label: "Square Yards", suffix: "sq yd" },
            { key: "sqMeters", label: "Square Meters", suffix: "sq m" },
            { key: "hectares", label: "Hectares", suffix: "ha" },
          ];

          return (
            <>
              {renderSubHeader("Area Unit Converter")}
              
              {/* Input section */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 0 }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 14 }]}>Enter Value</Text>
                <View style={styles.converterInputRow}>
                  <TextInput
                    style={[styles.converterInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                    value={convValue}
                    onChangeText={setConvValue}
                    keyboardType="decimal-pad"
                    placeholder="Enter number..."
                    placeholderTextColor={colors.mutedForeground}
                    selectTextOnFocus={true}
                  />
                </View>

                {/* Source Unit Pills */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 14, marginTop: 14, marginBottom: 8 }]}>From Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={{ paddingHorizontal: 14 }}>
                  {unitsList.map((unit) => {
                    const isSelected = convUnit === unit.key;
                    return (
                      <Pressable
                        key={unit.key}
                        onPress={async () => {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setConvUnit(unit.key);
                        }}
                        style={[
                          styles.converterPill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.muted,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.converterPillText, { color: isSelected ? "#fff" : colors.foreground }]}>
                          {unit.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Converted values grid */}
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Conversions</Text>
              <View style={styles.converterGrid}>
                {unitsList.map((unit) => {
                  const val = unit.key === "sqMeters" ? sqMeters : converted[unit.key as keyof typeof converted];
                  const displayVal = isNaN(val) ? "0.0000" : val.toFixed(4).replace(/\.?0+$/, "");
                  const isCurrent = convUnit === unit.key;

                  return (
                    <View
                      key={unit.key}
                      style={[
                        styles.converterGridCard,
                        {
                          backgroundColor: isCurrent ? colors.primary + "0C" : colors.card,
                          borderColor: isCurrent ? colors.primary + "60" : colors.border,
                          borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <Text style={[styles.converterGridLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{unit.label}</Text>
                      <Text style={[styles.converterGridValue, { color: colors.foreground }]} numberOfLines={1}>
                        {displayVal}
                      </Text>
                      <Text style={[styles.converterGridSuffix, { color: colors.mutedForeground }]}>{unit.suffix}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 24 },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  subTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowNoAction: {
    paddingVertical: 14,
    gap: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowTextContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  cardSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  permissionBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  detailTextHeader: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  detailTextDescription: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  interactiveOpacityList: {
    gap: 8,
    marginTop: 4,
  },
  opacitySelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  opacitySelectorTextCol: {
    gap: 2,
  },
  opacityLabelText: {
    fontSize: 13,
  },
  opacityDescText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  notationBoxGroup: {
    gap: 10,
    marginTop: 6,
  },
  notationCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  notationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notationCardLabel: {
    fontSize: 13,
  },
  notationCardExample: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginLeft: 24,
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    fontFamily: "Inter_400Regular",
  },
  // Converter styles
  pillRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  converterInputRow: {
    paddingHorizontal: 14,
    marginTop: 4,
  },
  converterInput: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 2,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
  converterPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  converterPillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  converterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  converterGridCard: {
    width: "48%", // 2 columns layout
    flexGrow: 1,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  converterGridLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  converterGridValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  converterGridSuffix: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
});
