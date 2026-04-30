// 毛玻璃容器组件
import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../theme";

interface GlassProps {
  children: ReactNode;
  style?: ViewStyle;
}

export default function Glass({ children, style }: GlassProps) {
  return (
    <View style={[styles.glass, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
});
