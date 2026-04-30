// 语音录制按钮
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { theme } from "../theme";

interface VoiceRecorderProps {
  onSendVoice: (fileUri: string, duration: number) => void;
}

export default function VoiceRecorder({ onSendVoice }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  const startRecording = async () => {
    try {
      // React Native 中使用 Audio 录音
      const { Audio } = require("expo-av");
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("权限", "需要麦克风权限才能录音");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      (global as any).__recording = recording;

      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (e) {
      Alert.alert("错误", "无法启动录音");
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const recording = (global as any).__recording;
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
      (global as any).__recording = null;

      setIsRecording(false);

      if (dur < 1) {
        Alert.alert("录音太短", "请至少录制1秒");
        return;
      }

      onSendVoice(uri, dur);
    } catch (e) {
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const recording = (global as any).__recording;
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
    }
    (global as any).__recording = null;
    setIsRecording(false);
    setDuration(0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelBtn}>
          <Text style={styles.cancelIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>{formatTime(duration)}</Text>
        </View>
        <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
          <View style={styles.stopIcon} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={startRecording} style={styles.micBtn}>
      <Text style={styles.micIcon}>🎤</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  micIcon: { fontSize: 18 },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.danger,
  },
  recordingText: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: theme.colors.danger,
  },
});
