import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { plannerApi } from '../../api/plannerApi';
import { Calendar, CheckCircle2, Circle } from 'lucide-react-native';

export const PlannerScreen = ({ navigation }: any) => {
  const [events, setEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlanner = async () => {
    try {
      setRefreshing(true);
      const res = await plannerApi.getPlannerEvents({ eventType: 'all' });
      setEvents(res.events || []);
    } catch (e) {
      console.error('Planner load error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlanner();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Academic Planner" onBack={() => navigation.goBack()} />

      <FlatList
        data={events}
        keyExtractor={(item, index) => item._id || String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadPlanner} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Calendar color={theme.colors.textMuted} size={28} />
            <Text style={styles.emptyText}>No upcoming deadlines or tasks.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.eventCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
              <Badge label={item.eventType || 'Task'} variant={item.eventType === 'assignment' ? 'primary' : 'info'} />
            </View>
            <Text style={styles.eventDate}>
              {item.start ? new Date(item.start).toLocaleString() : 'No date specified'}
            </Text>
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
  eventCard: {
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    ...theme.typography.h3,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  eventDate: {
    ...theme.typography.caption,
    marginTop: 4,
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
