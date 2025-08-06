// src/components/auth/RoleSelector.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '../common/Button';

interface RoleSelectorProps {
  selectedRole: 'student' | 'parent' | null;
  onSelectRole: (role: 'student' | 'parent') => void;
  error?: string;
}

/**
 * 角色选择组件 (学生/家长)
 * 用于注册流程中的角色选择步骤
 */
export function RoleSelector({ selectedRole, onSelectRole, error }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>选择你的角色</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="学生"
          variant={selectedRole === 'student' ? 'primary' : 'secondary'}
          onPress={() => onSelectRole('student')}
          style={styles.roleButton}
        />
        <Button
          title="家长"
          variant={selectedRole === 'parent' ? 'primary' : 'secondary'}
          onPress={() => onSelectRole('parent')}
          style={styles.roleButton}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
});
