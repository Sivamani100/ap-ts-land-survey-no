import React, { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLand } from "@/context/LandContext";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { calculatePathLength, calculatePolygonArea, convertSqMeters, Coordinate } from "@/utils/geometry";

export interface LandMapWebRef {
  animateToAP?: () => void;
}

interface LandMapProps {
  mapRef?: React.RefObject<LandMapWebRef | null>;
}

export function animateToRegion(_ref: unknown, _region: unknown) {}

// Bhuvan AP cadastral survey layer — TMS format (y from bottom, so tms:true in Leaflet)
// Source: NRSC Bhuvan platform (bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/)
const BHUVAN_AP_CAD =
  "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0/cadastral:AP_Cad@EPSG:900913@png/{z}/{x}/{y}.png";

// Bhuvan TG cadastral survey layer — TMS format
const BHUVAN_TG_CAD =
  "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0/cadastral:TG_Cad@EPSG:900913@png/{z}/{x}/{y}.png";

const TILE_LAYERS = {
  standard: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  lines: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }
    if (!document.getElementById("lf-css")) {
      const link = document.createElement("link");
      link.id = "lf-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function LandMap({ mapRef }: LandMapProps) {
  const colors = useColors();
  const { droppedPin, dropPin, mapType, showCadastral, setMapType, setShowCadastral, isVillageView, surveyOpacity } = useLand();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const apsacLayerRef = useRef<any>(null);
  const activeBaseLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const didInit = useRef(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  const [rulerMode, setRulerMode] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<Coordinate[]>([]);
  const rulerModeRef = useRef(false);
  const rulerPointsRef = useRef<Coordinate[]>([]);
  const rulerLayersRef = useRef<any[]>([]);

  useEffect(() => {
    rulerModeRef.current = rulerMode;
  }, [rulerMode]);

  useEffect(() => {
    rulerPointsRef.current = rulerPoints;
  }, [rulerPoints]);

  // Auto-request location permission on map loaded
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1 });
            }
          },
          (err) => {
            console.log("Auto location request denied or failed:", err);
          }
        );
      }
    }
  }, [mapLoaded]);

  // Monitor device orientation (web compass heading)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading = (e as any).webkitCompassHeading || e.alpha;
      if (heading !== null && heading !== undefined) {
        setDeviceHeading(360 - heading);
      }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    loadLeaflet().then((L: any) => {
      if (!containerRef.current || mapInstanceRef.current) return;

      const map = L.map(containerRef.current, {
        center: [15.9129, 79.74],
        zoom: 7,
        zoomControl: false, // removed — no zoom buttons
      });
      mapInstanceRef.current = map;

      // Bhuvan AP & TG cadastral overlays — TMS=true makes Leaflet flip y automatically
      const apLayer = L.tileLayer(BHUVAN_AP_CAD, {
        tms: true,
        opacity: surveyOpacity,
        minZoom: 13,
        maxZoom: 19,
        attribution: "NRSC Bhuvan AP",
        errorTileUrl: "",
      });
      const tgLayer = L.tileLayer(BHUVAN_TG_CAD, {
        tms: true,
        opacity: surveyOpacity,
        minZoom: 13,
        maxZoom: 19,
        attribution: "NRSC Bhuvan TG",
        errorTileUrl: "",
      });
      apsacLayerRef.current = L.layerGroup([apLayer, tgLayer]);

      // Custom teal pin icon
      const apIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:28px;height:40px;">
          <div style="
            width:26px;height:26px;
            background:#0D5F4E;
            border:3px solid #fff;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 3px 10px rgba(0,0,0,0.35);
            position:absolute;top:0;left:1px;
          "></div>
          <div style="
            position:absolute;top:7px;left:8px;
            width:10px;height:10px;
            background:#fff;
            border-radius:50%;
          "></div>
        </div>`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -42],
      });

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        if (rulerModeRef.current) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setRulerPoints((prev) => [...prev, { latitude: lat, longitude: lng }]);
          return;
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: apIcon }).addTo(map);
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        dropPin(lat, lng);
      });

      if (mapRef) {
        (mapRef as React.MutableRefObject<LandMapWebRef | null>).current = {
          animateToAP: () => map.flyTo([15.9129, 79.74], 7, { duration: 1 }),
        };
      }

      // Add Leaflet scale bar control
      L.control.scale({ position: "bottomleft", metric: true, imperial: false }).addTo(map);

      setMapLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        apsacLayerRef.current = null;
        activeBaseLayerRef.current = null;
        didInit.current = false;
        setMapLoaded(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manage base map types
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (activeBaseLayerRef.current) {
      map.removeLayer(activeBaseLayerRef.current);
      activeBaseLayerRef.current = null;
    }

    const mapContainer = containerRef.current;
    if (mapContainer) {
      if (mapType === "lines") {
        mapContainer.style.background = "#f4f4f5";
      } else if (mapType === "dark") {
        mapContainer.style.background = "#09090b";
      } else {
        mapContainer.style.background = "#aad3df";
      }
    }

    const L = (window as any).L;
    if (L) {
      const url = TILE_LAYERS[mapType];
      const options: any = { maxZoom: 19 };
      if (mapType === "satellite") {
        options.attribution = "Esri World Imagery";
      } else if (mapType === "terrain") {
        options.attribution = "OpenTopoMap";
        options.maxZoom = 17;
      } else if (mapType === "dark") {
        options.attribution = "CartoDB Dark Matter";
      } else if (mapType === "lines") {
        options.attribution = "CartoDB Positron";
      } else {
        options.attribution = "OpenStreetMap";
      }

      const baseLayer = L.tileLayer(url, options);
      baseLayer.addTo(map);
      activeBaseLayerRef.current = baseLayer;
    }
  }, [mapType, mapLoaded]);

  // Manage cadastral overlay visibility
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !apsacLayerRef.current) return;
    const map = mapInstanceRef.current;
    const cadastralLayer = apsacLayerRef.current;

    const updateCadastralVisibility = () => {
      const isVisible = showCadastral || mapType === "lines";
      if (isVisible && map.getZoom() >= 13) {
        if (!map.hasLayer(cadastralLayer)) cadastralLayer.addTo(map);
      } else {
        if (map.hasLayer(cadastralLayer)) map.removeLayer(cadastralLayer);
      }
    };

    map.off("zoomend", updateCadastralVisibility);
    map.on("zoomend", updateCadastralVisibility);
    updateCadastralVisibility();

    return () => {
      map.off("zoomend", updateCadastralVisibility);
    };
  }, [showCadastral, mapType, mapLoaded]);

  // Auto-zoom to level 17 when pin is dropped so survey numbers are readable on the overlay
  useEffect(() => {
    if (droppedPin && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([droppedPin.lat, droppedPin.lng], 17, {
        duration: 0.8,
      });
    }
    // Clear marker when pin is cleared
    if (!droppedPin && markerRef.current && mapInstanceRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [droppedPin, mapLoaded]);

  // Manage browser user location marker on the map
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !userLocation) return;
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!L) return;

    // Pulse blue dot for user location with heading pointing chevron
    const pulsingDotIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <div style="
          width: 14px; height: 14px;
          background: #007AFF;
          border: 2.5px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(0,122,255,0.6);
          position: absolute;
          z-index: 2;
        "></div>
        ${deviceHeading !== null && deviceHeading !== undefined ? `
          <div style="
            position: absolute;
            top: -6px;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 10px solid #007AFF;
            transform: rotate(${deviceHeading}deg);
            transform-origin: 6px 18px;
            opacity: 0.8;
            z-index: 1;
          "></div>
        ` : ""}
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userLocationMarkerRef.current.setIcon(pulsingDotIcon);
    } else {
      userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: pulsingDotIcon }).addTo(map);
    }
  }, [userLocation, mapLoaded, deviceHeading]);

  // Dynamically update survey lines opacity when settings value changes
  useEffect(() => {
    if (apsacLayerRef.current) {
      apsacLayerRef.current.eachLayer((layer: any) => {
        if (layer.setOpacity) {
          layer.setOpacity(surveyOpacity);
        }
      });
    }
  }, [surveyOpacity]);

  // Sync Leaflet layers with rulerPoints state
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!L) return;

    // Remove old ruler layers
    rulerLayersRef.current.forEach((layer) => layer.remove());
    rulerLayersRef.current = [];

    if (rulerPoints.length === 0) return;

    // Inject styling for leaflet tooltip once
    if (!document.getElementById("ruler-tooltip-style")) {
      const style = document.createElement("style");
      style.id = "ruler-tooltip-style";
      style.innerHTML = `
        .ruler-tooltip {
          background: #0D5F4E !important;
          color: #fff !important;
          border: none !important;
          border-radius: 4px !important;
          font-family: 'Inter_600SemiBold', sans-serif !important;
          font-size: 10px !important;
          padding: 2px 6px !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important;
        }
        .ruler-tooltip::before {
          border-top-color: #0D5F4E !important;
        }
      `;
      document.head.appendChild(style);
    }

    // 1. Render Circle Markers for vertices
    const markers = rulerPoints.map((pt, idx) => {
      const marker = L.circleMarker([pt.latitude, pt.longitude], {
        radius: 6,
        fillColor: colors.accent,
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      marker.bindTooltip(`${idx + 1}`, {
        permanent: true,
        direction: "top",
        className: "ruler-tooltip",
        offset: [0, -4]
      });

      return marker;
    });
    rulerLayersRef.current.push(...markers);

    // 2. Render Polyline
    if (rulerPoints.length >= 2) {
      const latlngs = rulerPoints.map((pt) => [pt.latitude, pt.longitude]);
      const polyline = L.polyline(latlngs, {
        color: colors.accent,
        weight: 3,
        dashArray: "6, 6",
      }).addTo(map);
      rulerLayersRef.current.push(polyline);
    }

    // 3. Render Polygon
    if (rulerPoints.length >= 3) {
      const latlngs = rulerPoints.map((pt) => [pt.latitude, pt.longitude]);
      const polygon = L.polygon(latlngs, {
        color: colors.accent,
        weight: 1,
        fillColor: colors.accent,
        fillOpacity: 0.15,
      }).addTo(map);
      rulerLayersRef.current.push(polygon);
    }
  }, [rulerPoints, mapLoaded, colors]);

  const goToUserLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1 });
          }
        },
        () => {
          alert("Could not retrieve location. Enable permissions.");
        }
      );
    } else {
      alert("Location service is not supported by this browser.");
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.wrapper}>
      {/* web-only div */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating Action Buttons Column */}
      <View style={styles.floatingContainer}>
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

        {/* Compass Dial FAB */}
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([15.9129, 79.74], 7, { duration: 1 });
            }
          }}
          style={({ pressed }) => [
            styles.compassFab,
            {
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

        {/* Locate FAB */}
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
        <View style={styles.menuCardContainer}>
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

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
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
