
# 增强记忆学习软件-技术方案 (优化版)

**版本：0.1**
**日期：2025年9月7日**

---

## 一、技术栈总览 (保持不变)

| 模块 | 核心技术栈 | 辅助工具/框架 | 部署环境 |
| :--- | :--- | :--- | :--- |
| **前端** | React Native + TypeScript + Expo | React Navigation, Redux Toolkit, Appwrite SDK | 阿里云OSS（静态资源） |
| **后端** | Appwrite 1.5+ | Appwrite Functions (Node.js/Python), Appwrite Webhooks | Appwrite Cloud 或 自托管于阿里云ECS |
| **数据存储** | Appwrite Database (文档型) + Appwrite Storage | 无 | 同上 |
| **网络通信** | HTTP/HTTPS (Appwrite RESTful API) | Appwrite SDK (前端), Axios (备用) | 无需负载均衡，Appwrite 自带 |

**核心变更说明：** 原 Spring Boot + MySQL + Redis 的复杂后端架构，被替换为统一的 Appwrite 服务。所有用户、数据、文件、函数均由 Appwrite 管理，前端通过官方 SDK 直接调用。

---

## 二、前端技术方案（React Native + TypeScript + Expo + Appwrite SDK）

### 1. 项目架构设计 (优化版)

项目架构根据数据库表结构和界面核心流程进行了细化，特别是 `services` 和 `redux/slices` 层，以更好地管理复杂的状态和业务逻辑。

```
src/
├── api/               # Appwrite SDK 初始化与封装
│   └── appwrite.ts    # 初始化客户端，导出数据库、账户、存储等服务实例
├── components/        # 通用组件库 (如进度卡片、评测题型组件)
├── navigation/        # 路由配置 (严格遵循“今日学习”三步流程)
├── redux/             # 状态管理 (根据核心实体划分)
│   ├── slices/        
│   │   ├── authSlice.ts        # 用户认证状态 (登录、注册)
│   │   ├── userSlice.ts        # 用户档案信息 (昵称、角色、水平、偏好)
│   │   ├── learningModeSlice.ts # 学习模式配置
│   │   ├── dailyLearningSlice.ts # 今日学习核心状态 (三阶段进度、单词列表)
│   │   ├── wordProgressSlice.ts # 单词掌握进度 (L0-L4, 语速)
│   │   └── reviewSlice.ts      # 复习相关状态 (待复习词、复习策略)
│   └── store.ts       # Redux Store 配置
├── screens/           # 页面组件 (严格对应UI设计)
│   ├── Auth/          # 注册与登录相关页面
│   ├── Home/          # “今日学习”Tab主页面及子流程
│   ├── QuickReview/   # “快速复习”页面
│   ├── SpecialTraining/ # “专项训练”页面
│   └── Profile/       # “我的”页面
├── services/          # 业务服务层 (核心数据操作抽象)
│   ├── authService.ts          # 封装用户注册、登录、登出
│   ├── userService.ts          # 封装用户档案的读写 (user_preferences)
│   ├── dailyLearningService.ts # 封装“今日学习”全流程数据操作
│   │                           # - 获取/生成今日单词列表 (daily_words)
│   │                           # - 更新单词进度 (user_word_progress)
│   │                           # - 记录学习报告 (learning_record, learning_word)
│   ├── wordService.ts          # 封装单词基础信息查询 (word)
│   ├── reviewService.ts        # 封装复习逻辑 (review_record, review_strategy)
│   ├── pronunciationService.ts # 封装AI发音评估 (调用函数 + 记录结果)
│   ├── ocrService.ts           # 封装OCR功能 (调用函数 + 记录结果)
│   └── morphemeService.ts      # 封装词根词缀相关逻辑 (新增)
├── types/             # TypeScript类型定义 (基于数据库表结构)
│   ├── User.ts
│   ├── Word.ts
│   ├── LearningMode.ts
│   ├── UserWordProgress.ts
│   ├── PronunciationEvaluation.ts
│   ├── Morpheme.ts             # 新增词素相关类型
│   └── ... (其他表对应的类型)
├── utils/             # 工具函数 (如题型生成逻辑、等级计算算法)
└── App.tsx            # 入口组件
```

