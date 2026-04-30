// 消息气泡组件
import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme";
import { Message } from "../contexts/AppContext";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  onLongPress?: () => void;
}

export default function MessageBubble({ message, isMine, onLongPress }: MessageBubbleProps) {
  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const renderContent = () => {
    if (message.recalled) {
      return (
        <Text style={[styles.recalledText, isMine && styles.myRecalled]}>
          [消息已撤回]
        </Text>
      );
    }

    switch (message.msg_type) {
      case "image":
        return (
          <Image
            source={{ uri: message.media_url }}
            style={styles.image}
            resizeMode="cover"
          />
        );
      case "voice":
        return (
          <View style={styles.voiceRow}>
            <Text style={[styles.voiceIcon, isMine ? styles.myText : styles.theirText]}>
              🎤
            </Text>
            <Text style={[styles.voiceText, isMine ? styles.myText : styles.theirText]}>
              {message.content || "语音消息"}
            </Text>
          </View>
        );
      default:
        return (
          <Text style={[styles.text, isMine ? styles.myText : styles.theirText]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      style={[
        styles.container,
        isMine ? styles.myContainer : styles.theirContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.myBubble : styles.theirBubble,
        ]}
      >
        {renderContent()}
      </View>
      <Text style={[styles.time, isMine && styles.myTime]}>
        {formatTime(message.created_at)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  myContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  theirContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
  },
  myBubble: {
    backgroundColor: theme.colors.myMessage,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: theme.colors.theirMessage,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  myText: {
    color: "#fff",
  },
  theirText: {
    color: theme.colors.text,
  },
  recalledText: {
    fontStyle: "italic",
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  myRecalled: {
    color: "rgba(255,255,255,0.5)",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: theme.radius.sm,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voiceIcon: {
    fontSize: 18,
  },
  voiceText: {
    fontSize: theme.fontSize.md,
  },
  time: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginHorizontal: 4,
  },
  myTime: {
    textAlign: "right",
  },
});
