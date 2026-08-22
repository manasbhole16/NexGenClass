import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { taskApi } from '../../api/taskApi';
import { Task, Submission } from '../../types';
import { useAuth } from '../../store/authStore';
import { CheckCircle, Clock, FileText } from 'lucide-react-native';

export const AssignmentDetailScreen = ({ route, navigation }: any) => {
  const { taskId } = route.params;
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskRes, subRes] = await Promise.all([
        taskApi.getTaskDetails(taskId),
        taskApi.getStudentSubmission(taskId).catch(() => ({ submission: null })),
      ]);

      setTask(taskRes.task);
      setSubmission(subRes.submission);
      if (subRes.submission?.content) {
        setContent(subRes.submission.content);
      }
    } catch (e) {
      console.error('Assignment load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [taskId]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Please write your submission response.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await taskApi.submitAssignment(taskId, { content: content.trim() });
      setSubmission(res.submission);
      Alert.alert('Turned In', 'Your assignment has been submitted successfully!');
    } catch (e: any) {
      Alert.alert('Submission Error', e.response?.data?.message || 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !task) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const isGraded = submission?.status === 'graded';
  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'late' || isGraded;

  return (
    <View style={styles.container}>
      <Header title="Assignment" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Task Info Card */}
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{task.title}</Text>
            <Badge label={`${task.maxMarks || 100} pts`} variant="primary" />
          </View>

          {task.dueDate && (
            <Text style={styles.dueDate}>Due: {new Date(task.dueDate).toLocaleString()}</Text>
          )}

          {task.description ? (
            <Text style={styles.description}>{task.description}</Text>
          ) : (
            <Text style={styles.mutedText}>No instructions provided.</Text>
          )}
        </Card>

        {/* Rubric Card */}
        {task.rubric && task.rubric.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Grading Rubric ({task.rubric.length})</Text>
            {task.rubric.map((r, idx) => (
              <View key={idx} style={styles.rubricItem}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rubricCriterion}>{r.criterion}</Text>
                  <Text style={styles.rubricPoints}>{r.points} pts</Text>
                </View>
                {r.description && <Text style={styles.rubricDesc}>{r.description}</Text>}
              </View>
            ))}
          </Card>
        )}

        {/* Student Submission Card */}
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Your Work</Text>
            {isSubmitted ? (
              <Badge label={submission?.status || 'Submitted'} variant={isGraded ? 'success' : 'info'} />
            ) : (
              <Badge label="Assigned" variant="warning" />
            )}
          </View>

          {isGraded && (
            <View style={styles.gradedBox}>
              <Text style={styles.gradedTitle}>Grade: {submission?.marksAwarded} / {task.maxMarks || 100} pts</Text>
              {submission?.teacherFeedback && (
                <Text style={styles.feedbackText}>Teacher Feedback: "{submission.teacherFeedback}"</Text>
              )}
            </View>
          )}

          <TextInput
            placeholder="Type your response / answers here..."
            placeholderTextColor={theme.colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            editable={!isGraded}
            style={styles.textArea}
          />

          <Button
            title={isSubmitted ? 'Resubmit Work' : 'Turn In'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={isGraded}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h2,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  dueDate: {
    ...theme.typography.caption,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  description: {
    ...theme.typography.body,
    lineHeight: 22,
  },
  mutedText: {
    ...theme.typography.caption,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
  },
  rubricItem: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rubricCriterion: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  rubricPoints: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  rubricDesc: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  textArea: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  gradedBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  gradedTitle: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: 14,
  },
  feedbackText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: 4,
  },
});
