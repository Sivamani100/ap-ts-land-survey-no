import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";

// Conditionally import WebView on native to prevent web compilation crash
let WebView: any = null;
if ((Platform.OS as string) !== "web") {
  try {
    WebView = require("react-native-webview").WebView;
  } catch (e) {
    console.error("Failed to load react-native-webview", e);
  }
}

interface InAppBrowserProps {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export function InAppBrowser({ visible, url, onClose }: InAppBrowserProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);

  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  // Extract domain name
  const getDomainName = (urlString: string) => {
    try {
      const match = urlString.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
      return match ? match[1] : urlString;
    } catch {
      return urlString;
    }
  };

  const domain = getDomainName(currentUrl || url);

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this land record link: ${currentUrl}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenExternal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await WebBrowser.openBrowserAsync(currentUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if ((Platform.OS as string) === "web") {
      if (iframeRef.current?.contentWindow) {
        // Limited support for iframe navigation back on web due to security sandbox
        try {
          window.history.back();
        } catch {}
      }
    } else {
      webViewRef.current?.goBack();
    }
  };

  const handleGoForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if ((Platform.OS as string) === "web") {
      try {
        window.history.forward();
      } catch {}
    } else {
      webViewRef.current?.goForward();
    }
  };

  const handleReload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if ((Platform.OS as string) === "web") {
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } else {
      webViewRef.current?.reload();
    }
  };

  const handleNavStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
  };

  if ((Platform.OS as string) === "web") {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* iOS / Instagram Web Search Top Bar Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === "ios" ? 12 : insets.top + 6,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>

          {/* Search URL Capsule */}
          <View style={[styles.urlCapsule, { backgroundColor: colors.muted }]}>
            <Ionicons name="lock-closed" size={11} color={colors.success} style={styles.lockIcon} />
            <Text style={[styles.urlText, { color: colors.foreground }]} numberOfLines={1}>
              {domain}
            </Text>
          </View>

          <Pressable onPress={handleReload} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="reload" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Browser Core Frame */}
        <View style={styles.browserFrame}>
          {(Platform.OS as string) === "web" ? (
            <View style={StyleSheet.absoluteFill}>
              <iframe
                ref={iframeRef}
                src={url}
                style={{ width: "100%", height: "100%", border: "none" }}
                onLoad={() => setLoading(false)}
              />
              {loading && (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            </View>
          ) : (
            WebView && (
              <View style={StyleSheet.absoluteFill}>
                <WebView
                  ref={webViewRef}
                  source={{ uri: url }}
                  style={{ flex: 1 }}
                  onLoadStart={() => setLoading(true)}
                  onLoadEnd={() => setLoading(false)}
                  onNavigationStateChange={handleNavStateChange}
                  domStorageEnabled={true}
                  javaScriptEnabled={true}
                />
                {loading && (
                  <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              </View>
            )
          )}
        </View>

        {/* Bottom Toolbar Nav Controls */}
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <Pressable
            onPress={handleGoBack}
            disabled={(Platform.OS as string) !== "web" && !canGoBack}
            style={({ pressed }) => [
              styles.toolBtn,
              ((Platform.OS as string) !== "web" && !canGoBack) && { opacity: 0.3 },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={handleGoForward}
            disabled={(Platform.OS as string) !== "web" && !canGoForward}
            style={({ pressed }) => [
              styles.toolBtn,
              ((Platform.OS as string) !== "web" && !canGoForward) && { opacity: 0.3 },
            ]}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>

          <Pressable onPress={handleShare} style={styles.toolBtn}>
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </Pressable>

          <Pressable onPress={handleOpenExternal} style={styles.toolBtn}>
            <Ionicons name="compass-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  urlCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  lockIcon: {
    marginRight: 4,
  },
  urlText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  browserFrame: {
    flex: 1,
    position: "relative",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});
