import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/authStore';
import { User, Mail, Lock, GraduationCap } from 'lucide-react-native';

export const RegisterScreen = ({ navigation }: any) => {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!fullname.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please complete all fields.');
      return;
    }

    try {
      setLoading(true);
      await register({ fullname: fullname.trim(), email: email.trim(), password: password.trim(), role });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.response?.data?.message || 'Error registering account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.subtitle}>Join your institution's academic workspace</Text>

          {/* Role Toggle */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              onPress={() => setRole('student')}
              style={[styles.roleTab, role === 'student' && styles.roleActive]}
            >
              <GraduationCap size={16} color={role === 'student' ? '#ffffff' : theme.colors.textMuted} />
              <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('teacher')}
              style={[styles.roleTab, role === 'teacher' && styles.roleActive]}
            >
              <User size={16} color={role === 'teacher' ? '#ffffff' : theme.colors.textMuted} />
              <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>Teacher</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <User color={theme.colors.textMuted} size={18} style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textMuted}
              value={fullname}
              onChangeText={setFullname}
              style={styles.input}
            />
          </View>

          <View style={styles.inputRow}>
            <Mail color={theme.colors.textMuted} size={18} style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputRow}>
            <Lock color={theme.colors.textMuted} size={18} style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <Button title="Create Account" onPress={handleRegister} loading={loading} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
            <Text style={styles.linkText}>Already registered? <Text style={styles.linkHighlight}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  formTitle: {
    ...theme.typography.h1,
    fontSize: 26,
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  roleActive: {
    backgroundColor: theme.colors.primary,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  roleTextActive: {
    color: '#ffffff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 14,
  },
  linkButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  linkText: {
    ...theme.typography.bodySecondary,
  },
  linkHighlight: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
});
