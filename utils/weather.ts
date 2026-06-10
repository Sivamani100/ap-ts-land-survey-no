/**
 * Agricultural Weather & Elevation Services (Open-Meteo integration)
 */

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherString: string;
  weatherIcon: string;
  elevation: number; // Elevation in meters
  advisory: string; // Dynamic agricultural advice
  forecast: Array<{
    day: string;
    maxTemp: number;
    minTemp: number;
    precipProb: number;
  }>;
}

const WMO_CODE_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: "Clear Sky", icon: "sunny" },
  1: { text: "Mainly Clear", icon: "sunny-outline" },
  2: { text: "Partly Cloudy", icon: "cloudy-outline" },
  3: { text: "Overcast", icon: "cloudy" },
  45: { text: "Foggy", icon: "reorder-three" },
  48: { text: "Depositing Rime Fog", icon: "reorder-three-outline" },
  51: { text: "Light Drizzle", icon: "rainy-outline" },
  53: { text: "Moderate Drizzle", icon: "rainy" },
  55: { text: "Dense Drizzle", icon: "rainy" },
  61: { text: "Slight Rain", icon: "rainy-outline" },
  63: { text: "Moderate Rain", icon: "rainy" },
  65: { text: "Heavy Rain", icon: "thunderstorm" },
  71: { text: "Slight Snow Fall", icon: "snow" },
  73: { text: "Moderate Snow Fall", icon: "snow" },
  75: { text: "Heavy Snow Fall", icon: "snow" },
  80: { text: "Slight Showers", icon: "rainy-outline" },
  81: { text: "Moderate Showers", icon: "rainy" },
  82: { text: "Heavy Showers", icon: "thunderstorm" },
  95: { text: "Thunderstorm", icon: "thunderstorm-outline" },
  96: { text: "Thunderstorm with Hail", icon: "thunderstorm" },
  99: { text: "Severe Thunderstorm", icon: "thunderstorm" },
};

/**
 * Maps a WMO weather code to text and Ionicons name.
 */
export function parseWeatherCode(code: number): { text: string; icon: string } {
  return WMO_CODE_MAP[code] || { text: "Unknown Weather", icon: "partly-sunny" };
}

/**
 * Fetches elevation above Mean Sea Level (MSL) in meters.
 */
export async function fetchElevation(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Elevation request failed");
    const data = await res.json();
    return data.elevation?.[0] || 0;
  } catch (err) {
    console.error("Failed to fetch elevation:", err);
    return 0;
  }
}

/**
 * Fetches agricultural weather data and generates crop suitability advisories.
 */
export async function fetchAgriWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    // 1. Fetch Elevation and Weather concurrently
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    
    const [elevation, weatherRes] = await Promise.all([
      fetchElevation(lat, lng).catch(() => 0),
      fetch(weatherUrl),
    ]);

    if (!weatherRes.ok) throw new Error("Weather request failed");
    const wData = await weatherRes.json();

    // 2. Extract current weather metrics
    const current = wData.current || {};
    const temp = current.temperature_2m ?? 0;
    const humidity = current.relative_humidity_2m ?? 0;
    const windSpeed = current.wind_speed_10m ?? 0;
    const weatherCode = current.weather_code ?? 0;
    const { text: weatherString, icon: weatherIcon } = parseWeatherCode(weatherCode);

    // 3. Generate dynamic advisory for farming/surveying
    let advisory = "";
    const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weatherCode);
    const rainProbNextDays = wData.daily?.precipitation_probability_max || [];
    const willRainSoon = rainProbNextDays.slice(0, 2).some((p: number) => p > 50);

    if (windSpeed > 15) {
      advisory = "⚠️ High winds alert. Postpone crop spraying/pesticides to avoid chemical drift. Survey details might be harder to walk.";
    } else if (isRainy) {
      advisory = "🌧️ Active precipitation. Postpone chemical spraying & open-air surveys. Ensure drainage channels are clear in low-lying plots.";
    } else if (temp > 38) {
      advisory = "🔥 Extreme heat detected. Irrigate fields early morning/evening. Avoid strenuous outdoor survey walking during peak noon.";
    } else if (temp < 10) {
      advisory = "❄️ Low temperatures. Monitor frost-sensitive vegetables. General conditions are fair for surveying.";
    } else if (willRainSoon) {
      advisory = "☁️ Rain expected in next 24-48 hours. Good timing for fertilizer application before rain, but postpone immediate pesticide spraying.";
    } else {
      advisory = "✅ Weather conditions are highly optimal for surveying boundary markers, crop weeding, and routine pesticide spraying.";
    }

    // 4. Parse daily forecast
    const daily = wData.daily || {};
    const days = daily.time || [];
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const precipProbs = daily.precipitation_probability_max || [];

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const forecast = days.slice(1, 4).map((timeStr: string, idx: number) => {
      const date = new Date(timeStr);
      const dayName = weekdayNames[date.getDay()];
      // API offset index is +1 because we skipped day 0 (today)
      const offsetIdx = idx + 1;
      return {
        day: dayName,
        maxTemp: Math.round(maxTemps[offsetIdx] || temp),
        minTemp: Math.round(minTemps[offsetIdx] || temp),
        precipProb: precipProbs[offsetIdx] || 0,
      };
    });

    return {
      temp: Math.round(temp),
      humidity,
      windSpeed: Math.round(windSpeed),
      weatherCode,
      weatherString,
      weatherIcon,
      elevation,
      advisory,
      forecast,
    };
  } catch (err) {
    console.error("Failed to fetch agri weather:", err);
    return null;
  }
}
