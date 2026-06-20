import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";

export default function DisclaimerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleOpenSource = async (url: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: colors.primary,
        controlsColor: colors.primaryForeground || "#ffffff",
      });
    } catch (err) {
      console.error("Failed to open official data source:", err);
      Linking.openURL(url).catch((e) => console.error(e));
    }
  };

  const handleEmailSupport = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = "support@aptslandrecords.mobile";
    const mailUrl = `mailto:${email}?subject=AP%20TS%20Land%20Survey%20Finder%20Feedback`;
    Linking.openURL(mailUrl).catch((err) => {
      Alert.alert(
        "Contact Support",
        `Email: ${email}\n\nPlease email us for any assistance.`
      );
    });
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.3";

  return (
    <>
      <Stack.Screen
        options={{
          title: "About & Disclaimer",
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 16 },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={handleClose} hitSlop={12} style={{ paddingLeft: 4 }}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* App Disclaimer */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.warning + "15" }]}>
              <Ionicons name="shield-outline" size={42} color={colors.warning} />
              <Ionicons 
                name="alert" 
                size={18} 
                color={colors.warning} 
                style={styles.alertSubIcon} 
              />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Independent Application
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.foreground }]}>
              AP &amp; TS Survey No Finder is an independent, privately developed mobile application. It is <Text style={styles.boldText}>NOT affiliated with, endorsed by, or representing</Text> any government entity, department, or official agency of the Government of India, the Government of Andhra Pradesh, or the Government of Telangana.
            </Text>
          </View>

          {/* Government Disclaimer */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Government Data &amp; Legal Status
              </Text>
            </View>
            <Text style={[styles.disclaimerText, { color: colors.foreground, textAlign: "left" }]}>
              The mapping overlays and survey information displayed in this app are sourced from public geospatial datasets and do not represent certified legal titles.
            </Text>
            <Text style={[styles.disclaimerSubText, { color: colors.mutedForeground, marginTop: 8 }]}>
              ⚠️ <Text style={styles.semiboldText}>Important Notice:</Text> This application should be used for reference and informational purposes only. It should not be treated as an official record, land ownership certificate, or a legal document for property registration. Please verify all land records through official government portals.
            </Text>
          </View>

          {/* Official Source URLs */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Official Sources &amp; Portals
            </Text>

            <Pressable
              onPress={() => handleOpenSource("https://bhuvan.nrsc.gov.in")}
              style={({ pressed }) => [
                styles.sourceButton,
                { 
                  backgroundColor: pressed ? colors.primary + "15" : colors.primary + "0A",
                  borderColor: colors.primary + "30"
                }
              ]}
            >
              <View style={styles.sourceButtonLeft}>
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
                <Text style={[styles.sourceUrlText, { color: colors.primary }]}>
                  Bhuvan (NRSC/ISRO)
                </Text>
              </View>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </Pressable>

            <Pressable
              onPress={() => handleOpenSource("https://meebhoomi.ap.gov.in")}
              style={({ pressed }) => [
                styles.sourceButton,
                { 
                  backgroundColor: pressed ? colors.primary + "15" : colors.primary + "0A",
                  borderColor: colors.primary + "30"
                }
              ]}
            >
              <View style={styles.sourceButtonLeft}>
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
                <Text style={[styles.sourceUrlText, { color: colors.primary }]}>
                  AP MeeBhoomi Portal
                </Text>
              </View>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </Pressable>

            <Pressable
              onPress={() => handleOpenSource("https://dharani.telangana.gov.in")}
              style={({ pressed }) => [
                styles.sourceButton,
                { 
                  backgroundColor: pressed ? colors.primary + "15" : colors.primary + "0A",
                  borderColor: colors.primary + "30"
                }
              ]}
            >
              <View style={styles.sourceButtonLeft}>
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
                <Text style={[styles.sourceUrlText, { color: colors.primary }]}>
                  TG Dharani Portal
                </Text>
              </View>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </Pressable>
          </View>

          {/* App Info & Contact Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "stretch" }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, alignSelf: "flex-start" }]}>
              Application Info
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>App Version</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{appVersion}</Text>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

            <Pressable onPress={handleEmailSupport} style={styles.emailPressable}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Support Email</Text>
                <View style={styles.emailContainer}>
                  <Text style={[styles.emailValue, { color: colors.primary }]}>support@aptslandrecords.mobile</Text>
                  <Ionicons name="mail-outline" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                </View>
              </View>
            </Pressable>
          </View>

          {/* Got it action button */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.actionBtn,
              { 
                backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
                marginTop: 8
              }
            ]}
          >
            <Text style={styles.actionBtnText}>Got It</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  alertSubIcon: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "transparent",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  disclaimerSubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  boldText: {
    fontFamily: "Inter_700Bold",
    color: "#C0392B",
  },
  semiboldText: {
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  sourceButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceUrlText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    width: "100%",
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginVertical: 4,
  },
  emailPressable: {
    width: "100%",
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  emailValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  actionBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
