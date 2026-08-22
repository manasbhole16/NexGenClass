import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { aiApi } from '../../api/aiApi';
import { Bot, Send, User, Sparkles } from 'lucide-react-native';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AiStudyAssistantScreen = ({ navigation }: any) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your NexGenClass AI Study Assistant. Ask me anything about your course materials, assignments, or study guides!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);

    try {
      setLoading(true);
      const res = await aiApi.askAssistant({ question: userMsg });
      const answer = res.answer || res.response || 'I have analyzed your query.';
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an issue retrieving that response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="AI Study Assistant" subtitle="Context-aware Academic Copilot" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.chatContent}>
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[styles.bubbleWrapper, msg.role === 'user' ? styles.userWrapper : styles.aiWrapper]}
          >
            <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <View style={styles.bubbleHeader}>
                {msg.role === 'user' ? (
                  <User size={14} color="#ffffff" />
                ) : (
                  <Sparkles size={14} color={theme.colors.primaryLight} />
                )}
                <Text style={styles.senderName}>{msg.role === 'user' ? 'You' : 'AI Copilot'}</Text>
              </View>
              <Text style={styles.messageText}>{msg.content}</Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubbleWrapper, styles.aiWrapper]}>
            <View style={[styles.bubble, styles.aiBubble]}>
              <ActivityIndicator color={theme.colors.primaryLight} size="small" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          placeholder="Ask a question..."
          placeholderTextColor={theme.colors.textMuted}
          value={input}
          onChangeText={setInput}
          style={styles.textInput}
        />
        <TouchableOpacity onPress={handleSend} disabled={loading || !input.trim()} style={styles.sendButton}>
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  bubbleWrapper: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
  },
  aiBubble: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  senderName: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  messageText: {
    ...theme.typography.body,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
