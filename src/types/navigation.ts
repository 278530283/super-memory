// src/types/navigation.ts
// 定义应用中所有导航器的参数类型

// --- 认证流程导航参数 (Auth Stack) ---
export type AuthStackParamList = {
  /**
   * 手机号注册页面
   * 无参数
   */
  RegisterPhone: undefined;

  /**
   * 用户信息配置页面 (注册流程第二步)
   * @param tempUserId - 后端验证手机号后返回的临时用户ID
   * @param phone - 用户注册的手机号 (用于回显或后续验证)
   */
  RegisterUserInfo: { tempUserId: string; phone: string };

  /**
   * 登录页面 (如果应用包含独立登录功能)
   * 无参数 (或可携带 redirectUrl 等参数)
   */
  Login: undefined; // | { redirectUrl?: string };
  // 可以根据需要添加忘记密码等页面
  // ForgotPassword: undefined;
};

// --- 主应用标签栏导航参数 (Main Tab) ---
// 需要导入或定义主应用页面的 Screen 名称和参数
// 例如，如果首页不需要参数:
// Home: undefined;
// 如果学习页需要模式参数:
// Learning: { mode?: 'easy' | 'normal' | 'hard' };
// 暂时用 any 占位，实际开发时应替换为具体的参数类型
export type MainTabParamList = {
  Home: undefined;
  Learning: undefined; // 或 { mode?: string }
  Review: undefined;
  Stats: undefined;
  Profile: undefined;
  // 如果 Learning 内部还有更复杂的导航，可以定义 LearningStackParamList
};

// --- 学习流程导航参数 (Learning Stack, 如果嵌套在Tab内) ---
// export type LearningStackParamList = {
//   LearningList: undefined; // 学习单词列表
//   LearningDetail: { wordId: string; level: number }; // 具体单词学习详情
//   // ... 其他学习子页面
// };

// --- 复习流程导航参数 (Review Stack) ---
// export type ReviewStackParamList = {
//   ReviewList: undefined; // 复习单词列表
//   ReviewDetail: { wordId: string }; // 具体单词复习详情
//   // ... 其他复习子页面
// };

// --- 如果使用了 Drawer 导航或其他自定义导航器，也在这里定义 ---
// export type RootDrawerParamList = {
//   MainTabs: NavigatorScreenParams<MainTabParamList>; // 嵌套标签栏
//   Settings: undefined;
// };