### 2. 核心技术实现 (优化版)

#### （1）Appwrite 数据库集合映射

这是本方案最关键的优化。我们将关系型数据库表结构映射到 Appwrite 的文档型集合中，并明确各集合的字段和关系。

**Appwrite 项目: `MemoryApp`**
**Appwrite 数据库: `main`**

| 数据库表 (原MySQL) | Appwrite 集合名称 | 主要字段 (JSON Schema) | 关联/说明 |
| :--- | :--- | :--- | :--- |
| `user` | `users` | 由 Appwrite `Account` 服务自动管理，仅存储基础账户信息 (email, phone, name)。 | **分离存储**：用户的详细偏好信息存储在 `user_preferences` 集合。 |
| `user` (偏好部分) | `user_preferences` | `userId` (string), `nickname` (string), `pronunciation_preference` (number: 1/2), `role` (number: 1/2), `english_level` (number: 1-4), `grade` (number, optional), `default_learning_mode` (number: 1-3) | 通过 `userId` 与 `Account` 服务关联。 |
| `learning_mode` | `learning_modes` | `id` (number), `mode_name` (string), `duration_range` (string), `word_count` (number), `phrase_count` (number), `sentence_count` (number) | 静态配置数据，应用启动时可缓存。 |
| `word` | `words` | `id` (string), `spelling` (string), `chinese_meaning` (string), `syllable_count` (number), `is_abstract` (boolean), `letter_count` (number), `british_audio` (string, fileID), `american_audio` (string, fileID), `speed_sensitivity` (number: 1-3), `difficulty_level` (number: 1-3), `is_analyzed` (boolean) | 音频文件为 Appwrite Storage 的 `fileId`。 |
| `user_word_progress` | `user_word_progress` | `userId` (string), `wordId` (string), `currentLevel` (number: 0-4), `currentSpeed` (number), `lastLearnTime` (datetime), `lastReviewTime` (datetime) | **动态字段 `is_long_difficult` 在前端根据 `user` 和 `word` 数据实时计算，不在数据库存储。** |
| `pronunciation_evaluation` | `pronunciation_evaluations` | `userId` (string), `wordId` (string), `evaluationTime` (datetime), `syllableCompleteness` (number), `stressAccuracy` (number), `phonemeMatching` (number), `isPassed` (boolean), `speedUsed` (number) |  |
| `learning_record` | `learning_records` | `userId` (string), `learningDate` (date), `modeId` (number), `startTime` (datetime), `endTime` (datetime), `testCorrectRate` (number), `totalDuration` (number) |  |
| `learning_word` | `learning_words` | `learningRecordId` (string), `wordId` (string), `masteryChange` (number) |  |
| `review_strategy` | `review_strategies` | `id` (number), `strategyName` (string), `applicableCondition` (string), `intervalRule` (string), `frequency` (number) | 静态配置数据。 |
| `review_record` | `review_records` | `userId` (string), `wordId` (string), `reviewTime` (datetime), `strategyId` (number), `reviewMethod` (number), `correctRate` (number), `speedUsed` (number) |  |
| `custom_material` | `custom_materials` | `userId` (string), `wordId` (string), `memoryStory` (string), `customImage` (string, fileID), `recordingPath` (string, fileID), `recordingSpeed` (number) |  |
| `article` | `articles` | `userId` (string), `uploadTime` (datetime), `ocrText` (string), `imagePath` (string, fileID), `extractedWordIds` (array of strings) |  |
| `level_assessment` | `level_assessments` | `userId` (string), `assessmentTime` (datetime), `vocabularySize` (number), `levelDistribution` (object), `weakPoints` (string), `speedAdaptability` (object) |  |
| `morpheme` | `morphemes` | `id` (string), `morphemeText` (string), `type` (number: 1-3), `meaningZh` (string), `meaningEn` (string), `origin` (string), `description` (string), `priority` (number), `difficultyLevel` (number) | 词根词缀系统核心表。 |
| `word_morpheme_association` | `word_morpheme_associations` | `wordId` (string), `morphemeId` (string), `orderIndex` (number) |  |
| `morpheme_relation` | `morpheme_relations` | `parentMorphemeId` (string), `childMorphemeId` (string), `relationType` (number) |  |
| `user_morpheme_progress` | `user_morpheme_progress` | `userId` (string), `morphemeId` (string), `masteryLevel` (number: 0-3), `lastEncounteredTime` (datetime), `lastStudiedTime` (datetime) |  |

