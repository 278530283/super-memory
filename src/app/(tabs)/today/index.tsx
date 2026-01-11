// src/app/(tabs)/today/index.tsx
import SessionCard from '@/src/components/features/today/SessionCard';
import SummaryCard from '@/src/components/features/today/SummaryCard';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { DateUtils } from '@/src/lib/utils/DateUtils';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function TodayScreen() {
  const { user } = useAuthStore();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    getSession,
    createSession,
    clearError: clearSessionError,
  } = useDailyLearningStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [hasShownSummary, setHasShownSummary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'pre_test' | 'post_test' | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false); // 新增：生成计划加载状态

  // 下拉刷新处理函数
  const onRefresh = async () => {
    if (!user?.$id) return;
    
    setRefreshing(true);
    try {
      console.log('[TodayScreen] 下拉刷新，重新加载会话...');
      const today = DateUtils.getLocalDate();
      await getSession(user.$id, today);
    } catch (error) {
      console.error('[TodayScreen] 下拉刷新失败:', error);
      Alert.alert('刷新失败', '请稍后重试');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      if (user?.$id) {
        console.log('[TodayScreen] 加载会话...');
        const today = DateUtils.getLocalDate();
        await getSession(user.$id, today);
        setIsLoading(false);
      }
    };
    loadSession();
  }, [user?.$id, getSession]);

  useEffect(() => {
    const createNewSessionIfNeeded = async () => {
        if (!sessionLoading && !session && user?.$id && !isLoading) {
          console.log('[TodayScreen] 创建新的会话...');
            const userPrefs = useAuthStore.getState().user?.prefs;
            const modeId = userPrefs?.learningMode || "2";
            const englishLevel = userPrefs?.englishLevel || 1;

            try {
                setIsLoading(true);
                await createSession(user.$id, modeId, englishLevel);
            } catch (err) {
                console.error("Failed to create new session:", err);
                Alert.alert('错误', '无法创建今日学习计划。');
            } finally {
                setIsLoading(false);
            }
        }
    };

    createNewSessionIfNeeded();
  }, [session, sessionLoading, user?.$id, isLoading, createSession]);

  useEffect(() => {
    if (sessionError) {
      Alert.alert('出错了', sessionError, [{ text: '知道了', onPress: clearSessionError }]);
    }
  }, [sessionError, clearSessionError]);

  // 显示总结卡片当会话完成时 - 修复重复弹出问题
  // useEffect(() => {
  //   // 只有当会话状态为4（复习完成）、总结卡片未显示、且之前没有显示过总结时，才显示总结
  //   if (session?.status === 4 && !showSummary && !hasShownSummary) {
  //     const timer = setTimeout(() => {
  //       setShowSummary(true);
  //       setHasShownSummary(true);
  //     }, 500);
  //     return () => clearTimeout(timer);
  //   }
  // }, [session?.status, showSummary, hasShownSummary]);

  // 当总结卡片关闭时，更新状态
  const handleCloseSummary = () => {
    setShowSummary(false);
  };

  // 检查阶段是否已完成
  const isPhaseCompleted = (phase: 'pre_test' | 'post_test') => {
    if (!session) return false;
    
    switch (phase) {
      case 'pre_test':
        return session.status > 1;
      case 'post_test':
        return session.status === 4;
      default:
        return false;
    }
  };

  const handleStartPhase = (phase: 'pre_test' | 'post_test') => {
    setCurrentPhase(phase);
    
    if (isPhaseCompleted(phase)) {
      // 只有学习阶段可以继续学习，复习阶段完成后不能继续
      if (phase === 'pre_test') {
        setShowCompletionModal(true);
      } else {
        // 复习阶段已完成，显示提示
        Alert.alert('提示', '今日复习已完成，请明天再来！');
      }
      return;
    }
    
    if (session?.$id) {
      router.push(`/(tabs)/today/${session.$id}/test/${phase}`);
    }
  };

  const handleRestartLearning = async () => {
    if (!session?.$id || !user?.$id) return;

    setIsGeneratingPlan(true); // 开始生成计划，显示加载状态

    try {
      // 1. 获取用户偏好设置
      const userPrefs = useAuthStore.getState().user?.prefs;
      const modeId = userPrefs?.learningMode || "2";
      const englishLevel = userPrefs?.englishLevel || 1;

      // 2. 使用 store 方法添加加量单词
      await useDailyLearningStore.getState().addIncrementalWords(
        session.$id,
        user.$id,
        modeId,
        englishLevel
      );

      // 3. 关闭模态框
      setShowCompletionModal(false);
      
      // 4. 跳转到学习页面
      router.push(`/(tabs)/today/${session.$id}/test/pre_test`);

    } catch (error: any) {
      console.error('加量学习失败:', error);
      Alert.alert('错误', error.message || '加量学习失败，请稍后重试');
    } finally {
      setIsGeneratingPlan(false); // 无论成功失败都关闭加载状态
    }
  };

  const getStatusText = (
    status: number | undefined,
    progress: string | null | undefined,
    phase: 'pre_test' | 'post_test'
  ) => {
    if (status === undefined) return '未知状态';
    switch (phase) {
      case 'pre_test':
        if (status === 0) return '待开始';
        if (status === 1) return '进行中... ';
        if (status > 1) return '已完成 ✅';
        break;
      case 'post_test':
        if (status <= 1) return '等待中... (🔒)';
        if (status === 2 && progress?.startsWith('0')) return '待开始';
        if (status === 2|| status === 3) return '进行中... ';
        if (status === 4) return '已完成 ✅';
        break;
    }
    return '未知状态';
  };

  const isPhaseUnlocked = (phase: 'pre_test' | 'post_test') => {
    if (!session) return false;
    switch (phase) {
      case 'pre_test':
        return true;
      case 'post_test':
        return session.status > 1;
      default:
        return false;
    }
  };

  // 获取按钮文本
  const getButtonText = (phase: 'pre_test' | 'post_test') => {
    const isCompleted = isPhaseCompleted(phase);
    const isUnlocked = isPhaseUnlocked(phase);
    if(session!=null)
      console.log(session.status)
    console.log('phase:', phase);
    console.log('isUnlocked:', isUnlocked);
    console.log('isCompleted:', isCompleted);
    
    if (!isUnlocked) return '';
    if (isCompleted) {
      // 只有学习阶段可以继续学习
      return phase === 'pre_test' ? '继续学习' : '已完成';
    }
    if (phase === 'pre_test' && session?.status === 0) return '开始学习';
    if (phase === 'pre_test' && session?.status === 1) return '继续学习';
    if (phase === 'post_test' && session?.status === 2) return '开始复习';
    if (phase === 'post_test' && session?.status === 3) return '继续复习';
    return '开始';
  };

  // 检查按钮是否禁用
  const isButtonDisabled = (phase: 'pre_test' | 'post_test') => {
    const isCompleted = isPhaseCompleted(phase);
    // 复习阶段完成后禁用按钮
    if (phase === 'post_test' && isCompleted) return true;
    return false;
  };

  const summaryData = {
    newData: 3,
    reviewData: 4,
    levelUpData: 2,
    correctRate: 85,
  };

  // --- Render ---
  if (isLoading || (sessionLoading && !session)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D9CDB" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>未找到今日学习会话。请稍后重试或联系支持。</Text>
      </View>
    );
  }

  const modeDetails = { mode_name: '正常', word_count: 7, phrase_count: 1, sentence_count: 1 };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2D9CDB']}
          tintColor="#2D9CDB"
          title="下拉刷新..."
          titleColor="#718096"
        />
      }
    >
      {/* <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>今日计划</Text>
      </View> */}
      <Text style={styles.mode}>当前模式：{modeDetails.mode_name}模式</Text>

      <SessionCard
        title="学习"
        subtitle="学习新单词和知识点"
        status={getStatusText(session.status, session.pre_test_progress, 'pre_test')}
        progress={session.pre_test_progress || '0/0'}
        buttonText={getButtonText('pre_test')}
        onStart={() => handleStartPhase('pre_test')}
        isLocked={!isPhaseUnlocked('pre_test')}
        disabled={isButtonDisabled('pre_test')}
      />

      <SessionCard
        title="复习"
        subtitle="巩固今日学习成果"
        status={getStatusText(session.status, session.post_test_progress, 'post_test')}
        progress={session.post_test_progress || '0/0'}
        buttonText={getButtonText('post_test')}
        onStart={() => handleStartPhase('post_test')}
        isLocked={!isPhaseUnlocked('post_test')}
        disabled={isButtonDisabled('post_test')}
      />

      {/* Summary Card Modal */}
      <SummaryCard
        isVisible={showSummary}
        onClose={handleCloseSummary}
        newData={summaryData.newData}
        reviewData={summaryData.reviewData}
        levelUpData={summaryData.levelUpData}
        correctRate={summaryData.correctRate}
      />

      {/* 完成确认对话框 - 仅用于学习阶段 */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isGeneratingPlan && setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {isGeneratingPlan ? (
              <>
                <ActivityIndicator size="large" color="#2D9CDB" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>生成学习计划中...</Text>
                <Text style={styles.modalText}>
                  正在为您准备新的学习内容，请稍候...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={80} color="#27AE60" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>学习已完成</Text>
                <Text style={styles.modalText}>
                  是否要继续加量学习新单词？
                </Text>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.cancelButton,
                  isGeneratingPlan && styles.disabledButton
                ]}
                onPress={() => setShowCompletionModal(false)}
                disabled={isGeneratingPlan}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  isGeneratingPlan && styles.disabledButton
                ]}
                onPress={handleRestartLearning}
                disabled={isGeneratingPlan}
              >
                {isGeneratingPlan ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.loadingButtonText}>生成中...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>继续</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    backgroundColor: '#F8F9FA',
    flexGrow: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  headerProgress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D9CDB',
  },
  mode: { 
    fontSize: 16, 
    color: '#718096', 
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#718096',
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2D3748',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#718096',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: '#2D9CDB',
  },
  cancelButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 新增样式
  disabledButton: {
    backgroundColor: '#B0BEC5',
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});