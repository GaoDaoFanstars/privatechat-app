# PrivateChat App

端到端加密聊天应用 - React Native (Expo)

## 目录结构

```
├── App.tsx              # 入口
├── src/
│   ├── screens/         # 页面
│   │   ├── LoginScreen.tsx      # 登录/注册
│   │   ├── ChatListScreen.tsx   # 会话/联系人列表
│   │   └── ChatScreen.tsx       # 聊天界面
│   ├── components/      # 组件
│   │   ├── Avatar.tsx           # 头像+在线状态
│   │   ├── Glass.tsx            # 毛玻璃容器
│   │   └── MessageBubble.tsx    # 消息气泡
│   ├── contexts/
│   │   └── AppContext.tsx       # 全局状态管理
│   ├── services/
│   │   └── api.ts              # WebSocket连接+API
│   └── theme.ts                # 暗黑主题样式
├── assets/             # 图标资源
├── package.json
├── app.json            # Expo配置
├── eas.json            # EAS Build配置
└── tsconfig.json
```

## 服务器配置

编辑 `src/services/api.ts` 中的：
```ts
export const SERVER_IP = "38.76.208.101";
export const WS_URL = `ws://${SERVER_IP}:8765`;
export const HTTP_URL = `http://${SERVER_IP}:8080`;
```

## 本地运行

```bash
npm install
npx expo start
```

## 打包 APK

### 方法1: GitHub Actions（推荐）
1. Push 代码到 GitHub
2. 在 GitHub Repo → Settings → Secrets 添加 `EXPO_TOKEN`
3. 手动触发 Actions 或 push main 分支

### 方法2: 本地打包
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
