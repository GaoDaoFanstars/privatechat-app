// 服务器配置
export const SERVER_IP = "38.76.208.101";
export const WS_URL = `ws://${SERVER_IP}:8765`;
export const HTTP_URL = `http://${SERVER_IP}:8080`;

// WebSocket 连接管理
class ChatSocket {
  constructor() {
    this.ws = null;
    this.userId = 0;
    this.token = "";
    this.username = "";
    this.listeners = {};
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
  }

  connect(userId, token, username) {
    this.userId = userId;
    this.token = token;
    this.username = username;

    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log("WebSocket 已连接");
      // 更新在线状态
      this.send({
        action: "update_status",
        user_id: this.userId,
        token: this.token,
        network_type: "WiFi",
        location: "",
      });
      this.startHeartbeat();
      this.emit("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.action, data);
      } catch (e) {
        console.error("消息解析失败:", e);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket 已断开");
      this.stopHeartbeat();
      this.emit("disconnected");
      // 自动重连
      this.reconnectTimer = setTimeout(() => {
        this.connect(this.userId, this.token, this.username);
      }, 3000);
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket 错误:", err);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    };
  }

  emit(event, data) {
    const cbs = this.listeners[event] || [];
    cbs.forEach((cb) => cb(data));
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send({ action: "ping" });
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const chatSocket = new ChatSocket();

// API 调用
export const api = {
  register(username, password) {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("register", (data) => {
        once();
        if (data.error) reject(new Error(data.error));
        else resolve(data.data);
      });
      chatSocket.send({
        action: "register",
        username,
        password,
      });
    });
  },

  login(username, password) {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("login", (data) => {
        once();
        if (data.error) reject(new Error(data.error));
        else resolve(data.data);
      });
      chatSocket.send({
        action: "login",
        username,
        password,
      });
    });
  },

  sendMessage(receiverId, content, msgType = "text", mediaUrl = "") {
    chatSocket.send({
      action: "send_message",
      user_id: chatSocket.userId,
      token: chatSocket.token,
      receiver_id: receiverId,
      msg_type: msgType,
      content,
      media_url: mediaUrl,
    });
  },

  sendGroupMessage(groupId, content, msgType = "text", mediaUrl = "") {
    chatSocket.send({
      action: "send_message",
      user_id: chatSocket.userId,
      token: chatSocket.token,
      group_id: groupId,
      msg_type: msgType,
      content,
      media_url: mediaUrl,
    });
  },

  getChatMessages(otherId, limit = 50) {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("get_messages", (data) => {
        once();
        if (data.error) reject(new Error(data.error));
        else resolve(data.data.messages);
      });
      chatSocket.send({
        action: "get_messages",
        user_id: chatSocket.userId,
        token: chatSocket.token,
        target_user: otherId,
        limit,
      });
    });
  },

  getUsers() {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("user_list", (data) => {
        once();
        resolve(data.data.users);
      });
      chatSocket.send({
        action: "get_users",
        user_id: chatSocket.userId,
        token: chatSocket.token,
      });
    });
  },

  recallMessage(messageId) {
    chatSocket.send({
      action: "recall_message",
      user_id: chatSocket.userId,
      token: chatSocket.token,
      message_id: messageId,
    });
  },

  deleteMessage(messageId) {
    chatSocket.send({
      action: "delete_message",
      user_id: chatSocket.userId,
      token: chatSocket.token,
      message_id: messageId,
    });
  },

  uploadMedia(file) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${HTTP_URL}/`, {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
  },

  // 群聊
  createGroup(name, memberIds) {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("create_group", (data) => {
        once();
        if (data.error) reject(new Error(data.error));
        else resolve(data.data);
      });
      chatSocket.send({
        action: "create_group",
        user_id: chatSocket.userId,
        token: chatSocket.token,
        name,
        members: memberIds,
      });
    });
  },

  getGroups() {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("get_groups", (data) => {
        once();
        if (data.error) reject(new Error(data.error));
        else resolve(data.data.groups);
      });
      chatSocket.send({
        action: "get_groups",
        user_id: chatSocket.userId,
        token: chatSocket.token,
      });
    });
  },

  getGroupMessages(groupId, limit = 50) {
    return new Promise((resolve, reject) => {
      const once = chatSocket.on("get_messages", (data) => {
        once();
        if (data.error) reject(new Error(data.error));
        else resolve(data.data.messages);
      });
      chatSocket.send({
        action: "get_messages",
        user_id: chatSocket.userId,
        token: chatSocket.token,
        group_id: groupId,
        limit,
      });
    });
  },

  // 指纹锁（本地存储 token，无需服务端接口）
  saveBiometric(userId, token) {
    return new Promise((resolve) => {
      // 通过 AsyncStorage 或 SecureStore 保存
      resolve(true);
    });
  },
};

// 媒体URL工具
export function getMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${HTTP_URL}/${path.replace(/^\//, "")}`;
}
