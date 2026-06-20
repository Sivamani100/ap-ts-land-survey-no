import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandProvider } from "@/context/LandContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, Text, View, Pressable, StyleSheet, ScrollView, Platform, BackHandler, Linking } from "react-native";
import { useState } from "react";

function RootLayoutNav() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("disclaimer_accepted_v1.0.3").then((val) => {
      if (val !== "true") {
        setShowDisclaimer(true);
      }
    });
  }, []);

  const handleAgree = async () => {
    await AsyncStorage.setItem("disclaimer_accepted_v1.0.3", "true");
    setShowDisclaimer(false);
  };

  const handleExit = () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else {
      // Graceful fallback for non-android platforms
      setShowDisclaimer(true);
    }
  };

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't open URL", err));
  };

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="disclaimer" options={{ title: "Disclaimer", presentation: "modal" }} />
        <Stack.Screen name="sources" options={{ title: "Data Sources", presentation: "modal" }} />
      </Stack>

      <Modal
        visible={showDisclaimer}
        transparent={false}
        animationType="fade"
        hardwareAccelerated
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.shieldIcon}>⚠️</Text>
            </View>
            <Text style={styles.title}>Disclaimer</Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.warningText}>
              AP & TS Survey No Finder is an independent application.
            </Text>

            <Text style={styles.bodyText}>
              This application is <Text style={styles.boldText}>NOT affiliated with, endorsed by, or representing</Text> the Government of India, Government of Andhra Pradesh, Government of Telangana, NRSC, ISRO, MeeBhoomi, Dharani, or any government department.
            </Text>

            <Text style={styles.sectionHeader}>Data Sources:</Text>

            <View style={styles.sourceItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.sourceTextContainer}>
                <Text style={styles.sourceLabel}>Bhuvan (NRSC/ISRO)</Text>
                <Pressable onPress={() => handleOpenUrl("https://bhuvan.nrsc.gov.in")}>
                  <Text style={styles.linkText}>https://bhuvan.nrsc.gov.in</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sourceItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.sourceTextContainer}>
                <Text style={styles.sourceLabel}>Andhra Pradesh MeeBhoomi</Text>
                <Pressable onPress={() => handleOpenUrl("https://meebhoomi.ap.gov.in")}>
                  <Text style={styles.linkText}>https://meebhoomi.ap.gov.in</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sourceItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.sourceTextContainer}>
                <Text style={styles.sourceLabel}>Telangana Dharani</Text>
                <Pressable onPress={() => handleOpenUrl("https://dharani.telangana.gov.in")}>
                  <Text style={styles.linkText}>https://dharani.telangana.gov.in</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sourceItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.sourceTextContainer}>
                <Text style={styles.sourceLabel}>OpenStreetMap / Nominatim</Text>
                <Pressable onPress={() => handleOpenUrl("https://nominatim.org")}>
                  <Text style={styles.linkText}>https://nominatim.org</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sourceItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.sourceTextContainer}>
                <Text style={styles.sourceLabel}>Overpass API</Text>
                <Pressable onPress={() => handleOpenUrl("https://overpass-api.de")}>
                  <Text style={styles.linkText}>https://overpass-api.de</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sourceItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.sourceTextContainer}>
                <Text style={styles.sourceLabel}>Open-Meteo</Text>
                <Pressable onPress={() => handleOpenUrl("https://open-meteo.com")}>
                  <Text style={styles.linkText}>https://open-meteo.com</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.disclaimerFooter}>
              The information displayed is for informational and reference purposes only and should not be treated as an official government record, ownership certificate, or legal document.
            </Text>

            <Text style={styles.disclaimerFooter}>
              Users must verify all records through the respective official government portals before making any legal, financial, or property-related decisions.
            </Text>
          </ScrollView>

          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, styles.exitBtn]} onPress={handleExit}>
              <Text style={styles.exitBtnText}>Exit App</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.agreeBtn]} onPress={handleAgree}>
              <Text style={styles.agreeBtnText}>I Agree & Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <LandProvider>
                <RootLayoutNav />
              </LandProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#F4F2EE",
    padding: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  shieldIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#1E3E72",
  },
  scrollView: {
    flex: 1,
    marginVertical: 10,
    paddingRight: 4,
  },
  warningText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#D97706",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1A1A18",
    lineHeight: 22,
    marginBottom: 20,
  },
  boldText: {
    fontFamily: "Inter_700Bold",
    color: "#C0392B",
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#1E3E72",
    marginBottom: 12,
  },
  sourceItem: {
    flexDirection: "row",
    marginBottom: 14,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    color: "#1E3E72",
  },
  sourceTextContainer: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A18",
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#1E3E72",
    textDecorationLine: "underline",
    marginTop: 2,
  },
  disclaimerFooter: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    color: "#7A7970",
    lineHeight: 18,
    marginTop: 16,
    textAlign: "justify",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exitBtn: {
    backgroundColor: "#EDEAE4",
    borderWidth: 1,
    borderColor: "#DDD9D1",
  },
  exitBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#7A7970",
  },
  agreeBtn: {
    backgroundColor: "#1E3E72",
  },
  agreeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
