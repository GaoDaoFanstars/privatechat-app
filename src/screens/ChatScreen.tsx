// 聊天界面 - 完整版（语音、图片、群聊）
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../theme";
import { useApp } from "../contexts/AppContext";
import { api, chatSocket, getMediaUrl } from "../services/api";
import MessageBubble from "../components/MessageBubble";
import Avatar from "../components/Avatar";
import VoiceRecorder from "../components/VoiceRecorder";

interface Props {
  userId?: number;
  groupId?: number;
  sessionName: string;
  onBack: () => void;
}

export default function ChatScreen({ userId, groupId, sessionName, onBack }: Props) {
  const { state, dispatch } = useApp();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const isGroup = !!groupId;
  const sessionId = groupId || userId || 0;

  const session = state.chatSessions.find(
    (s) => s.id === sessionId && s.type === (isGroup ? "group" : "user")
  );
  const messages = session?.messages || [];

  // 加载历史消息
  useEffect(() => {
    const load = async () => {
      try {
        const msgs = isGroup
          ? await api.getGroupMessages(groupId!)
          : await api.getChatMessages(userId!);
        dispatch({ type: "SET_SESSION_MESSAGES", payload: { id: sessionId, messages: msgs } });
      } catch (e) {}
    };
    load();
  }, [sessionId]);

  // 新消息自动滚底
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  // 发送文字
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;
    if (isGroup) {
      api.sendGroupMessage(groupId!, text);
    } else {
      api.sendMessage(userId!, text);
    }
    setInputText("");
  };

  // 消息长按操作
  const handleLongPress = useCallback((msg: any) => {
    if (msg.sender_id !== state.user?.id) return;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["撤回（1分钟内）", "删除", "取消"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (i) => {
          if (i === 0) api.recallMessage(msg.id);
          if (i === 1) api.deleteMessage(msg.id);
        }
      );
    } else {
      Alert.alert("消息操作", "", [
        { text: "撤回", onPress: () => api.recallMessage(msg.id) },
        { text: "删除", onPress: () => api.deleteMessage(msg.id), style: "destructive" },
        { text: "取消", style: "cancel" },
      ]);
    }
  }, [state.user?.id]);

  // 发送图片
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("权限", "需要相册权限");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.fileName || "photo.jpg",
      type: file.mimeType || "image/jpeg",
    } as any);

    try {
      const res = await fetch(`http://38.76.208.101:8080/`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (isGroup) {
        api.sendGroupMessage(groupId!, "[图片]", "image", data.url);
      } else {
        api.sendMessage(userId!, "[图片]", "image", data.url);
      }
    } catch (e) {
      Alert.alert("错误", "图片上传失败");
    }
  };

  // 发送语音
  const sendVoice = async (fileUri: string, duration: number) => {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: `voice_${Date.now()}.m4a`,
      type: "audio/m4a",
    } as any);

    try {
      const res = await fetch(`http://38.76.208.101:8080/`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (isGroup) {
        api.sendGroupMessage(groupId!, `${duration}秒`, "voice", data.url);
      } else {
        api.sendMessage(userId!, `${duration}秒`, "voice", data.url);
      }
    } catch (e) {
      Alert.alert("错误", "语音上传失败");
    }
  };

  const targetUser = state.users.find((u) => u.id === userId);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Avatar
          name={sessionName}
          size={36}
          online={targetUser?.online}
          showStatus={!isGroup}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {sessionName}
            {isGroup ? " 👥" : ""}
          </Text>
          {!isGroup && targetUser && (
            <Text style={styles.headerStatus}>
              {targetUser.online ? "在线" : "离线"}
              {targetUser.network_type ? ` · ${targetUser.network_type}` : ""}
              {targetUser.location ? ` · ${targetUser.location}` : ""}
            </Text>
          )}
        </View>
      </View>

      {/* 消息列表 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View>
              {/* 群聊显示发送者名 */}
              {isGroup && item.sender_id !== state.user?.id && (
                <Text style={styles.senderName}>{item.sender_username}</Text>
              )}
              <MessageBubble
                message={item}
                isMine={item.sender_id === state.user?.id}
                onLongPress={() => handleLongPress(item)}
              />
            </View>
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* 输入区域 */}
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={pickImage} style={styles.imageBtn}>
            <Text style={styles.imageIcon}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入消息..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={5000}
          />
          {inputText.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          ) : (
            <VoiceRecorder onSendVoice={sendVoice} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backBtn: { padding: 8, marginRight: 4 },
  backIcon: { fontSize: 22, color: theme.colors.text, fontWeight: "600" },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: theme.fontSize.md, fontWeight: "700", color: theme.colors.text },
  headerStatus: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 1 },
  senderName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    marginLeft: 4,
    marginTop: 4,
    fontWeight: "600",
  },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.bg,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  imageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  imageIcon: { fontSize: 18 },
});
