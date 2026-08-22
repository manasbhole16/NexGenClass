import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '../../theme';
import { useAuth } from '../../store/authStore';
import { classroomApi } from '../../api/classroomApi';
import { plannerApi } from '../../api/plannerApi';
import { notificationApi } from '../../api/notificationApi';
import { Room } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Header } from '../../components/common/Header';
import { BookOpen, Calendar, Bot, Video, ShieldCheck, Users, Clock, AlertCircle } from 'lucide-react-native';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [agenda, setAgenda] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [roomsRes, agendaRes, notifRes] = await Promise.all([
        classroomApi.getMyClassrooms(),
        plannerApi.getPlannerAgenda(),
        notificationApi.getNotifications(),
      ]);

      setRooms(roomsRes.rooms || []);
      setAgenda(agendaRes);
      setUnreadCount(notifRes.unreadCount || 0);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <View style={styles.container}>
      <Header
        title="NexGenClass"
        subtitle={`Welcome, ${user?.fullname || 'Student'}`}
        onNotificationPress={() => navigation.navigate('Notifications')}
        unreadCount={unreadCount}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboardData} tintColor={theme.colors.primary} />}
      >
        {/* Quick Hub Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity onPress={() => navigation.navigate('AiCopilot')} style={styles.quickCard} activeOpacity={0.8}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(147, 51, 234, 0.2)' }]}>
              <Bot color={theme.colors.primaryLight} size={22} />
            </View>
            <Text style={styles.quickTitle}>AI Copilot</Text>
            <Text style={styles.quickSub}>Study Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Planner')} style={styles.quickCard} activeOpacity={0.8}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Calendar color={theme.colors.info} size={22} />
            </View>
            <Text style={styles.quickTitle}>Planner</Text>
            <Text style={styles.quickSub}>Tasks & Deadlines</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Attendance')} style={styles.quickCard} activeOpacity={0.8}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Clock color={theme.colors.success} size={22} />
            </View>
            <Text style={styles.quickTitle}>Attendance</Text>
            <Text style={styles.quickSub}>Records & Matrix</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Analytics')} style={styles.quickCard} activeOpacity={0.8}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
              <ShieldCheck color={theme.colors.accent} size={22} />
            </View>
            <Text style={styles.quickTitle}>Analytics</Text>
            <Text style={styles.quickSub}>Performance</Text>
          </TouchableOpacity>
        </View>

        {/* My Classrooms */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Classrooms ({rooms.length})</Text>
        </View>

        {rooms.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen color={theme.colors.textMuted} size={28} />
            <Text style={styles.emptyText}>No classrooms enrolled yet.</Text>
          </Card>
        ) : (
          rooms.map((room) => (
            <Card
              key={room._id}
              onPress={() => navigation.navigate('ClassroomDetail', { roomId: room._id, title: room.name })}
              style={styles.roomCard}
            >
              <View style={styles.roomHeader}>
                <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                <Badge label={room.code} variant="primary" />
              </View>
              {room.subject && <Text style={styles.roomSubject}>{room.subject} {room.section ? `• ${room.section}` : ''}</Text>}
              <View style={styles.roomFooter}>
                <Users color={theme.colors.textMuted} size={14} />
                <Text style={styles.memberCount}>{(room.members || []).length} Members</Text>
              </View>
            </Card>
          ))
        )}

        {/* Upcoming Deadlines */}
        {agenda?.dueToday && agenda.dueToday.length > 0 && (
          <View style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Due Today</Text>
              <Badge label="Urgent" variant="danger" />
            </View>
            {agenda.dueToday.map((item: any) => (
              <Card key={item._id} style={styles.agendaCard}>
                <View style={styles.agendaRow}>
                  <AlertCircle color={theme.colors.danger} size={18} />
                  <View style={styles.agendaTextContainer}>
                    <Text style={styles.agendaTitle}>{item.title}</Text>
                    <Text style={styles.agendaSub}>{item.room?.name || 'Classroom'}</Text>
                  </View>
                </View>
              </Card>
            ))}
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
  scrollContent: {
    padding: theme.spacing.md,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  quickCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickTitle: {
    ...theme.typography.h3,
    fontSize: 14,
  },
  quickSub: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h2,
    fontSize: 18,
  },
  sectionMargin: {
    marginTop: theme.spacing.md,
  },
  roomCard: {
    marginBottom: theme.spacing.sm,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    ...theme.typography.h3,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  roomSubject: {
    ...theme.typography.bodySecondary,
    marginTop: 4,
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  memberCount: {
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
  agendaCard: {
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  agendaTextContainer: {
    flex: 1,
  },
  agendaTitle: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  agendaSub: {
    ...theme.typography.caption,
    marginTop: 2,
  },
});
