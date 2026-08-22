import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { notificationApi } from '../../api/notificationApi';
import { NotificationItem } from '../../types';
import { Bell, Check, Trash2 } from 'lucide-react-native';

export const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      const res = await notificationApi.getNotifications();
      setNotifications(res.notifications || []);
    } catch {
      // Handle error
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      loadNotifications();
    } catch {
      // Handle error
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Notifications" onBack={() => navigation.goBack()} />

      <View style={styles.topActions}>
        <Text style={styles.countText}>{notifications.filter((n) => !n.isRead).length} Unread</Text>
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
          <Check size={14} color={theme.colors.primaryLight} />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadNotifications} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Bell color={theme.colors.textMuted} size={28} />
            <Text style={styles.emptyText}>No notifications right now.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={[styles.notifCard, !item.isRead && styles.unreadCard]}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.notifMessage}>{item.message}</Text>
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
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  countText: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  notifCard: {
    marginBottom: theme.spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  notifTime: {
    ...theme.typography.caption,
  },
  notifMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
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
