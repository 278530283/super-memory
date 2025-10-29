// src/app/(tabs)/profile/settings/preferences.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { UserPreferences } from '@/src/types/User';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function PreferencesSettings() {
  const [learningMode, setLearningMode] = useState<string>('2');
  const [enableSpelling, setEnableSpelling] = useState<boolean>(false);
  const [pronounce, setPronounce] = useState<string>('1');
  const [isSaving, setIsSaving] = useState(false);
  const { user, updatePreferences } = useAuthStore();

  // 从用户数据加载现有设置
  useEffect(() => {
    if (user && user.prefs) {
      setLearningMode(user.prefs.learningMode?.toString() || '2');
      setEnableSpelling(!!user.prefs.enableSpelling);
      setPronounce(user.prefs.pronounce?.toString() || '1');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<UserPreferences> = {
        learningMode,
        pronounce: parseInt(pronounce, 10),
        enableSpelling,
      };

      await updatePreferences(updates);
      Alert.alert('成功', '学习偏好已更新', [
        {
          text: '确定',
          onPress: () => {
            router.back();
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      
      {/* 学习模式选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>学习模式</Text>
        <Text style={styles.sectionDescription}>
          选择适合你的学习强度
        </Text>
        
        <View style={styles.modeContainer}>
          {[
            { id: '1', name: '轻松模式', desc: '10-15分钟 | 5词+1组+1句', color: '#10B981' },
            { id: '2', name: '正常模式', desc: '15-20分钟 | 7词+1组+1句', color: '#4A90E2' },
            { id: '3', name: '努力模式', desc: '20-25分钟 | 10词+2组+1-2句', color: '#EF4444' },
          ].map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeCard, 
                learningMode === mode.id && [styles.selectedModeCard, { borderColor: mode.color }]
              ]}
              onPress={() => setLearningMode(mode.id)}
            >
              <View style={styles.modeHeader}>
                <Text style={[
                  styles.modeName, 
                  learningMode === mode.id && [styles.selectedModeName, { color: mode.color }]
                ]}>
                  {mode.name}
                </Text>
                {learningMode === mode.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: mode.color }]}>
                    <Text style={styles.selectedBadgeText}>已选择</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeDesc}>{mode.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 拼写测试开关 */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchLabel}>启用拼写测试</Text>
            <Text style={styles.switchDescription}>
              开启后会在学习过程中加入拼写练习
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
            thumbColor={enableSpelling ? "#4A90E2" : "#F3F4F6"}
            ios_backgroundColor="#D1D5DB"
            onValueChange={setEnableSpelling}
            value={enableSpelling}
          />
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.cancelButton, isSaving && styles.cancelButtonDisabled]}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>保存设置</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 24,
    color: '#1A1A1A',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modeContainer: {
    gap: 12,
  },
  modeCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  selectedModeCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  selectedModeName: {
    fontWeight: 'bold',
  },
  modeDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  saveButton: { 
    flex: 1,
    backgroundColor: '#4A90E2', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { 
    backgroundColor: '#A0A0A0' 
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: { 
    flex: 1,
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: { 
    color: '#666',
    fontSize: 16,
  },
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0,
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
  },
});