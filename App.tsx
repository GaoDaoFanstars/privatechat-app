// App 入口
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "./src/contexts/AppContext";
import { chatSocket } from "./src/services/api";
import LoginScreen from "./src/screens/LoginScreen";
import ChatListScreen from "./src/screens/ChatListScreen";
import ChatScreen from "./src/screens/ChatScreen";

function AppNavigator() {
  const { state, dispatch } = useApp();

  const [screen, setScreen] = React.useState<"login" | "chats" | "chat">("login");
  const [chatTarget, setChatTarget] = React.useState({ id: 0, name: "" });

  // 监听 WS 断开/连接
  useEffect(() => {
    const unsub1 = chatSocket.on("connected", () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
    });
    const unsub2 = chatSocket.on("disconnected", () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // 监听新消息
  useEffect(() => {
    const unsub = chatSocket.on("new_message", (data) => {
      dispatch({ type: "ADD_MESSAGE", payload: data.data });
    });
    return unsub;
  }, []);

  // 监听撤回/删除通知
  useEffect(() => {
    const unsubRecall = chatSocket.on("message_recalled", (data) => {
      dispatch({ type: "RECALL_MESSAGE", payload: data.data });
    });
    const unsubDelete = chatSocket.on("message_deleted", (data) => {
      dispatch({ type: "DELETE_MESSAGE", payload: data.data });
    });
    return () => { unsubRecall(); unsubDelete(); };
  }, []);

  if (!state.user) {
    return <LoginScreen />;
  }

  switch (screen) {
    case "chat":
      return (
        <ChatScreen
          userId={chatTarget.id}
          username={chatTarget.name}
          onBack={() => setScreen("chats")}
        />
      );
    default:
      return (
        <ChatListScreen
          onSelectUser={(id, name) => {
            setChatTarget({ id, name });
            setScreen("chat");
            dispatch({ type: "SET_ACTIVE_SESSION", payload: id });
          }}
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
