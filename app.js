import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Alert, SafeAreaView, StatusBar
} from 'react-native';

const WS_URL = 'ws://38.76.208.101:8765';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const wsRef = useRef(null);

  const handleRegister = () => {
    if (!username || !password) {
      Alert.alert('错误', '请填写用户名和密码');
      return;
    }
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'register', username, password }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'register_success') {
        Alert.alert('成功', '注册成功！请登录');
        setShowRegister(false);
        ws.close();
      } else if (data.type === 'error') {
        Alert.alert('错误', data.message);
        ws.close();
      }
    };
    ws.onerror = () => Alert.alert('错误', '连接服务器失败');
  };

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('错误', '请填写用户名和密码');
      return;
    }
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'login', username, password }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'login_success') {
        setIsLoggedIn(true);
        setCurrentUser({ user_id: data.user_id, username: data.username });
        wsRef.current = ws;
        Alert.alert('成功', '登录成功！');
      } else if (data.type === 'error') {
        Alert.alert('错误', data.message);
        ws.close();
      }
    };
    ws.onerror = () => Alert.alert('错误', '连接服务器失败');
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: Date.now(),
      text: inputText,
      isMe: true,
      time: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMsg]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        from_id: currentUser?.user_id,
        to_id: 2,
        to_type: 'user',
        encrypted_content: inputText,
        msg_type: 'text'
      }));
    }
    setInputText('');
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.glassCard}>
          <Text style={styles.title}>💬 PrivateChat</Text>
          <Text style={styles.subtitle}>加密聊天</Text>
          
          {!showRegister ? (
            <>
              <TextInput style={styles.input} placeholder="用户名" placeholderTextColor="#999" value={username} onChangeText={setUsername} />
              <TextInput style={styles.input} placeholder="密码" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} />
              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}><Text style={styles.btnText}>登录</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowRegister(true)}><Text style={styles.linkText}>注册</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput style={styles.input} placeholder="用户名" placeholderTextColor="#999" value={username} onChangeText={setUsername} />
              <TextInput style={styles.input} placeholder="密码" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} />
              <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}><Text style={styles.btnText}>注册</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowRegister(false)}><Text style={styles.linkText}>返回登录</Text></TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PrivateChat</Text>
        <Text style={styles.headerUser}>{currentUser?.username}</Text>
      </View>
      <FlatList data={messages} keyExtractor={item => item.id.toString()} renderItem={({ item }) => (
        <View style={[styles.messageRow, item.isMe ? styles.myMessageRow : styles.otherMessageRow]}>
          <View style={[styles.messageBubble, item.isMe ? styles.myBubble : styles.otherBubble]}>
            <Text style={item.isMe ? styles.myMessageText : styles.otherMessageText}>{item.text}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        </View>
      )} style={styles.messageList} />
      <View style={styles.inputBar}>
        <TextInput style={styles.chatInput} placeholder="输入消息..." placeholderTextColor="#999" value={inputText} onChangeText={setInputText} />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}><Text style={styles.sendBtnText}>发送</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  glassCard: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(255,255,255,0.08)', margin: 20, borderRadius: 30 },
  title: { fontSize: 34, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, marginBottom: 16, color: '#fff', fontSize: 16 },
  loginBtn: { backgroundColor: '#6c5ce7', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  registerBtn: { backgroundColor: '#00b894', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#6c5ce7', textAlign: 'center', marginTop: 20, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerUser: { color: '#6c5ce7', fontSize: 14 },
  messageList: { flex: 1, padding: 16 },
  messageRow: { marginBottom: 12, flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: '#6c5ce7', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#2d2d44', borderBottomLeftRadius: 4 },
  myMessageText: { color: '#fff', fontSize: 15 },
  otherMessageText: { color: '#fff', fontSize: 15 },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', marginRight: 12 },
  sendBtn: { backgroundColor: '#6c5ce7', borderRadius: 25, paddingHorizontal: 20, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '600' },
});