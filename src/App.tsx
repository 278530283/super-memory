// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store, persistor } from './redux/store';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
// import * as SplashScreen from 'expo-splash-screen'; // 如果使用启动屏

// SplashScreen.preventAutoHideAsync(); // 如果使用启动屏

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 在这里可以进行一些初始化操作，例如：
        // - 加载字体
        // - 预加载数据
        // - 检查初始路由状态
        // await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟加载
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // SplashScreen.hideAsync(); // 如果使用启动屏
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    // 可以返回一个启动屏组件
    return null; // 或 <AppLoading /> from expo-app-loading
  }

  return (
    <Provider store={store}>
      {/* PersistGate 用于在 Redux store 恢复持久化状态后再渲染应用 */}
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
