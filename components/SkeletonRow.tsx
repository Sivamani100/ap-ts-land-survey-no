import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function SkeletonRow({ wide = false }: { wide?: boolean }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim]);

  return (
    <View style={styles.row}>
      <Animated.View
        style={[
          styles.label,
          { backgroundColor: colors.skeleton, opacity: anim },
        ]}
      />
      <Animated.View
        style={[
          styles.value,
          {
            backgroundColor: colors.skeleton,
            opacity: anim,
            width: wide ? "60%" : "40%",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  label: {
    height: 12,
    width: "30%",
    borderRadius: 6,
  },
  value: {
    height: 12,
    borderRadius: 6,
  },
});