**Appwrite 存储桶 (Storage): `word-assets`**
用于存储所有单词的图片、音频文件以及用户上传的自定义材料。

#### （2）用户注册与登录（替换原 AuthController）

保持不变，使用 Appwrite 的 `Account` 服务。

```typescript
// api/appwrite.ts (初始化)
import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint('https://[YOUR_APPWRITE_ENDPOINT]/v1')
  .setProject('your-project-id');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export default client;
```

```typescript
// services/authService.ts
import { account } from '../api/appwrite';

class AuthService {
  async register(phone: string, password: string, name: string) {
    // Appwrite 支持手机号注册，或使用邮箱
    return await account.create('unique()', `${phone}@memoryapp.com`, password, name);
  }

  async login(phone: string, password: string) {
    return await account.createEmailSession(`${phone}@memoryapp.com`, password);
  }

  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      return null; // 未登录
    }
  }

  async logout() {
    await account.deleteSession('current');
  }
}

export default new AuthService();
```

**数据同步：** 用户登录后，前端需立即调用 `databases.listDocuments('main', 'user_preferences', [Query.equal('userId', currentUserId)])` 来获取并同步用户的详细偏好设置到 `userSlice`。

#### （3）核心功能实现：学习与评测 (深度优化)

此部分是架构的核心，需紧密围绕“前置评测 → 学习阶段 → 当日评测”三步流程。

*   **数据读取 (`dailyLearningService.ts`):**
    *   **前置评测：** 根据 `user_word_progress` 表，筛选出用户历史记录中需要评测的单词（如历史等级为 L3，或满足特定条件的 L0-L1 单词），并从 `words` 表获取详细信息。
    *   **学习阶段：** 根据评测结果和用户的学习模式 (`learning_modes`)，从词库中挑选新词和复习词，组合成今日学习列表，并在 `daily_words` 集合中创建记录。
    *   **当日评测：** 评测对象为学习阶段中接触到的所有单词，根据其在学习阶段结束后的 `currentLevel` (存储在 `user_word_progress`) 来决定题型。

*   **进度更新 (`dailyLearningService.ts`):**
    *   在学习或评测的每个步骤完成后，立即更新 `user_word_progress` 集合中的对应文档。
    *   当一个单词的评测流程完全结束后，根据其表现计算等级升降，并更新 `currentLevel` 和 `currentSpeed`。
    *   在“当日评测”全部完成后，创建一条 `learning_records` 记录，并为每个学习过的单词在 `learning_words` 中创建关联记录，记录其 `masteryChange`。

*   **题型渲染 (`utils/` 和 `components/`):**
    *   创建一个 `generateQuestionType(level: number, history: any[]): QuestionType` 工具函数，根据单词的当前等级和历史记录，动态决定使用哪种题型（英译中、拼写、跟读等）。
    *   创建可复用的题型组件，如 `<SpellingTest />`, `<PronunciationTest />`, `<MultipleChoice />` 等。

