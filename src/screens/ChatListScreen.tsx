// 会话/联系人列表 - 完整版（群聊、创建群组）
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
} from "react-native";
import { theme } from "../theme";
import { useApp } from "../contexts/AppContext";
import { api, chatSocket } from "../services/api";
import Avatar from "../components/Avatar";
import Glass from "../components/Glass";

interface Props {
  onStartChat: (userId: number, username: string) => void;
  onOpenGroup: (groupId: number, groupName: string) => void;
  onLogout: () => void;
}

export default function ChatListScreen({ onStartChat, onOpenGroup, onLogout }: Props) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<"chats" | "users" | "groups">("chats");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api.getUsers().catch(() => {});
      api.getGroups().then((g) => {
        dispatch({ type: "SET_GROUPS", payload: g || [] });
      }).catch(() => {});
    }, 500);

    const unsub = chatSocket.on("user_list", (data) => {
      dispatch({ type: "SET_USERS", payload: data.data.users });
    });

    return () => { clearTimeout(t); unsub(); };
  }, []);

  // 合并会话列表（私聊+群聊）
  const chatSessions = [
    ...state.chatSessions.filter((s) => s.type === "user"),
    ...state.groups.map((g) => {
      const existing = state.chatSessions.find((s) => s.id === g.id && s.type === "group");
      return {
        id: g.id,
        name: g.name,
        type: "group" as const,
        messages: existing?.messages || [],
        unread: existing?.unread || 0,
      };
    }),
  ].sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.created_at || 0;
    const bLast = b.messages[b.messages.length - 1]?.created_at || 0;
    return bLast - aLast;
  });

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("提示", "请输入群组名称");
      return;
    }
    if (selectedMembers.length < 1) {
      Alert.alert("提示", "请至少选择一个成员");
      return;
    }
    try {
      const g = await api.createGroup(groupName.trim(), selectedMembers);
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      onOpenGroup(g.id, g.name);
    } catch (e: any) {
      Alert.alert("错误", e.message);
    }
  };

  const renderUserItem = (user: any) => {
    if (user.id === state.user?.id) return null;
    const hasSession = state.chatSessions.find((s) => s.id === user.id && s.type === "user");
    const unread = hasSession?.unread || 0;
    const lastMsg = hasSession?.messages[hasSession.messages.length - 1];

    return (
      <TouchableOpacity
        key={user.id}
        style={styles.userItem}
        onPress={() => {
          onStartChat(user.id, user.username);
          dispatch({
            type: "ADD_SESSION",
            payload: { id: user.id, name: user.username, type: "user", messages: [], unread: 0 },
          });
          dispatch({ type: "SET_ACTIVE_SESSION", payload: user.id });
        }}
      >
        <Avatar name={user.username} size={52} online={user.online} showStatus />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username} numberOfLines={1}>{user.username}</Text>
            {user.online && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {lastMsg ? (lastMsg.msg_type === "image" ? "[图片]" : lastMsg.msg_type === "voice" ? "[语音]" : lastMsg.content) : user.online ? "在线" : "离线"}
          </Text>
        </View>
        <View style={styles.rightCol}>
          {lastMsg && (
            <Text style={styles.time}>
              {new Date(lastMsg.created_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          )}
          {user.network_type ? (
            <Text style={styles.networkInfo}>{user.network_type} · {user.location}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = (group: any) => {
    const sess = state.chatSessions.find((s) => s.id === group.id && s.type === "group");
    const unread = sess?.unread || 0;
    const lastMsg = sess?.messages[sess.messages.length - 1];

    return (
      <TouchableOpacity
        key={group.id}
        style={styles.userItem}
        onPress={() => onOpenGroup(group.id, group.name)}
      >
        <View style={[styles.groupAvatar, { backgroundColor: theme.colors.secondary }]}>
          <Text style={styles.groupIcon}>👥</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {lastMsg ? (lastMsg.msg_type === "image" ? "[图片]" : lastMsg.msg_type === "voice" ? "[语音]" : lastMsg.content) : "暂无消息"}
          </Text>
        </View>
        <View style={styles.rightCol}>
          {lastMsg && (
            <Text style={styles.time}>
              {new Date(lastMsg.created_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 创建群组的模态框中的成员选择
  const renderMemberSelect = (user: any) => {
    if (user.id === state.user?.id) return null;
    const selected = selectedMembers.includes(user.id);
    return (
      <TouchableOpacity
        key={user.id}
        style={styles.memberItem}
        onPress={() => {
          setSelectedMembers((prev) =>
            selected ? prev.filter((id) => id !== user.id) : [...prev, user.id]
          );
        }}
      >
        <Avatar name={user.username} size={36} />
        <Text style={styles.memberName}>{user.username}</Text>
        <View
          style={[
            styles.checkbox,
            selected && { backgroundColor: theme.colors.primary },
          ]}
        >
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const data = tab === "chats" ? chatSessions : tab === "groups" ? state.groups : state.users;

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PrivateChat</Text>
        <View style={styles.headerRight}>
          <View style={styles.connectionDot}>
            <View style={[styles.dot, { backgroundColor: state.isConnected ? theme.colors.success : theme.colors.danger }]} />
          </View>
          {state.user && <Avatar name={state.user.username} size={32} />}
        </View>
      </View>

      {/* 选项卡 */}
      <View style={styles.tabBar}>
        {(["chats", "users", "groups"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { setTab(t); if (t === "users" || t === "groups") api.getUsers(); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "chats" ? "会话" : t === "users" ? "联系人" : "群聊"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 创建群聊按钮 */}
      {tab === "groups" && (
        <TouchableOpacity
          style={styles.createGroupBtn}
          onPress={() => setShowCreateGroup(true)}
        >
          <Text style={styles.createGroupText}>+ 创建群聊</Text>
        </TouchableOpacity>
      )}

      {/* 列表 */}
      <FlatList
        data={data}
        keyExtractor={(item: any) => String(item.id || item.user_id)}
        renderItem={({ item }) =>
          tab === "groups" ? renderGroupItem(item) : renderUserItem(item)
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {tab === "chats" ? "💬" : tab === "groups" ? "👥" : "📇"}
            </Text>
            <Text style={styles.emptyText}>
              {tab === "chats" ? "暂无会话" : tab === "groups" ? "暂无群聊" : "暂无联系人"}
            </Text>
          </View>
        }
      />

      {/* 退出登录 */}
      <Glass style={styles.bottomBar}>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </Glass>

      {/* 创建群聊模态框 */}
      <Modal visible={showCreateGroup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Glass style={styles.modalContent}>
            <Text style={styles.modalTitle}>创建群聊</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="群组名称"
              placeholderTextColor={theme.colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={styles.modalSubtitle}>选择成员：</Text>
            <FlatList
              data={state.users}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => renderMemberSelect(item)}
              style={{ maxHeight: 300 }}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCreateGroup(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={createGroup}>
                <Text style={styles.modalConfirmText}>创建</Text>
              </TouchableOpacity>
            </View>
          </Glass>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 需要引入 TextInput
import { TextInput } from "react-native";

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
    width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.glass,
    justifyContent: "center", alignItems: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tabBar: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 8,
    backgroundColor: theme.colors.glass, borderRadius: theme.radius.md, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: theme.radius.sm },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  createGroupBtn: {
    marginHorizontal: 20, marginBottom: 8,
    paddingVertical: 10, alignItems: "center",
    backgroundColor: theme.colors.glass, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.primaryLight, borderStyle: "dashed",
  },
  createGroupText: { color: theme.colors.primaryLight, fontSize: theme.fontSize.sm, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  userItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 12, marginVertical: 2, borderRadius: theme.radius.md,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: { fontSize: theme.fontSize.md, fontWeight: "600", color: theme.colors.text },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.online },
  lastMsg: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: "flex-end", gap: 4 },
  time: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.colors.secondary,
    justifyContent: "center", alignItems: "center", paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  networkInfo: { fontSize: 10, color: theme.colors.textMuted, maxWidth: 100 },
  groupAvatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: "center", alignItems: "center",
  },
  groupIcon: { fontSize: 22 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: theme.fontSize.md },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderRadius: 0, padding: 12,
  },
  logoutText: { color: theme.colors.danger, fontSize: theme.fontSize.sm, fontWeight: "600", textAlign: "center" },
  // 模态框
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", paddingHorizontal: 24,
  },
  modalContent: { padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: "700", color: theme.colors.text, marginBottom: 16, textAlign: "center" },
  modalInput: {
    height: 44, backgroundColor: theme.colors.inputBg, borderRadius: theme.radius.sm,
    paddingHorizontal: 12, color: theme.colors.text, fontSize: theme.fontSize.md,
    marginBottom: 12,
  },
  modalSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 8 },
  memberItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, gap: 10,
  },
  memberName: { flex: 1, color: theme.colors.text, fontSize: theme.fontSize.md },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.textMuted,
    justifyContent: "center", alignItems: "center",
  },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: { flex: 1 },
  modalCancelText: { color: theme.colors.textSecondary, textAlign: "center", paddingVertical: 12, fontSize: theme.fontSize.md },
  modalConfirm: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, paddingVertical: 12, alignItems: "center" },
  modalConfirmText: { color: "#fff", fontWeight: "700", fontSize: theme.fontSize.md },
});
