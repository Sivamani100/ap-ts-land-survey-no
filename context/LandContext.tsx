import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Region } from "react-native-maps";
import { getAdminHierarchy } from "@/utils/overpass";
import { reverseGeocode } from "@/utils/nominatim";
import { getSurveyNo } from "@/utils/bhuvan";
import {
  saveRecord,
  getAppTheme,
  saveAppTheme,
  getCoordsFormat,
  saveCoordsFormat,
  getSurveyOpacity,
  saveSurveyOpacity,
} from "@/utils/storage";
import type { LandRecord, AppTheme, CoordsFormat } from "@/utils/storage";

export type LookupStatus =
  | "idle"
  | "geocoding"
  | "admin"
  | "survey"
  | "done"
  | "error";

export type MapType = "standard" | "satellite" | "terrain" | "dark" | "lines";

interface DroppedPin {
  lat: number;
  lng: number;
}

interface LandState {
  droppedPin: DroppedPin | null;
  status: LookupStatus;
  statusMsg: string;
  errorMsg: string;
  record: Partial<LandRecord> | null;
  mapRegion: Region;
  mapType: MapType;
  showCadastral: boolean;
  isVillageView: boolean;
  theme: AppTheme;
  coordsFormat: CoordsFormat;
  surveyOpacity: number;
}

interface LandContextValue extends LandState {
  dropPin: (lat: number, lng: number) => Promise<void>;
  clearPin: () => void;
  saveCurrentRecord: () => Promise<void>;
  setMapRegion: (region: Region) => void;
  setRecord: React.Dispatch<React.SetStateAction<Partial<LandRecord> | null>>;
  setMapType: (type: MapType) => void;
  setShowCadastral: (show: boolean) => void;
  setIsVillageView: (val: boolean) => void;
  setTheme: (theme: AppTheme) => Promise<void>;
  setCoordsFormat: (format: CoordsFormat) => Promise<void>;
  setSurveyOpacity: (opacity: number) => Promise<void>;
}

const DEFAULT_REGION: Region = {
  latitude: 15.9129,
  longitude: 79.74,
  latitudeDelta: 4.5,
  longitudeDelta: 4.5,
};

const LandContext = createContext<LandContextValue | null>(null);

export function LandProvider({ children }: { children: React.ReactNode }) {
  const [droppedPin, setDroppedPin] = useState<DroppedPin | null>(null);
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [record, setRecord] = useState<Partial<LandRecord> | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapType, setMapType] = useState<MapType>("standard");
  const [showCadastral, setShowCadastral] = useState(true);
  const [isVillageView, setIsVillageView] = useState(false);

  const [theme, setThemeState] = useState<AppTheme>("system");
  const [coordsFormat, setCoordsFormatState] = useState<CoordsFormat>("DD");
  const [surveyOpacity, setSurveyOpacityState] = useState<number>(0.85);

  useEffect(() => {
    getAppTheme().then(setThemeState);
    getCoordsFormat().then(setCoordsFormatState);
    getSurveyOpacity().then(setSurveyOpacityState);
  }, []);

  const setTheme = useCallback(async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    await saveAppTheme(newTheme);
  }, []);

  const setCoordsFormat = useCallback(async (newFormat: CoordsFormat) => {
    setCoordsFormatState(newFormat);
    await saveCoordsFormat(newFormat);
  }, []);

  const setSurveyOpacity = useCallback(async (newOpacity: number) => {
    setSurveyOpacityState(newOpacity);
    await saveSurveyOpacity(newOpacity);
  }, []);

  const clearPin = useCallback(() => {
    setDroppedPin(null);
    setStatus("idle");
    setRecord(null);
    setErrorMsg("");
    setStatusMsg("");
  }, []);

  const dropPin = useCallback(async (lat: number, lng: number) => {
    setDroppedPin({ lat, lng });
    setStatus("geocoding");
    setStatusMsg("Reverse geocoding…");
    setRecord(null);
    setErrorMsg("");

    try {
      // Step 1: Nominatim for fine-grained location (village/place name)
      const geo = await reverseGeocode(lat, lng);

      // Step 2: Overpass for admin hierarchy (state/district/mandal)
      setStatus("admin");
      setStatusMsg("Looking up admin boundaries…");
      const admin = await getAdminHierarchy(lat, lng);

      // Step 3: Bhuvan cadastral – fetch survey/parcel number (par_num)
      setStatus("survey");
      setStatusMsg("Fetching survey number…");
      const surveyNo = await getSurveyNo(lat, lng, admin.district || "", admin.state || "");

      const id =
        Date.now().toString() +
        Math.random().toString(36).substring(2, 9);

      const rec: Partial<LandRecord> = {
        id,
        lat,
        lng,
        timestamp: Date.now(),
        displayName: geo.displayName,
        // Prefer Overpass admin data (more reliable for AP)
        state: admin.state || "Andhra Pradesh",
        district: admin.district,
        mandal: admin.mandal,
        village: admin.village || geo.village,
        // Survey number from Bhuvan cadastral (null if district not in coverage)
        surveyNo: surveyNo || "",
        areaAcres: "",
        landUse: "",
        layerName: "",
        pinSource: "map",
      };

      setRecord(rec);
      setStatus("done");
      setStatusMsg("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrorMsg(msg);
      setStatus("error");
      setStatusMsg("");
    }
  }, []);

  const saveCurrentRecord = useCallback(async () => {
    if (record && record.id) {
      await saveRecord(record as LandRecord);
    }
  }, [record]);

  return (
    <LandContext.Provider
      value={{
        droppedPin,
        status,
        statusMsg,
        errorMsg,
        record,
        mapRegion,
        mapType,
        showCadastral,
        isVillageView,
        theme,
        coordsFormat,
        surveyOpacity,
        dropPin,
        clearPin,
        saveCurrentRecord,
        setMapRegion,
        setRecord,
        setMapType,
        setShowCadastral,
        setIsVillageView,
        setTheme,
        setCoordsFormat,
        setSurveyOpacity,
      }}
    >
      {children}
    </LandContext.Provider>
  );
}

export function useLand() {
  const ctx = useContext(LandContext);
  if (!ctx) throw new Error("useLand must be used inside LandProvider");
  return ctx;
}