*   **AI发音评估 (`pronunciationService.ts`):**
    ```typescript
    // services/pronunciationService.ts
    import { functions, storage, databases } from '../api/appwrite';

    class PronunciationService {
      async evaluatePronunciation(audio: File, wordId: string, userId: string, speed: number) {
        // 1. 上传音频到 Appwrite Storage
        const file = await storage.createFile('word-assets', 'unique()', audio);
        const fileId = file.$id;

        // 2. 调用 Appwrite Function 进行评估
        const response = await functions.createExecution(
          'evaluate-pronunciation',
          JSON.stringify({ audioFileId: fileId, wordId }),
          false
        );

        const result = JSON.parse(response.responseBody);

        // 3. 将评估结果存入 `pronunciation_evaluations` 集合
        await databases.createDocument('main', 'pronunciation_evaluations', 'unique()', {
          userId,
          wordId,
          evaluationTime: new Date().toISOString(),
          syllableCompleteness: result.syllableCompleteness,
          stressAccuracy: result.stressAccuracy,
          phonemeMatching: result.phonemeMatching,
          isPassed: result.isPassed,
          speedUsed: speed
        });

        return result;
      }
    }

    export default new PronunciationService();
    ```

#### （4）词根词缀系统集成 (`morphemeService.ts`)

新增服务，用于支持单词学习中的词素分析功能。

```typescript
// services/morphemeService.ts
import { databases } from '../api/appwrite';

class MorphemeService {
  // 获取一个单词的所有构成词素
  async getMorphemesForWord(wordId: string) {
    const associations = await databases.listDocuments('main', 'word_morpheme_associations', [
      Query.equal('wordId', wordId)
    ]);

    const morphemeIds = associations.documents.map(assoc => assoc.morphemeId);
    const morphemes = await databases.listDocuments('main', 'morphemes', [
      Query.equal('$id', morphemeIds)
    ]);

    // 根据 orderIndex 排序并返回
    return morphemes.documents.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // 更新用户对某个词素的掌握进度
  async updateUserMorphemeProgress(userId: string, morphemeId: string, masteryLevel: number) {
    // 检查记录是否存在
    const existing = await databases.listDocuments('main', 'user_morpheme_progress', [
      Query.equal('userId', userId),
      Query.equal('morphemeId', morphemeId)
    ]);

    if (existing.documents.length > 0) {
      await databases.updateDocument('main', 'user_morpheme_progress', existing.documents[0].$id, {
        masteryLevel,
        lastStudiedTime: new Date().toISOString()
      });
    } else {
      await databases.createDocument('main', 'user_morpheme_progress', 'unique()', {
        userId,
        morphemeId,
        masteryLevel,
        lastStudiedTime: new Date().toISOString()
      });
    }
  }
}

export default new MorphemeService();
```

---

## 三、Appwrite 后端配置方案 (优化版)

配置方案根据新的集合映射进行调整。

### 1. 项目与数据库

*   **创建项目：** `MemoryApp`
*   **创建数据库：** `main`
*   **创建集合：** 根据第二部分的“Appwrite 数据库集合映射”表，逐一在 Appwrite 控制台创建 `user_preferences`, `learning_modes`, `words`, `user_word_progress`, `pronunciation_evaluations`, `learning_records`, `learning_words`, `review_strategies`, `review_records`, `custom_materials`, `articles`, `level_assessments`, `morphemes`, `word_morpheme_associations`, `morpheme_relations`, `user_morpheme_progress` 等集合，并为每个集合定义详细的 JSON Schema 以确保数据一致性。

### 2. 存储（Storage）

*   **创建存储桶：** `word-assets`
*   **权限：** `role:all` 可读，`role:member` 可写。

### 3. 函数（Functions）

*   **运行时：** Node.js 18 或 Python 3.9。
*   **函数 1: `evaluate-pronunciation`**
    *   触发器：API 调用。
    *   代码逻辑：从 Storage 下载音频文件，调用阿里云语音识别API，计算音节完整性和重音位置，返回 JSON 结果。
