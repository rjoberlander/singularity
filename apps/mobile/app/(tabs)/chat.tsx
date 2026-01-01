/**
 * Health Chat Screen
 * AI-powered health assistant chat
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ChatSession,
  ChatMessage,
  sendMessage,
  getChatSessions,
  getChatSession,
  createChatSession,
  deleteChatSession,
  submitFeedback
} from '../../services/chatService';

export default function ChatScreen() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { sessions } = await getChatSessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const { session, messages } = await getChatSession(sessionId);
      setCurrentSession(session);
      setMessages(messages);
      setShowSidebar(false);
    } catch (error) {
      console.error('Failed to load session:', error);
      Alert.alert('Error', 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  const startNewChat = async () => {
    try {
      const { session } = await createChatSession();
      setCurrentSession(session);
      setMessages([]);
      setShowSidebar(false);
      loadSessions();
    } catch (error) {
      Alert.alert('Error', 'Failed to create new chat');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSession?.id || '',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await sendMessage(userMessage, currentSession?.id);
      setCurrentSession(response.session);

      // Replace temp message with real one and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id);
        const userMsg: ChatMessage = {
          ...tempUserMsg,
          id: `user-${Date.now()}`,
          session_id: response.session.id
        };
        return [...filtered, userMsg, response.message];
      });

      // Refresh sessions list
      loadSessions();

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSession = (session: ChatSession) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChatSession(session.id);
              if (currentSession?.id === session.id) {
                setCurrentSession(null);
                setMessages([]);
              }
              loadSessions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  };

  const handleFeedback = async (message: ChatMessage, feedback: 'helpful' | 'not_helpful') => {
    try {
      await submitFeedback(message.id, feedback);
      setMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, user_feedback: feedback } : m
      ));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)}>
            <Ionicons name="menu" size={24} color="#10b981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Assistant</Text>
          <TouchableOpacity onPress={startNewChat}>
            <Ionicons name="add-circle-outline" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Sidebar */}
        {showSidebar && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Conversations</Text>
            </View>
            <ScrollView style={styles.flex1}>
              {sessions.map(session => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => loadSession(session.id)}
                  onLongPress={() => handleDeleteSession(session)}
                  style={[
                    styles.sessionItem,
                    currentSession?.id === session.id && styles.sessionItemActive
                  ]}
                >
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.title || 'New conversation'}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.updated_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
              {sessions.length === 0 && (
                <Text style={styles.noSessions}>No conversations yet</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#10b981" style={styles.loader} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#6b7280" />
              <Text style={styles.emptyStateText}>
                Ask me anything about your{'\n'}health data and protocols
              </Text>
              <View style={styles.suggestions}>
                {[
                  'How are my vitamin D levels?',
                  'What supplements should I take with food?',
                  'Summarize my health goals'
                ].map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setInputText(suggestion)}
                    style={styles.suggestionButton}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble
                  ]}
                >
                  <Text
                    style={message.role === 'user' ? styles.userText : styles.assistantText}
                  >
                    {message.content}
                  </Text>
                </View>

                {/* Feedback buttons for assistant messages */}
                {message.role === 'assistant' && !message.user_feedback && (
                  <View style={styles.feedbackRow}>
                    <TouchableOpacity
                      onPress={() => handleFeedback(message, 'helpful')}
                      style={styles.feedbackButton}
                    >
                      <Ionicons name="thumbs-up-outline" size={16} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleFeedback(message, 'not_helpful')}
                      style={styles.feedbackButton}
                    >
                      <Ionicons name="thumbs-down-outline" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
                {message.user_feedback && (
                  <Text style={styles.feedbackText}>
                    {message.user_feedback === 'helpful' ? '👍 Helpful' : '👎 Not helpful'}
                  </Text>
                )}
              </View>
            ))
          )}
          {sending && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color="#10b981" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your health data..."
              placeholderTextColor="#6b7280"
              multiline
              maxLength={2000}
              style={styles.textInput}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              style={[
                styles.sendButton,
                inputText.trim() && !sending ? styles.sendButtonActive : styles.sendButtonDisabled
              ]}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sidebar: {
    position: 'absolute',
    top: 48,
    left: 0,
    bottom: 0,
    width: 288,
    backgroundColor: '#111111',
    zIndex: 10,
    borderRightWidth: 1,
    borderRightColor: '#1f1f1f',
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sessionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  sessionItemActive: {
    backgroundColor: '#10b98120',
  },
  sessionTitle: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  sessionDate: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  noSessions: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 32,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  suggestions: {
    marginTop: 24,
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  suggestionText: {
    color: '#10b981',
    fontSize: 14,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageRowAssistant: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#111111',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  feedbackRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  feedbackButton: {
    padding: 4,
    marginRight: 8,
  },
  feedbackText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    backgroundColor: '#111111',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    color: '#fff',
    maxHeight: 96,
    fontSize: 15,
  },
  sendButton: {
    padding: 12,
    borderRadius: 24,
  },
  sendButtonActive: {
    backgroundColor: '#10b981',
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
  },
});
