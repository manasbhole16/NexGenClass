import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { classroomApi } from '../../api/classroomApi';
import { taskApi } from '../../api/taskApi';
import { quizApi } from '../../api/quizApi';
import { fileApi } from '../../api/fileApi';
import { MessageSquare, FileText, CheckSquare, Folder, Users, Video } from 'lucide-react-native';

export const ClassroomDetailScreen = ({ route, navigation }: any) => {
  const { roomId, title } = route.params;
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'quizzes' | 'files'>('stream');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      if (activeTab === 'stream') {
        const res = await classroomApi.getStreamPosts(roomId);
        setAnnouncements(res.announcements || []);
      } else if (activeTab === 'classwork') {
        const res = await taskApi.getClassroomTasks(roomId);
        setTasks(res.tasks || []);
      } else if (activeTab === 'quizzes') {
        const res = await quizApi.getClassroomQuizzes(roomId);
        setQuizzes(res.quizzes || []);
      } else if (activeTab === 'files') {
        const res = await fileApi.getClassroomFiles(roomId);
        setFiles(res.files || []);
      }
    } catch (e) {
      console.error('Classroom tab load error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, roomId]);

  return (
    <View style={styles.container}>
      <Header title={title || 'Classroom'} onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('stream')}
          style={[styles.tabItem, activeTab === 'stream' && styles.tabActive]}
        >
          <MessageSquare size={16} color={activeTab === 'stream' ? '#ffffff' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'stream' && styles.tabTextActive]}>Stream</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('classwork')}
          style={[styles.tabItem, activeTab === 'classwork' && styles.tabActive]}
        >
          <FileText size={16} color={activeTab === 'classwork' ? '#ffffff' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'classwork' && styles.tabTextActive]}>Classwork</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('quizzes')}
          style={[styles.tabItem, activeTab === 'quizzes' && styles.tabActive]}
        >
          <CheckSquare size={16} color={activeTab === 'quizzes' ? '#ffffff' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>Quizzes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('files')}
          style={[styles.tabItem, activeTab === 'files' && styles.tabActive]}
        >
          <Folder size={16} color={activeTab === 'files' ? '#ffffff' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'files' && styles.tabTextActive]}>Files</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.primary} />}
      >
        {/* Stream Tab */}
        {activeTab === 'stream' && (
          <View>
            {announcements.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No announcements posted yet.</Text>
              </Card>
            ) : (
              announcements.map((post) => (
                <Card key={post._id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <Text style={styles.authorName}>{post.user?.fullname || 'Instructor'}</Text>
                    <Text style={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.postBody}>{post.content}</Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Classwork Tab */}
        {activeTab === 'classwork' && (
          <View>
            {tasks.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No assignments assigned yet.</Text>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card
                  key={task._id}
                  onPress={() => navigation.navigate('AssignmentDetail', { taskId: task._id })}
                  style={styles.taskCard}
                >
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    <Badge label={`${task.maxMarks || 100} pts`} variant="primary" />
                  </View>
                  {task.dueDate && (
                    <Text style={styles.taskDue}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <View>
            {quizzes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No quizzes available.</Text>
              </Card>
            ) : (
              quizzes.map((quiz) => (
                <Card key={quiz._id} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{quiz.title}</Text>
                  <Text style={styles.taskDue}>{quiz.questionsCount || 0} Questions</Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <View>
            {files.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No classroom resources uploaded.</Text>
              </Card>
            ) : (
              files.map((file) => (
                <Card key={file._id} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{file.originalName}</Text>
                  <Text style={styles.taskDue}>Category: {file.category || 'Document'}</Text>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: theme.spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.bodySecondary,
  },
  postCard: {
    marginBottom: theme.spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  authorName: {
    ...theme.typography.h3,
    fontSize: 14,
  },
  postDate: {
    ...theme.typography.caption,
  },
  postBody: {
    ...theme.typography.body,
    lineHeight: 20,
  },
  taskCard: {
    marginBottom: theme.spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    ...theme.typography.h3,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  taskDue: {
    ...theme.typography.caption,
    marginTop: 4,
  },
});
