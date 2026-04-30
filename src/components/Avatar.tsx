// 头像组件（带在线状态）
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
  showStatus?: boolean;
}

function getInitials(name: string) {
  return name.charAt(0).toUpperCase();
}

function getColor(name: string) {
  const colors = ["#6c63ff", "#e94560", "#2ed573", "#ffa502", "#1e90ff",
    "#ff6b6b", "#a29bfe", "#00cec9", "#fd79a8", "#fdcb6e"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ name, size = 44, online, showStatus = false }: AvatarProps) {
  const bg = getColor(name);
  const fontSize = size * 0.42;

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize }]}>
          {getInitials(name)}
        </Text>
      </View>
      {showStatus && (
        <View
          style={[
            styles.status,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              backgroundColor: online ? theme.colors.online : theme.colors.offline,
              borderWidth: 2,
              borderColor: theme.colors.bg,
              right: -1,
              bottom: -1,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "700",
  },
  status: {
    position: "absolute",
  },
});
