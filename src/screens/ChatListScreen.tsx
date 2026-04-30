// 用户列表 / 会话列表
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { theme } from "../theme";
import { useApp } from "../contexts/AppContext";
import { api, chatSocket } from "../services/api";
import Avatar from "../components/Avatar";
import Glass from "../components/Glass";

interface Props {
  onSelectUser: (userId: number, username: string) => void;
  onLogout: () => void;
}

export default function ChatListScreen({ onSelectUser, onLogout }: Props) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<"chats" | "users">("chats");

  useEffect(() => {
    // 获取用户列表
    const timer = setTimeout(() => {
      api.getUsers().catch(() => {});
    }, 500);

    const unsub = chatSocket.on("user_list", (data) => {
      dispatch({ type: "SET_USERS", payload: data.data.users });
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const renderUserItem = (user: any) => {
    if (user.id === state.user?.id) return null; // 不显示自己

    const hasSession = state.chatSessions.find(
      (s) => s.id === user.id && s.type === "user"
    );
    const unread = hasSession?.unread || 0;
    const lastMsg = hasSession?.messages[hasSession.messages.length - 1];

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => {
          onSelectUser(user.id, user.username);
          dispatch({ type: "ADD_SESSION", payload: {
            id: user.id,
            name: user.username,
            type: "user",
            messages: [],
            unread: 0,
          }});
        }}
      >
        <Avatar
          name={user.username}
          size={52}
          online={user.online}
          showStatus
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username} numberOfLines={1}>
              {user.username}
            </Text>
            {user.online && (
              <View style={styles.onlineDot} />
            )}
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {lastMsg
              ? lastMsg.content
              : user.online
              ? "在线"
              : "离线"}
          </Text>
        </View>
        <View style={styles.rightCol}>
          {lastMsg && (
            <Text style={styles.time}>
              {new Date(lastMsg.created_at * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
          {user.network_type ? (
            <Text style={styles.networkInfo} numberOfLines={1}>
              {user.network_type} · {user.location}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const data =
    tab === "chats"
      ? state.chatSessions.filter((s) => s.type === "user")
      : state.users;

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PrivateChat</Text>
        <View style={styles.headerRight}>
          <View style={styles.connectionDot}>
            <View
              style={[
                styles.dot,
                { backgroundColor: state.isConnected ? theme.colors.success : theme.colors.danger },
              ]}
            />
          </View>
          {state.user && (
            <Avatar name={state.user.username} size={32} />
          )}
        </View>
      </View>

      {/* 选项卡 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === "chats" && styles.tabActive]}
          onPress={() => setTab("chats")}
        >
          <Text style={[styles.tabText, tab === "chats" && styles.tabTextActive]}>
            会话
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "users" && styles.tabActive]}
          onPress={() => {
            setTab("users");
            api.getUsers();
          }}
        >
          <Text style={[styles.tabText, tab === "users" && styles.tabTextActive]}>
            联系人
          </Text>
        </TouchableOpacity>
      </View>

      {/* 列表 */}
      <FlatList
        data={data}
        keyExtractor={(item: any) => String(item.id || item.user_id)}
        renderItem={({ item }) => renderUserItem(item)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{tab === "chats" ? "💬" : "👥"}</Text>
            <Text style={styles.emptyText}>
              {tab === "chats" ? "暂无会话" : "暂无联系人"}
            </Text>
          </View>
        }
      />

      {/* 底部操作 */}
      <Glass style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBtn} onPress={onLogout}>
          <Text style={styles.bottomBtnText}>退出登录</Text>
        </TouchableOpacity>
      </Glass>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: "800", color: theme.colors.text },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  connectionDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.radius.sm,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: theme.radius.md,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: { fontSize: theme.fontSize.md, fontWeight: "600", color: theme.colors.text },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.online,
  },
  lastMsg: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: "flex-end", gap: 4 },
  time: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  networkInfo: { fontSize: 10, color: theme.colors.textMuted, maxWidth: 100 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: theme.fontSize.md },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
    padding: 12,
    margin: 0,
  },
  bottomBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  bottomBtnText: { color: theme.colors.danger, fontSize: theme.fontSize.sm, fontWeight: "600" },
});
