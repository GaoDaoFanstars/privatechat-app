// 登录/注册屏幕
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { theme } from "../theme";
import { api, chatSocket } from "../services/api";
import { useApp } from "../contexts/AppContext";

export default function LoginScreen() {
  const { dispatch } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("提示", "请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      const data = isLogin
        ? await api.login(username.trim(), password)
        : await api.register(username.trim(), password);

      dispatch({ type: "SET_USER", payload: data });
      chatSocket.connect(data.id, data.token, data.username);
    } catch (err: any) {
      Alert.alert("错误", err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.overlay}>
        {/* Logo 区域 */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>💬</Text>
          </View>
          <Text style={styles.title}>PrivateChat</Text>
          <Text style={styles.subtitle}>端到端加密 · 隐私聊天</Text>
        </View>

        {/* 输入表单 */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="用户名"
            placeholderTextColor={theme.colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="密码"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "请稍候..." : isLogin ? "登录" : "注册"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchText}>
              {isLogin ? "没有账号？立即注册" : "已有账号？去登录"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 底部信息 */}
        <Text style={styles.footer}>🔒 端到端加密 · 仅本地处理</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: 12,
  },
  input: {
    height: 52,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  button: {
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
  },
  switchBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  switchText: {
    color: theme.colors.primaryLight,
    fontSize: theme.fontSize.sm,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 48,
  },
});
