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
  Alert
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)}>
            <Ionicons name="menu" size={24} color="#9333ea" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Health Assistant
          </Text>
          <TouchableOpacity onPress={startNewChat}>
            <Ionicons name="add-circle-outline" size={24} color="#9333ea" />
          </TouchableOpacity>
        </View>

        {/* Sidebar */}
        {showSidebar && (
          <View className="absolute top-12 left-0 bottom-0 w-72 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
            <View className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">Conversations</Text>
            </View>
            <ScrollView className="flex-1">
              {sessions.map(session => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => loadSession(session.id)}
                  onLongPress={() => handleDeleteSession(session)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 ${
                    currentSession?.id === session.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <Text className="text-gray-900 dark:text-white font-medium" numberOfLines={1}>
                    {session.title || 'New conversation'}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
              {sessions.length === 0 && (
                <Text className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No conversations yet
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-2"
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#9333ea" className="mt-10" />
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 text-lg mt-4 text-center">
                Ask me anything about your{'\n'}health data and protocols
              </Text>
              <View className="mt-6 space-y-2">
                {[
                  'How are my vitamin D levels?',
                  'What supplements should I take with food?',
                  'Summarize my health goals'
                ].map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setInputText(suggestion);
                    }}
                    className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full"
                  >
                    <Text className="text-purple-700 dark:text-purple-300">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                className={`mb-3 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-600 rounded-br-md'
                      : 'bg-white dark:bg-gray-800 rounded-bl-md border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Text
                    className={message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-white'}
                  >
                    {message.content}
                  </Text>
                </View>

                {/* Feedback buttons for assistant messages */}
                {message.role === 'assistant' && !message.user_feedback && (
                  <View className="flex-row mt-1">
                    <TouchableOpacity
                      onPress={() => handleFeedback(message, 'helpful')}
                      className="p-1 mr-2"
                    >
                      <Ionicons name="thumbs-up-outline" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleFeedback(message, 'not_helpful')}
                      className="p-1"
                    >
                      <Ionicons name="thumbs-down-outline" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                )}
                {message.user_feedback && (
                  <Text className="text-xs text-gray-400 mt-1">
                    {message.user_feedback === 'helpful' ? '👍 Helpful' : '👎 Not helpful'}
                  </Text>
                )}
              </View>
            ))
          )}
          {sending && (
            <View className="items-start mb-3">
              <View className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700">
                <ActivityIndicator size="small" color="#9333ea" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <View className="flex-row items-center">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your health data..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={2000}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 mr-2 text-gray-900 dark:text-white max-h-24"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              className={`p-3 rounded-full ${
                inputText.trim() && !sending ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
