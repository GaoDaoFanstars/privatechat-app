// 全局状态管理
import React, { createContext, useContext, useReducer, ReactNode } from "react";

// 状态类型
interface User {
  id: number;
  username: string;
  online: boolean;
  network_type: string;
  location: string;
  last_seen: number;
}

interface Message {
  id: number;
  msg_type: "text" | "voice" | "image";
  sender_id: number;
  sender_username: string;
  receiver_id?: number;
  group_id?: number;
  content: string;
  media_url: string;
  created_at: number;
}

interface ChatSession {
  id: number; // user_id or group_id
  name: string;
  type: "user" | "group";
  messages: Message[];
  unread: number;
}

interface Group {
  id: number;
  name: string;
  creator_id: number;
  created_at: number;
}

interface AppState {
  user: { id: number; username: string; token: string } | null;
  users: User[];
  groups: Group[];
  chatSessions: ChatSession[];
  activeSessionId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  isLocked: boolean;
}

type Action =
  | { type: "SET_USER"; payload: AppState["user"] }
  | { type: "LOGOUT" }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "SET_GROUPS"; payload: Group[] }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOCKED"; payload: boolean }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "RECALL_MESSAGE"; payload: { message_id: number } }
  | { type: "DELETE_MESSAGE"; payload: { message_id: number } }
  | { type: "SET_ACTIVE_SESSION"; payload: number | null }
  | { type: "ADD_SESSION"; payload: ChatSession }
  | { type: "SET_SESSION_MESSAGES"; payload: { id: number; messages: Message[] } };

const initialState: AppState = {
  user: null,
  users: [],
  groups: [],
  chatSessions: [],
  activeSessionId: null,
  isConnected: false,
  isLoading: false,
  isLocked: false,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "LOGOUT":
      return { ...initialState };
    case "SET_USERS":
      return { ...state, users: action.payload };
    case "SET_GROUPS":
      return { ...state, groups: action.payload };
    case "SET_LOCKED":
      return { ...state, isLocked: action.payload };
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "ADD_MESSAGE": {
      const msg = action.payload;
      const targetId = msg.group_id || msg.sender_id === state.user?.id
        ? msg.receiver_id
        : msg.sender_id;
      const type = msg.group_id ? "group" : "user";

      let sessions = [...state.chatSessions];
      const idx = sessions.findIndex(
        (s) => s.id === targetId && s.type === type
      );

      if (idx >= 0) {
        sessions[idx] = {
          ...sessions[idx],
          messages: [...sessions[idx].messages, msg],
          unread:
            targetId !== state.activeSessionId
              ? sessions[idx].unread + 1
              : sessions[idx].unread,
        };
      } else if (targetId) {
        // 新建会话
        const targetUser = state.users.find((u) => u.id === targetId);
        sessions.push({
          id: targetId as number,
          name: targetUser?.username || `用户${targetId}`,
          type: type as "user" | "group",
          messages: [msg],
          unread: 1,
        });
      }
      return { ...state, chatSessions: sessions };
    }
    case "RECALL_MESSAGE": {
      const { message_id } = action.payload;
      return {
        ...state,
        chatSessions: state.chatSessions.map((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === message_id ? { ...m, content: "[消息已撤回]", recalled: true } : m
          ),
        })),
      };
    }
    case "DELETE_MESSAGE": {
      const { message_id } = action.payload;
      return {
        ...state,
        chatSessions: state.chatSessions.map((s) => ({
          ...s,
          messages: s.messages.filter((m) => m.id !== message_id),
        })),
      };
    }
    case "SET_ACTIVE_SESSION":
      return {
        ...state,
        activeSessionId: action.payload,
        chatSessions: state.chatSessions.map((s) =>
          s.id === action.payload ? { ...s, unread: 0 } : s
        ),
      };
    case "ADD_SESSION":
      return {
        ...state,
        chatSessions: state.chatSessions.find((s) => s.id === action.payload.id)
          ? state.chatSessions
          : [...state.chatSessions, action.payload],
      };
    case "SET_SESSION_MESSAGES": {
      return {
        ...state,
        chatSessions: state.chatSessions.map((s) =>
          s.id === action.payload.id
            ? { ...s, messages: action.payload.messages }
            : s
        ),
      };
    }
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return React.createElement(
    AppContext.Provider,
    { value: { state, dispatch } },
    children
  );
}

export function useApp() {
  return useContext(AppContext);
}

export type { User, Group, Message, ChatSession, AppState, Action };
