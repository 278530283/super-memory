// src/app/(tabs)/profile/index.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function ProfileScreen() {
  const { user, logout, updateName, updatePreferences } = useAuthStore();
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [englishLevelModalVisible, setEnglishLevelModalVisible] = useState(false);
  const [tempNickname, setTempNickname] = useState(user?.name || '');
  const [tempEnglishLevel, setTempEnglishLevel] = useState(user?.prefs?.englishLevel?.toString() || '2');
  const [tempGrade, setTempGrade] = useState<string | null>(user?.prefs?.grade?.toString() || null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      Alert.alert('错误', '退出登录失败');
    }
  };

  const handleSaveNickname = async () => {
    try {
      await updateName(tempNickname);
      setNicknameModalVisible(false);
      Alert.alert('成功', '昵称已更新');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleSaveEnglishLevel = async () => {
    try {
      const updates: any = {
        englishLevel: parseInt(tempEnglishLevel, 10)
      };
      
      if (tempEnglishLevel === '2') {
        updates.grade = tempGrade ? parseInt(tempGrade, 10) : null;
      } else {
        updates.grade = null;
      }

      await updatePreferences(updates);
      setEnglishLevelModalVisible(false);
      Alert.alert('成功', '英语水平已更新');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const getEnglishLevelText = () => {
    const levelMap: { [key: string]: string } = {
      '1': '零基础',
      '2': '小学',
      '3': '初中', 
      '4': '高中'
    };
    
    const levelText = levelMap[user?.prefs?.englishLevel?.toString() || '2'] || '小学';
    
    if (user?.prefs?.englishLevel === 2 && user?.prefs?.grade) {
      const gradeMap: { [key: string]: string } = {
        '1': '一年级',
        '2': '二年级',
        '3': '三年级',
        '4': '四年级', 
        '5': '五年级',
        '6': '六年级'
      };
      return `${levelText} ${gradeMap[user.prefs.grade.toString()] || ''}`;
    }
    
    return levelText;
  };

  const getRoleText = () => {
    return user?.prefs?.role === 2 ? '家长' : '学生';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 用户信息卡片 */}
      <View style={styles.userCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0) || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <TouchableOpacity 
            style={styles.infoItem}
            onPress={() => {
              setTempNickname(user?.name || '');
              setNicknameModalVisible(true);
            }}
          >
            <Text style={styles.infoLabel}>昵称</Text>
            <Text style={styles.infoValue}>
              {user?.name || '未设置'}
            </Text>
            <Ionicons name="create-outline" size={18} color="#4A90E2" />
          </TouchableOpacity>
          
          {/* <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>身份</Text>
            <Text style={styles.infoValue}>{getRoleText()}</Text>
          </View> */}
          
          <TouchableOpacity 
            style={styles.infoItem}
            onPress={() => {
              setTempEnglishLevel(user?.prefs?.englishLevel?.toString() || '2');
              setTempGrade(user?.prefs?.grade?.toString() || null);
              setEnglishLevelModalVisible(true);
            }}
          >
            <Text style={styles.infoLabel}>英语水平</Text>
            <Text style={styles.infoValue}>{getEnglishLevelText()}</Text>
            <Ionicons name="create-outline" size={18} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本周成就</Text>
        <View style={styles.achievementRow}>
          <Text>学习天数：</Text>
          <Text style={styles.bold}>7天</Text>
        </View>
        <View style={styles.achievementRow}>
          <Text>学习单词：</Text>
          <Text style={styles.bold}>120个</Text>
        </View>
      </View>

      {/* 学习设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>学习设置</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/settings/preferences')}
        >
          <View style={styles.settingInfo}>
            <View style={styles.settingTitleContainer}>
              <Ionicons name="library-outline" size={20} color="#4A90E2" />
              <Text style={styles.settingName}> 学习偏好</Text>
            </View>
            <Text style={styles.settingDescription}>
              学习模式、拼写测试
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/settings/review-strategy')}
        >
          <View style={styles.settingInfo}>
            <View style={styles.settingTitleContainer}>
              <Ionicons name="refresh-outline" size={20} color="#4A90E2" />
              <Text style={styles.settingName}> 复习策略</Text>
            </View>
            <Text style={styles.settingDescription}>
              FSRS智能算法 vs 传统间隔重复
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.listItem}>
          <View style={styles.listItemContent}>
            <Ionicons name="stats-chart-outline" size={20} color="#333" />
            <Text style={styles.listItemText}>学习报告</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <View style={styles.listItemContent}>
            <Ionicons name="help-circle-outline" size={20} color="#333" />
            <Text style={styles.listItemText}>帮助与反馈</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.listItem, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <View style={styles.listItemContent}>
            <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
            <Text style={styles.logoutText}>退出登录</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 修改昵称模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={nicknameModalVisible}
        onRequestClose={() => setNicknameModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改昵称</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="请输入昵称"
              value={tempNickname}
              onChangeText={setTempNickname}
              maxLength={20}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setNicknameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveNickname}
              >
                <Text style={styles.confirmButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 修改英语水平模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={englishLevelModalVisible}
        onRequestClose={() => setEnglishLevelModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置英语水平</Text>
            
            <Text style={styles.modalLabel}>英语水平</Text>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={(value) => {
                  setTempEnglishLevel(value);
                  if (value !== '2') setTempGrade(null);
                }}
                items={[
                  { label: '零基础', value: '1' },
                  { label: '小学', value: '2' },
                  { label: '初中', value: '3' },
                  { label: '高中', value: '4' },
                ]}
                value={tempEnglishLevel}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
              />
            </View>

            {tempEnglishLevel === '2' && (
              <>
                <Text style={styles.modalLabel}>小学年级</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={(value) => setTempGrade(value)}
                    items={[
                      { label: '一年级', value: '1' },
                      { label: '二年级', value: '2' },
                      { label: '三年级', value: '3' },
                      { label: '四年级', value: '4' },
                      { label: '五年级', value: '5' },
                      { label: '六年级', value: '6' },
                    ]}
                    value={tempGrade}
                    style={pickerSelectStyles}
                    placeholder={{ label: '请选择年级', value: null }}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEnglishLevelModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveEnglishLevel}
              >
                <Text style={styles.confirmButtonText}>保存</Text>
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    minWidth: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
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
    marginBottom: 12,
    color: '#333',
  },
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 24,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 16,
    marginLeft: 8,
  },
  logoutButton: {},
  logoutText: {
    color: '#ff3b30',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const pickerSelectStyles = StyleSheet.create({
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