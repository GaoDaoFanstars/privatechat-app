// 指纹锁页面
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { theme } from "../theme";
import { useApp } from "../contexts/AppContext";

interface Props {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: Props) {
  const [supported, setSupported] = useState(true);
  const [attempting, setAttempting] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(compatible && enrolled);
    } catch (e) {
      setSupported(false);
    }
  };

  const authenticate = async () => {
    if (attempting) return;
    setAttempting(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "解锁 PrivateChat",
        fallbackLabel: "使用密码",
        cancelLabel: "取消",
        disableDeviceFallback: false,
      });

      if (result.success) {
        onUnlock();
      }
    } catch (e) {
      // 用户取消
    } finally {
      setAttempting(false);
    }
  };

  // App 启动时自动验证
  useEffect(() => {
    const t = setTimeout(authenticate, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconArea}>
        <View style={styles.lockCircle}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      </View>

      <Text style={styles.title}>PrivateChat</Text>
      <Text style={styles.subtitle}>已锁定</Text>

      {supported ? (
        <>
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={authenticate}
            disabled={attempting}
          >
            <Text style={styles.unlockBtnText}>
              {attempting ? "验证中..." : "点击解锁"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>使用指纹或面容解锁</Text>
        </>
      ) : (
        <>
          <Text style={styles.noBio}>设备不支持生物识别</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock}>
            <Text style={styles.unlockBtnText}>直接进入</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.footer}>端到端加密 · 隐私聊天</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconArea: { marginBottom: 24 },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  lockIcon: { fontSize: 36 },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: 40,
  },
  unlockBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  unlockBtnText: {
    color: "#fff",
    fontSize: theme.fontSize.md,
    fontWeight: "700",
  },
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  noBio: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  footer: {
    position: "absolute",
    bottom: 48,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
