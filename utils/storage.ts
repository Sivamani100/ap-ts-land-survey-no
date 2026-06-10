import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "ap_land_history_v2";

export interface LandRecord {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  displayName: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  surveyNo: string;
  areaAcres: string;
  landUse: string;
  layerName: string;
  pinSource: string;
  customTitle?: string;
  customNotes?: string;
}

export async function getHistory(): Promise<LandRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LandRecord[];
  } catch {
    return [];
  }
}

export async function saveRecord(record: LandRecord): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((r) => r.id !== record.id);
  const updated = [record, ...filtered].slice(0, 50);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function updateRecord(record: LandRecord): Promise<void> {
  const history = await getHistory();
  const updated = history.map((r) => (r.id === record.id ? record : r));
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function deleteRecord(id: string): Promise<void> {
  const history = await getHistory();
  const updated = history.filter((r) => r.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

const THEME_KEY = "ap_land_theme";
const COORDS_FORMAT_KEY = "ap_land_coords_format";
const SURVEY_OPACITY_KEY = "ap_land_survey_opacity";

export type AppTheme = "light" | "dark" | "system";
export type CoordsFormat = "DD" | "DMS";

export async function getAppTheme(): Promise<AppTheme> {
  try {
    const val = await AsyncStorage.getItem(THEME_KEY);
    return (val as AppTheme) || "system";
  } catch {
    return "system";
  }
}

export async function saveAppTheme(theme: AppTheme): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, theme);
}

export async function getCoordsFormat(): Promise<CoordsFormat> {
  try {
    const val = await AsyncStorage.getItem(COORDS_FORMAT_KEY);
    return (val as CoordsFormat) || "DD";
  } catch {
    return "DD";
  }
}

export async function saveCoordsFormat(format: CoordsFormat): Promise<void> {
  await AsyncStorage.setItem(COORDS_FORMAT_KEY, format);
}

export async function getSurveyOpacity(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(SURVEY_OPACITY_KEY);
    return val ? parseFloat(val) : 0.85;
  } catch {
    return 0.85;
  }
}

export async function saveSurveyOpacity(opacity: number): Promise<void> {
  await AsyncStorage.setItem(SURVEY_OPACITY_KEY, opacity.toString());
}