*   **函数 2: `extract-words-from-image`**
    *   触发器：API 调用。
    *   代码逻辑：从 Storage 下载图片，调用阿里云OCR API，提取并返回单词列表。

### 4. 用户认证（Users & Account）

*   启用邮箱/密码登录。
*   （可选）启用手机号验证码登录（需配置短信服务商）。

---

## 四、部署与运维方案 (保持不变)

### 1. Appwrite 部署选项

**选项 A (推荐): Appwrite Cloud**
官方托管服务，无需自行运维。

**选项 B: 自托管于阿里云ECS**
```yaml
# docker-compose.yml
version: '3'
services:
  appwrite:
    image: appwrite/appwrite:1.5.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./appwrite:/usr/src/code/appwrite:rw
      - ./storage:/storage:rw
    depends_on:
      - redis
      - db
    environment:
      - _APP_ENV=production
      - _APP_OPENSSL_KEY_V1=your-secret-key
      - _APP_DOMAIN=your-domain.com
      - _APP_DOMAIN_TARGET=your-domain.com

  redis:
    image: redis:6.2-alpine
    volumes:
      - ./redis:/data:rw

  db:
    image: mysql:8.0
    volumes:
      - ./mysql:/var/lib/mysql:rw
    environment:
      - MYSQL_ROOT_PASSWORD=your-password
      - MYSQL_DATABASE=appwrite
```

### 2. 前端部署
通过 `expo build` 生成安装包，上传至阿里云OSS。

### 3. 监控与维护
-   **Appwrite Cloud：** 使用官方控制台。
-   **自托管：** 查看 Docker 日志，定期备份 `./mysql` 和 `./storage` 目录。

---

## 五、前后端交互流程示例（以“单词学习”为例）(优化版)

1.  **前端：** 用户登录后，调用 `authService.getCurrentUser()` 获取用户ID。
2.  **前端：** 调用 `userService.getUserPreferences(userId)` 获取用户偏好，存入 `userSlice`。
3.  **前端：** 进入“今日学习”，调用 `dailyLearningService.getTodaysWordList(userId)`。
    *   该服务内部会先检查 `daily_words` 集合中今日是否有记录。
    *   如果没有，则根据 `user_word_progress` 和 `learning_modes` 生成新列表，并创建 `daily_words` 记录。
4.  **前端：** 展示“前置评测”卡片。用户点击“开始评测”。
5.  **前端：** 对于评测中的每个单词，根据其历史等级，调用 `utils.generateQuestionType()` 确定题型，并渲染对应组件。
6.  **前端：** 用户完成跟读，调用 `pronunciationService.evaluatePronunciation(audio, wordId, userId, speed)`。
7.  **Appwrite：** `evaluate-pronunciation` 函数执行，返回评分。
8.  **前端：** 根据评分，调用 `dailyLearningService.updateWordProgress(wordId, newLevel, newSpeed)` 更新 `user_word_progress`。
9.  **前端：** “前置评测”完成后，解锁“学习阶段”。流程重复，但题型和逻辑根据学习算法调整。
10. **前端：** “当日评测”完成后，调用 `dailyLearningService.finalizeLearningSession(userId, wordResults[])`。
    *   该方法会创建 `learning_records` 和 `learning_words` 记录。
    *   弹出总结卡片，展示 `新学单词`、`复习单词`、`等级提升` 等数据。

---

## 六、架构优势总结 (保持不变)

*   **极速开发：** 省去后端API开发、数据库设计、服务器运维等环节。
*   **成本低廉：** Appwrite Cloud 提供免费套餐。
*   **安全可靠：** Appwrite 内置JWT认证、权限控制。
*   **弹性伸缩：** 轻松应对用户增长。
*   **聚焦核心：** 团队精力集中在前端体验和核心学习算法上。

此优化方案通过精确的数据库映射和细化的项目架构，确保了技术实现能够完美支撑产品界面和复杂的数据模型，为项目的顺利开发奠定了坚实的基础。