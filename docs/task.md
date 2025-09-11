请为我生成一个基于 React Native + Expo 的 APP 前端代码。

核心要求:

1.  技术栈: 严格遵循 `expo.md` 的编码规范。使用 `expo-router` 进行路由管理，实现受保护路由（Protected Routes）来控制登录访问。使用 `zustand` 进行全局状态管理（包括持久化）。
2.  后端: 使用 `Appwrite` 作为后端服务。根据 `architecture.md` 的指导，将 Appwrite SDK 初始化，并创建服务层 (`services/`) 来封装对 Appwrite 数据库、账户等的操作。
3.  目录结构: 所有代码文件放入 `src/` 目录下。请先给出符合 `expo-router` 和 `expo.md` 规范的 `src/` 目录结构。

生成顺序与重点:

请按照以下优先级逐步生成代码：

1.  核心状态管理 (`src/lib/stores/`): 基于 `database.md` 和 `architecture.md` 中的用户、学习会话等实体，以及 `requirements.md` 的流程，生成关键的 Zustand Store 文件（如 `useAuthStore.ts`, `useDailyLearningStore.ts`）。明确使用 `persist` 中间件持久化认证状态。
2.  Appwrite 服务层 (`src/lib/services/`): 生成封装 Appwrite API 调用的服务文件（如 `authService.ts`, `userService.ts`, `dailyLearningService.ts`），与 Store 对应。
3.  路由与权限 (`src/app/`, `src/components/`): 实现 `expo-router` 的路由结构（包括 `(auth)`, `(tabs)` 布局），并创建 `ProtectedRoute` 组件来保护需要登录的路由。
4.  核心页面 (`src/app/`): 生成关键页面，如登录页 (`(auth)/login.tsx`)、注册第一步 (`(auth)/register/step1.tsx`)、今日学习主页 (`(tabs)/today/index.tsx`) 和评测子流程 (`(tabs)/today/[sessionId]/test/[type]/index.tsx`)。确保 UI 严格遵循 `user_interface.md` 和 `requirements.md` 的设计（三步流程、状态显示、锁逻辑）。
5.  关键组件 (`src/components/`): (可选，如果篇幅允许) 生成评测题型组件的骨架代码 (如 `ListenWord.tsx`, `TranslateEnToZh.tsx`)。

具体细节要求:

Zustand: Store 应管理对应实体的状态（如用户信息、学习会话状态、进度），提供修改状态的 actions，并正确处理异步操作（如登录、获取数据）及加载/错误状态。
Appwrite 服务: 服务应封装具体的 SDK 调用，处理请求和响应，并在出错时抛出异常供 Store 处理。
UI 与交互: 页面和组件应使用 `react-native` 和 `expo-router` 组件构建，样式遵循 `expo.md` 和 `requirements.md`。例如，“今日学习”页面应清晰展示三个步骤的状态（待开始/进行中/已完成/🔒），按钮交互应与状态联动。
类型: (隐含于 `expo.md`) 尽可能使用 TypeScript 接口定义 props、state 和服务返回值，接口定义可暂存于 `types/`。

请先规划好 `src/` 目录结构，然后按上述优先级，有序地生成每个指定部分或文件的代码。