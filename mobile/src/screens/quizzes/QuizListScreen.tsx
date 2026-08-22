import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { quizApi } from '../../api/quizApi';
import { CheckSquare, Clock } from 'lucide-react-native';

export const QuizListScreen = ({ navigation }: any) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadQuizzes = async () => {
    try {
      setRefreshing(true);
      const res = await quizApi.getClassroomQuizzes('all');
      setQuizzes(res.quizzes || []);
    } catch {
      // Handle error
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Quizzes & Assessments" onBack={() => navigation.goBack()} />

      <FlatList
        data={quizzes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadQuizzes} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <CheckSquare color={theme.colors.textMuted} size={28} />
            <Text style={styles.emptyText}>No quizzes available right now.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.quizCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.quizTitle} numberOfLines={1}>{item.title}</Text>
              <Badge label={item.isDraft ? 'Draft' : 'Published'} variant={item.isDraft ? 'warning' : 'success'} />
            </View>
            <View style={styles.metaRow}>
              <Clock color={theme.colors.textMuted} size={14} />
              <Text style={styles.metaText}>{item.durationMinutes || 30} mins</Text>
              <Text style={styles.metaText}>• {item.questionsCount || 0} Questions</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  quizCard: {
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizTitle: {
    ...theme.typography.h3,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 6,
  },
  metaText: {
    ...theme.typography.caption,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.bodySecondary,
  },
});
