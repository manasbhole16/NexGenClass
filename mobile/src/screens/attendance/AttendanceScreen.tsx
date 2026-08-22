import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { attendanceApi } from '../../api/attendanceApi';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react-native';

export const AttendanceScreen = ({ navigation }: any) => {
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAttendance = async () => {
    try {
      setRefreshing(true);
      const res = await attendanceApi.getStudentAttendanceSummary();
      setSummary(res);
    } catch (e) {
      console.error('Attendance load error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const percentage = summary?.overallPercentage || 100;
  const isBelow = percentage < 75;

  return (
    <View style={styles.container}>
      <Header title="Attendance Intelligence" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAttendance} tintColor={theme.colors.primary} />}
      >
        {/* Attendance Summary Gauge Card */}
        <Card style={[styles.summaryCard, isBelow && styles.belowBorder]}>
          <Text style={styles.summaryLabel}>Overall Attendance Rate</Text>
          <Text style={[styles.percentageText, { color: isBelow ? theme.colors.danger : theme.colors.success }]}>
            {percentage}%
          </Text>
          <Badge
            label={isBelow ? 'Below 75% Threshold' : 'Good Standing'}
            variant={isBelow ? 'danger' : 'success'}
          />
        </Card>

        {isBelow && (
          <Card style={styles.warningCard}>
            <View style={styles.warningRow}>
              <AlertTriangle color={theme.colors.danger} size={20} />
              <Text style={styles.warningText}>
                Your attendance has fallen below the 75% academic threshold. Please attend upcoming lectures to avoid exam restrictions.
              </Text>
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Course-wise Records</Text>
        {summary?.courseBreakdown && summary.courseBreakdown.length > 0 ? (
          summary.courseBreakdown.map((item: any, idx: number) => (
            <Card key={idx} style={styles.courseCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.courseName}>{item.roomName}</Text>
                <Text style={styles.coursePct}>{item.percentage}%</Text>
              </View>
              <Text style={styles.courseDetails}>Attended {item.presentSessions} of {item.totalSessions} sessions</Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Clock color={theme.colors.textMuted} size={24} />
            <Text style={styles.emptyText}>No attendance records logged yet.</Text>
          </Card>
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
  content: {
    padding: theme.spacing.md,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  belowBorder: {
    borderColor: theme.colors.danger,
  },
  summaryLabel: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  percentageText: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 8,
  },
  warningCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  warningText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  courseCard: {
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseName: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  coursePct: {
    ...theme.typography.h3,
    color: theme.colors.primaryLight,
  },
  courseDetails: {
    ...theme.typography.caption,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: 6,
  },
  emptyText: {
    ...theme.typography.bodySecondary,
  },
});
