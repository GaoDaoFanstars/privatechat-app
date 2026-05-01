// App 入口 - 完整版（含锁屏、群聊、语音、图片）
import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "./src/contexts/AppContext";
import { chatSocket } from "./src/services/api";
import LoginScreen from "./src/screens/LoginScreen";
import ChatListScreen from "./src/screens/ChatListScreen";
import ChatScreen from "./src/screens/ChatScreen";
import LockScreen from "./src/screens/LockScreen";

function AppNavigator() {
  const { state, dispatch } = useApp();
  const [screen, setScreen] = useState<"lock" | "login" | "chats" | "chat">("lock");
  const [chatTarget, setChatTarget] = useState({ id: 0, name: "", isGroup: false });

  // 监听WS状态
  useEffect(() => {
    const u1 = chatSocket.on("connected", () => dispatch({ type: "SET_CONNECTED", payload: true }));
    const u2 = chatSocket.on("disconnected", () => dispatch({ type: "SET_CONNECTED", payload: false }));
    return () => { u1(); u2(); };
  }, []);

  // 监听新消息
  useEffect(() => {
    const unsub = chatSocket.on("new_message", (data) => {
      dispatch({ type: "ADD_MESSAGE", payload: data.data });
    });
    return unsub;
  }, []);

  // 监听撤回/删除
  useEffect(() => {
    const ur = chatSocket.on("message_recalled", (data) => dispatch({ type: "RECALL_MESSAGE", payload: data.data }));
    const ud = chatSocket.on("message_deleted", (data) => dispatch({ type: "DELETE_MESSAGE", payload: data.data }));
    return () => { ur(); ud(); };
  }, []);

  const openChat = useCallback((id: number, name: string, isGroup = false) => {
    setChatTarget({ id, name, isGroup });
    setScreen("chat");
    dispatch({ type: "SET_ACTIVE_SESSION", payload: id });
  }, []);

  if (!state.user) {
    // 有 token 但未连接，显示锁屏
    if (screen === "lock") {
      return <LockScreen onUnlock={() => setScreen("login")} />;
    }
    return <LoginScreen />;
  }

  if (screen === "lock") {
    return <LockScreen onUnlock={() => setScreen("chats")} />;
  }

  switch (screen) {
    case "chat":
      return chatTarget.isGroup ? (
        <ChatScreen
          groupId={chatTarget.id}
          sessionName={chatTarget.name}
          onBack={() => setScreen("chats")}
        />
      ) : (
        <ChatScreen
          userId={chatTarget.id}
          sessionName={chatTarget.name}
          onBack={() => setScreen("chats")}
        />
      );
    default:
      return (
        <ChatListScreen
          onStartChat={(id, name) => openChat(id, name)}
          onOpenGroup={(id, name) => openChat(id, name, true)}
          onLogout={() => {
            chatSocket.disconnect();
            dispatch({ type: "LOGOUT" });
            setScreen("login");
          }}
        />
      );
  }
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AppProvider>
  );
}
