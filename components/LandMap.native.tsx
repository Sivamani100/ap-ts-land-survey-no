import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, UrlTile, Polyline, Polygon } from "react-native-maps";
import { useLand } from "@/context/LandContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { calculatePathLength, calculatePolygonArea, convertSqMeters, Coordinate } from "@/utils/geometry";

const OSM_TILE_URL = "https://tile.openstreetmap.de/{z}/{x}/{y}.png";
// Bhuvan AP cadastral survey layer — TMS format (flipY=true)
// Source: NRSC Bhuvan platform (bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/)
const BHUVAN_AP_CAD =
  "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0/cadastral:AP_Cad@EPSG:900913@png/{z}/{x}/{y}.png";

// Bhuvan TG cadastral survey layer — TMS format
const BHUVAN_TG_CAD =
  "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0/cadastral:TG_Cad@EPSG:900913@png/{z}/{x}/{y}.png";

interface LandMapProps {
  mapRef: React.RefObject<MapView | null>;
}

export function LandMap({ mapRef }: LandMapProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    droppedPin,
    dropPin,
    mapRegion,
    setMapRegion,
    mapType,
    showCadastral,
    setMapType,
    setShowCadastral,
    isVillageView,
    surveyOpacity,
  } = useLand();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bearing, setBearing] = useState(0);

  const [rulerMode, setRulerMode] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<Coordinate[]>([]);

  const handleMapPress = async (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    if (rulerMode) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRulerPoints((prev) => [...prev, { latitude, longitude }]);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dropPin(latitude, longitude);
  };

  const handleRegionChangeComplete = async (region: any) => {
    setMapRegion(region);
    if (mapRef.current) {
      try {
        const camera = await mapRef.current.getCamera();
        setBearing(camera.heading || 0);
      } catch {}
    }
  };

  // Auto-zoom to ~level 17 when a pin is dropped so survey numbers are readable
  useEffect(() => {
    if (droppedPin) {
      mapRef.current?.animateToRegion(
        {
          latitude: droppedPin.lat,
          longitude: droppedPin.lng,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
        800
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedPin?.lat, droppedPin?.lng]);

  // Show Bhuvan cadastral overlay when zoomed in enough to read survey numbers
  const cadastralVisible =
    (showCadastral || mapType === "lines") && mapRegion.latitudeDelta < 0.05; // roughly zoom 14+

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goToUserLocation = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permissions are required to show your position.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    goToUserLocation();
  }, []);

  const resetCompass = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mapRef.current) {
      mapRef.current.animateCamera({ heading: 0 }, { duration: 500 });
      setBearing(0);
    }
  };

  // Calculate dynamic scale bar values (meters / kilometers) based on current zoom delta
  const getScaleData = () => {
    const { latitude, longitudeDelta } = mapRegion;
    const screenWidthMeters = longitudeDelta * 111320 * Math.cos((latitude * Math.PI) / 180);
    
    // Scale bar is 60 pixels wide
    const scaleWidthPixels = 60;
    const scaleMeters = screenWidthMeters * (scaleWidthPixels / 360);
    
    let label = "";
    let lineWidth = scaleWidthPixels;
    
    if (scaleMeters >= 1000) {
      const km = Math.round(scaleMeters / 1000);
      const roundKm = km >= 10 ? Math.round(km / 5) * 5 : km >= 5 ? 5 : km >= 2 ? 2 : 1;
      label = `${roundKm} km`;
      lineWidth = (roundKm * 1000 / scaleMeters) * scaleWidthPixels;
    } else {
      const meters = Math.round(scaleMeters);
      const roundM = meters >= 500 ? 500 : meters >= 200 ? 200 : meters >= 100 ? 100 : meters >= 50 ? 50 : meters >= 20 ? 20 : 10;
      label = `${roundM} m`;
      lineWidth = (roundM / scaleMeters) * scaleWidthPixels;
    }
    
    if (lineWidth > 100) lineWidth = 100;
    if (lineWidth < 20) lineWidth = 20;
    
    return { label, width: lineWidth };
  };

  const scaleData = getScaleData();

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        mapType={
          mapType === "standard"
            ? "standard"
            : mapType === "satellite"
            ? "satellite"
            : mapType === "terrain"
            ? "terrain"
            : "none"
        }
        userInterfaceStyle={mapType === "dark" ? "dark" : "light"}
        {...{ showsUserHeading: true } as any}
      >
        {/* Base Tile Layer for custom map types */}
        {(mapType === "dark" || mapType === "lines") && (
          <UrlTile
            urlTemplate={
              mapType === "dark"
                ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            }
            maximumZ={19}
            flipY={false}
            tileSize={256}
          />
        )}

        {/* Cadastral Layer */}
        {cadastralVisible && (
          <>
            <UrlTile
              urlTemplate={BHUVAN_AP_CAD}
              maximumZ={19}
              minimumZ={13}
              flipY={true}
              tileSize={256}
              opacity={surveyOpacity}
            />
            <UrlTile
              urlTemplate={BHUVAN_TG_CAD}
              maximumZ={19}
              minimumZ={13}
              flipY={true}
              tileSize={256}
              opacity={surveyOpacity}
            />
          </>
        )}

        {droppedPin && !rulerMode && (
          <Marker
            coordinate={{
              latitude: droppedPin.lat,
              longitude: droppedPin.lng,
            }}
            pinColor="#1E3E72"
          />
        )}

        {/* Ruler Mode Drawing Layers */}
        {rulerPoints.map((pt, idx) => (
          <Marker
            key={`ruler-node-${idx}`}
            coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
            title={`Node ${idx + 1}`}
            pinColor={colors.accent}
          />
        ))}

        {rulerPoints.length >= 2 && (
          <Polyline
            coordinates={rulerPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeColor={colors.accent}
            strokeWidth={3}
            lineDashPattern={[6, 6]}
          />
        )}

        {rulerPoints.length >= 3 && (
          <Polygon
            coordinates={rulerPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeColor={colors.accent}
            strokeWidth={1}
            fillColor={colors.accent + "25"}
          />
        )}
      </MapView>

      {/* Dynamic scale bar */}
      <View style={styles.scaleBar}>
        <Text style={[styles.scaleText, { color: colors.foreground }]}>{scaleData.label}</Text>
        <View style={[styles.scaleLine, { width: scaleData.width, borderColor: colors.foreground }]} />
      </View>

      {/* Floating Action Buttons Column */}
      <View style={[styles.floatingContainer, { top: insets.top + 76 }]}>
        {!isVillageView && (
          <Pressable
            onPress={toggleMenu}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: pressed ? colors.muted : colors.card + "E6",
                borderColor: colors.border,
                marginBottom: 10,
              },
            ]}
          >
            <Ionicons name="layers-outline" size={20} color={colors.primary} />
          </Pressable>
        )}

        {/* Ruler Mode FAB */}
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (rulerMode) {
              setRulerPoints([]);
            }
            setRulerMode(!rulerMode);
          }}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: rulerMode ? colors.accent : (pressed ? colors.muted : colors.card + "E6"),
              borderColor: rulerMode ? colors.accent : colors.border,
              marginBottom: 10,
            },
          ]}
        >
          <Ionicons name={rulerMode ? "calculator" : "calculator-outline"} size={20} color={rulerMode ? "#fff" : colors.primary} />
        </Pressable>

        {/* Dynamic Rotating Compass FAB */}
        <Pressable
          onPress={resetCompass}
          style={({ pressed }) => [
            styles.compassFab,
            {
              transform: [{ rotate: `${-bearing}deg` }],
              backgroundColor: pressed ? colors.muted : colors.card + "E6",
              borderColor: colors.border,
              marginBottom: 10,
            },
          ]}
        >
          <Text style={[styles.compassTextN, { color: colors.destructive }]}>N</Text>
          <Text style={[styles.compassTextE, { color: colors.foreground }]}>E</Text>
          <Text style={[styles.compassTextS, { color: colors.foreground }]}>S</Text>
          <Text style={[styles.compassTextW, { color: colors.foreground }]}>W</Text>
          <Ionicons name="compass" size={16} color={colors.primary} />
        </Pressable>

        {/* Locate User FAB */}
        <Pressable
          onPress={goToUserLocation}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: pressed ? colors.muted : colors.card + "E6",
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="locate" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Floating Layer Menu Selector Panel */}
      {!isVillageView && menuOpen && (
        <View style={[styles.menuCardContainer, { top: insets.top + 76 }]}>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: colors.card + "FA",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: colors.foreground }]}>
                Map Options
              </Text>
              <Pressable onPress={toggleMenu} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.optionsList}>
              {[
                { id: "standard", label: "Standard Map", image: require("@/assets/images/map_type_standard.png") },
                { id: "satellite", label: "Satellite Map", image: require("@/assets/images/map_type_satellite.png") },
                { id: "terrain", label: "Terrain Map", image: require("@/assets/images/map_type_terrain.png") },
                { id: "dark", label: "Dark Mode Map", image: require("@/assets/images/map_type_dark.png") },
                { id: "lines", label: "Survey Lines Only", image: require("@/assets/images/map_type_lines.png") },
              ].map((opt) => {
                const isActive = mapType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setMapType(opt.id as any);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      styles.verticalOptRow,
                      {
                        backgroundColor: isActive
                          ? colors.primary + "15"
                          : pressed
                          ? colors.muted
                          : "transparent",
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Image
                      source={opt.image}
                      style={styles.verticalOptImage}
                      resizeMode="cover"
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.verticalOptLabel,
                        {
                          color: isActive ? colors.primary : colors.foreground,
                          fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isActive && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => {
                setShowCadastral(!showCadastral);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              disabled={mapType === "lines"}
              style={styles.toggleRow}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  {
                    color:
                      mapType === "lines"
                        ? colors.mutedForeground
                        : colors.foreground,
                  },
                ]}
              >
                Show Survey Lines
              </Text>
              <Ionicons
                name={
                  showCadastral || mapType === "lines"
                    ? "checkbox"
                    : "square-outline"
                }
                size={18}
                color={
                  mapType === "lines" ? colors.mutedForeground : colors.primary
                }
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Ruler Calculation Card */}
      {rulerMode && (
        (() => {
          const pathLength = calculatePathLength(rulerPoints);
          const polygonArea = rulerPoints.length >= 3 ? calculatePolygonArea(rulerPoints) : 0;
          const convertedArea = convertSqMeters(polygonArea);

          return (
            <View style={[styles.rulerCard, { backgroundColor: colors.card + "E6", borderColor: colors.border }]}>
              <View style={styles.rulerCardHeader}>
                <Ionicons name="calculator" size={16} color={colors.accent} />
                <Text style={[styles.rulerCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                  Measurement Ruler
                </Text>
                <Pressable
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRulerMode(false);
                    setRulerPoints([]);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={[styles.rulerHelpText, { color: colors.mutedForeground }]}>
                {rulerPoints.length === 0
                  ? "Tap map to measure distance and land area"
                  : rulerPoints.length === 1
                  ? "Tap another point to draw a line"
                  : rulerPoints.length === 2
                  ? "Add a 3rd point to calculate area"
                  : "Tap points to expand measured boundary"}
              </Text>

              {rulerPoints.length > 0 && (
                <View style={styles.rulerStats}>
                  <View style={styles.rulerStatRow}>
                    <Text style={[styles.rulerStatLabel, { color: colors.mutedForeground }]}>Total Distance:</Text>
                    <Text style={[styles.rulerStatVal, { color: colors.foreground }]}>
                      {pathLength < 1000 ? `${pathLength.toFixed(1)} m` : `${(pathLength / 1000).toFixed(2)} km`}
                    </Text>
                  </View>

                  {rulerPoints.length >= 3 && (
                    <>
                      <View style={[styles.rulerDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.rulerStatRow}>
                        <Text style={[styles.rulerStatLabel, { color: colors.mutedForeground }]}>Land Area:</Text>
                        <View style={styles.rulerAreaCol}>
                          <Text style={[styles.rulerStatVal, { color: colors.foreground }]}>
                            {convertedArea.acres.toFixed(3)} Acres
                          </Text>
                          <Text style={[styles.rulerStatSubVal, { color: colors.mutedForeground }]}>
                            {convertedArea.guntas.toFixed(1)} Guntas · {convertedArea.cents.toFixed(1)} Cents
                          </Text>
                          <Text style={[styles.rulerStatSubVal, { color: colors.mutedForeground }]}>
                            {polygonArea.toFixed(1)} sq meters
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.rulerActions}>
                <Pressable
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRulerPoints((prev) => prev.slice(0, -1));
                  }}
                  disabled={rulerPoints.length === 0}
                  style={({ pressed }) => [
                    styles.rulerBtn,
                    {
                      backgroundColor: colors.muted,
                      opacity: rulerPoints.length === 0 ? 0.5 : (pressed ? 0.8 : 1),
                    },
                  ]}
                >
                  <Ionicons name="arrow-undo-outline" size={14} color={colors.foreground} />
                  <Text style={[styles.rulerBtnText, { color: colors.foreground }]}>Undo</Text>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRulerPoints([]);
                  }}
                  disabled={rulerPoints.length === 0}
                  style={({ pressed }) => [
                    styles.rulerBtn,
                    {
                      backgroundColor: colors.destructive + "15",
                      opacity: rulerPoints.length === 0 ? 0.5 : (pressed ? 0.8 : 1),
                    },
                  ]}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                  <Text style={[styles.rulerBtnText, { color: colors.destructive }]}>Clear</Text>
                </Pressable>
              </View>
            </View>
          );
        })()
      )}
    </View>
  );
}

export function animateToRegion(
  mapRef: React.RefObject<MapView | null>,
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }
) {
  mapRef.current?.animateToRegion(region, 600);
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    right: 14,
    top: 90, // Positioned safely below the top title bar
    zIndex: 1001,
    alignItems: "center",
  },
  compassFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
  },
  compassTextN: {
    position: "absolute",
    top: 2,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  compassTextS: {
    position: "absolute",
    bottom: 2,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  compassTextE: {
    position: "absolute",
    right: 4,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  compassTextW: {
    position: "absolute",
    left: 4,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  menuCardContainer: {
    position: "absolute",
    right: 70,
    top: 90,
    zIndex: 1002,
  },
  scaleBar: {
    position: "absolute",
    bottom: 90,
    left: 14,
    zIndex: 1000,
    alignItems: "center",
  },
  scaleText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
    textShadowColor: "rgba(255,255,255,0.7)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  scaleLine: {
    height: 5,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  menuCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsList: {
    gap: 2,
    marginBottom: 4,
  },
  verticalOptRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 6,
    gap: 10,
  },
  verticalOptImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  verticalOptLabel: {
    flex: 1,
    fontSize: 12,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  // Ruler card styles
  rulerCard: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 95, // Above bottom nav bar offset (75px) with padding
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },
  rulerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rulerCardTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  rulerHelpText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  rulerStats: {
    gap: 6,
    marginTop: 4,
  },
  rulerStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rulerStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  rulerStatVal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  rulerStatSubVal: {
    fontSize: 9.5,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  rulerAreaCol: {
    alignItems: "flex-end",
    gap: 1,
  },
  rulerDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  rulerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  rulerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
  },
  rulerBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

