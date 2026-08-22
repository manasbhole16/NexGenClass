import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary' }) => {
  const getBadgeColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: theme.colors.success };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: theme.colors.warning };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: theme.colors.danger };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: theme.colors.info };
      case 'primary':
      default:
        return { bg: 'rgba(147, 51, 234, 0.15)', text: theme.colors.primaryLight };
    }
  };

  const colors = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
