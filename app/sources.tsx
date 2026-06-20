import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";

interface SourceItemProps {
  name: string;
  url: string;
  desc: string;
  colors: any;
  onPress: (url: string) => void;
}

function SourceItem({ name, url, desc, colors, onPress }: SourceItemProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sourceName, { color: colors.foreground }]}>{name}</Text>
      
      <Pressable
        onPress={() => onPress(url)}
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
          <Text style={[styles.sourceUrlText, { color: colors.primary }]} numberOfLines={1}>
            {url}
          </Text>
        </View>
        <Ionicons name="open-outline" size={14} color={colors.primary} />
      </Pressable>

      <Text style={[styles.sourceDescText, { color: colors.mutedForeground }]}>
        {desc}
      </Text>
    </View>
  );
}

export default function DataSourcesScreen() {
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
      console.error("Failed to open data source:", err);
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const sources = [
    {
      name: "Bhuvan (NRSC/ISRO)",
      url: "https://bhuvan.nrsc.gov.in",
      desc: "Provides the underlying cadastral maps, parcel boundaries, and survey grid layout data via public TMS and WMS web services.",
    },
    {
      name: "Andhra Pradesh MeeBhoomi",
      url: "https://meebhoomi.ap.gov.in",
      desc: "Official digital land records portal of the Government of Andhra Pradesh for verifying Adangal, 1-B, and official ownership holdings.",
    },
    {
      name: "Telangana Dharani",
      url: "https://dharani.telangana.gov.in",
      desc: "Integrated Land Records Management System portal of the Government of Telangana for checking land parcel and ownership details.",
    },
    {
      name: "OpenStreetMap / Nominatim",
      url: "https://nominatim.org",
      desc: "Used for open-access geocoding, reverse geocoding, and resolving latitude/longitude coordinates to local village and town names.",
    },
    {
      name: "Overpass API",
      url: "https://overpass-api.de",
      desc: "Serves boundary relation data to map coordinate points to hierarchical administrative levels (state, district, mandal, village).",
    },
    {
      name: "Open-Meteo",
      url: "https://open-meteo.com",
      desc: "Provides public non-commercial weather forecasts, humidity, wind patterns, and sea-level elevation indices for crop planning and surveying.",
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Official Data Sources",
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
          <View style={[styles.infoCard, { backgroundColor: colors.primary + "0A", borderColor: colors.primary + "20" }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              This application overlays public data from the sources listed below for reference convenience. No official records are altered or stored by this app.
            </Text>
          </View>

          {sources.map((src, index) => (
            <SourceItem
              key={index}
              name={src.name}
              url={src.url}
              desc={src.desc}
              colors={colors}
              onPress={handleOpenSource}
            />
          ))}
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
  infoCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sourceName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  sourceButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sourceUrlText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  sourceDescText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
