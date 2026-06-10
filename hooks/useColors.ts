import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { useLand } from "@/context/LandContext";

/**
 * Returns the design tokens for the current color scheme.
 * Supports light, dark, and system schemes.
 */
export function useColors() {
  const systemScheme = useColorScheme();
  let activeScheme: "light" | "dark" = "light";

  try {
    const context = useLand();
    if (context && context.theme) {
      if (context.theme === "system") {
        activeScheme = systemScheme === "dark" ? "dark" : "light";
      } else {
        activeScheme = context.theme === "dark" ? "dark" : "light";
      }
    } else {
      activeScheme = systemScheme === "dark" ? "dark" : "light";
    }
  } catch {
    activeScheme = systemScheme === "dark" ? "dark" : "light";
  }

  const palette =
    activeScheme === "dark" && "dark" in colors
      ? (colors as any).dark
      : colors.light;

  return { ...palette, radius: colors.radius };
}
