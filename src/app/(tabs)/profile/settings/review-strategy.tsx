// src/app/(tabs)/profile/settings/review-strategy.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { UserPreferences } from '@/src/types/User';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function ReviewStrategySettings() {
  const [reviewStrategy, setReviewStrategy] = useState<string>('2');
  const [isSaving, setIsSaving] = useState(false);
  const { user, updatePreferences } = useAuthStore();

  // 从用户数据加载现有设置
  useEffect(() => {
    if (user && user.prefs) {
      setReviewStrategy(user.prefs.reviewStrategy?.toString() || '2');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<UserPreferences> = {
        reviewStrategy: parseInt(reviewStrategy, 10),
      };

      await updatePreferences(updates);
      Alert.alert('成功', '复习策略已更新', [
        {
          text: '确定',
          onPress: () => {
            router.replace('/profile');
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const strategies = [
    { 
      id: '2', 
      name: 'FSRS智能算法', 
      desc: 'AI驱动的自适应复习，根据记忆曲线动态调整',
      features: [
        '✓ 智能预测遗忘点',
        '✓ 个性化间隔调整', 
        '✓ 学习效率最大化',
        '✓ 基于最新记忆科学研究'
      ],
      recommended: true,
      color: '#10B981'
    },
    { 
      id: '1', 
      name: '传统间隔重复', 
      desc: '固定的复习间隔，简单可靠',
      features: [
        '✓ 固定时间间隔',
        '✓ 简单易用',
        '✓ 经典可靠',
        '✓ 适合初学者'
      ],
      recommended: false,
      color: '#6B7280'
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>复习策略设置</Text>
      <Text style={styles.subtitle}>选择适合你的单词复习算法</Text>
      
      <View style={styles.strategiesContainer}>
        {strategies.map((strategy) => (
          <TouchableOpacity
            key={strategy.id}
            style={[
              styles.strategyCard, 
              reviewStrategy === strategy.id && [styles.selectedStrategyCard, { borderColor: strategy.color }]
            ]}
            onPress={() => setReviewStrategy(strategy.id)}
          >
            <View style={styles.strategyHeader}>
              <View style={styles.strategyTitleContainer}>
                <Text style={[
                  styles.strategyName, 
                  reviewStrategy === strategy.id && [styles.selectedStrategyName, { color: strategy.color }]
                ]}>
                  {strategy.name}
                </Text>
                {strategy.recommended && (
                  <View style={[styles.recommendedBadge, { backgroundColor: strategy.color }]}>
                    <Text style={styles.recommendedText}>推荐</Text>
                  </View>
                )}
              </View>
              
              {/* 选择指示器 */}
              <View style={[
                styles.radioOuter,
                reviewStrategy === strategy.id && [styles.radioOuterSelected, { borderColor: strategy.color }]
              ]}>
                {reviewStrategy === strategy.id && (
                  <View style={[styles.radioInner, { backgroundColor: strategy.color }]} />
                )}
              </View>
            </View>

            <Text style={styles.strategyDesc}>{strategy.desc}</Text>
            
            <View style={styles.featuresContainer}>
              {strategy.features.map((feature, index) => (
                <Text key={index} style={styles.featureText}>{feature}</Text>
              ))}
            </View>

            {reviewStrategy === strategy.id && (
              <View style={[styles.selectedIndicator, { backgroundColor: strategy.color }]}>
                <Text style={styles.selectedIndicatorText}>当前选择</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 策略说明 */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>算法说明</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoHighlight}>FSRS智能算法</Text>：基于最新的记忆科学研究，会根据你的学习表现动态调整复习间隔，实现最高效的学习效果。
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoHighlight}>传统间隔重复</Text>：使用固定的复习时间表（如1天、3天、7天等），简单直观，适合刚开始使用间隔重复的用户。
        </Text>
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
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
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
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
    marginBottom: 8,
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  strategiesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  strategyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedStrategyCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  strategyTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  strategyName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1A1A1A',
  },
  selectedStrategyName: {
    fontWeight: 'bold',
  },
  strategyDesc: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  radioOuterSelected: {
    borderWidth: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectedIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12,
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoHighlight: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  saveButton: { 
    backgroundColor: '#10B981', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    marginBottom: 12,
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
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  cancelButtonText: { 
    color: '#666',
    fontSize: 16,
  },
});