import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../../theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/authStore';
import { User, Mail, Shield, LogOut } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of NexGenClass?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Account Profile" />

      <View style={styles.content}>
        {/* User Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(user?.fullname || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.fullname || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
          <Badge label={user?.role || 'student'} variant={user?.role === 'teacher' ? 'primary' : 'info'} />
        </Card>

        {/* Security & System Info */}
        <Card>
          <View style={styles.infoRow}>
            <Shield size={18} color={theme.colors.success} />
            <Text style={styles.infoText}>RBAC Level: {user?.role?.toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Mail size={18} color={theme.colors.info} />
            <Text style={styles.infoText}>Notifications: Active</Text>
          </View>
        </Card>

        <Button title="Sign Out" onPress={handleLogout} variant="danger" />
      </View>
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: 6,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    ...theme.typography.h2,
  },
  userEmail: {
    ...theme.typography.bodySecondary,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  infoText: {
    ...theme.typography.body,
  },
});
