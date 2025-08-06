# 增强记忆学习软件技术方案（React Native + Spring Boot架构）  

## 一、技术栈总览  
| 模块        | 核心技术栈                          | 辅助工具/框架                     | 部署环境               |  
|-------------|-----------------------------------|----------------------------------|------------------------|  
| 前端        | React Native + TypeScript + Expo  | React Navigation、Redux Toolkit  | 阿里云OSS（静态资源）  |  
| 后端        | Spring Boot + Kotlin + MySQL      | Spring Data JPA、Redis           | 阿里云ECS（应用服务器）|  
| 数据存储    | MySQL 8.0（主数据）               | Redis 6.2（缓存）、阿里云RDS     | 阿里云RDS（数据库服务）|  
| 网络通信    | HTTP/HTTPS（RESTful API）         | Axios（前端）、Retrofit（后端）   | 阿里云SLB（负载均衡）  |  


## 二、前端技术方案（React Native + TypeScript + Expo）  

### 1. 项目架构设计  
```  
src/  
├── api/               # 接口请求层（与后端通信）  
├── components/        # 通用组件库（按钮、输入框、进度条等）  
│   ├── common/        # 基础组件（复用性高，如Button、Input）  
│   ├── learning/      # 学习场景组件（单词卡片、语速控制栏等）  
│   └── auth/          # 注册登录组件（验证码输入框、角色选择器等）  
├── navigation/        # 路由配置（基于React Navigation 6）  
├── redux/             # 状态管理（Redux Toolkit）  
│   ├── slices/        # 切片（用户状态、学习进度、单词数据等）  
│   └── store.ts       # 全局store配置  
├── screens/           # 页面组件  
│   ├── auth/          # 注册/登录/配置页  
│   ├── home/          # 首页  
│   ├── learning/      # 学习/测试页（分L0-L4等级）  
│   ├── review/        # 复习页  
│   └── stats/         # 数据统计页  
├── services/          # 业务服务层（OCR、音频处理等）  
├── types/             # TypeScript类型定义（接口、实体、枚举等）  
├── utils/             # 工具函数（日期格式化、校验、存储等）  
└── App.tsx            # 入口组件  
```  


### 2. 核心技术实现  
#### （1）基础配置  
- **Expo框架**：通过`expo-cli`初始化项目，利用`expo-build`生成Android/iOS安装包，支持热重载（开发效率提升40%）。  
- **TypeScript**：定义严格类型（如用户信息`UserType`、单词等级`WordLevelEnum`），减少运行时错误。  
  ```typescript  
  // 单词等级枚举（对应需求中L0-L4）  
  export enum WordLevel {  
    L0 = "完全陌生",  
    L1 = "能识别",  
    L2 = "能认读",  
    L3 = "能掌握",  
    L4 = "能熟练"  
  }  
  ```  


#### （2）核心功能实现  
- **用户注册与配置**：  
  - 表单校验：使用`react-hook-form`处理表单状态，`zod`进行输入验证（如手机号格式、密码强度）。  
  - 本地缓存：通过`expo-secure-store`存储用户Token，`AsyncStorage`保存配置偏好（如默认学习模式）。  

- **学习模块（分等级交互）**：  
  - 语速控制：基于`expo-av`实现音频播放，通过状态管理动态调整播放速率（如`currentSpeed: 0.5 → 1.0`）。  
  - 发音评估：集成`react-native-tts`（文本转语音）和`expo-av`录音功能，前端预处理音频数据（时长、音量）后提交后端AI评估。  

- **OCR文章上传**：  
  - 调用`expo-image-picker`选择图片，通过`expo-file-system`压缩后上传至后端，后端调用阿里云OCR接口处理。  


#### （3）状态管理与路由  
- **Redux Toolkit**：管理全局状态（如用户信息、当前学习单词、复习列表），通过`createAsyncThunk`处理异步请求（如加载单词数据）。  
  ```typescript  
  // 单词进度切片示例  
  import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';  
  export const fetchWordProgress = createAsyncThunk(  
    'wordProgress/fetch',  
    async (userId: string) => {  
      const response = await api.get(`/user/${userId}/word-progress`);  
      return response.data;  
    }  
  );  
  ```  
- **React Navigation**：配置栈路由（登录→首页→学习页）和标签路由（首页/统计/我的），通过`useRoute`传递参数（如单词ID、学习模式）。  


### 3. 性能与兼容性优化  
- **图片优化**：使用`expo-fast-image`实现图片缓存，根据设备分辨率动态加载不同尺寸图片（适配需求中的“单词-图片关联库”）。  
- **兼容性处理**：通过`Platform.select`适配Android/iOS差异（如导航栏样式、按钮点击反馈），Expo SDK已内置主流设备适配方案。  


## 三、后端技术方案（Spring Boot + Kotlin + MySQL）  

### 1. 项目架构设计  
```  
src/main/kotlin/com/memory/  
├── config/            # 配置类（数据库、Redis、安全等）  
├── controller/        # 接口层（RESTful API）  
│   ├── AuthController.kt    # 注册登录接口  
│   ├── LearningController.kt # 学习/测试接口  
│   ├── ReviewController.kt   # 复习接口  
│   └── StatsController.kt    # 数据统计接口  
├── dto/               # 数据传输对象（请求/响应实体）  
├── entity/            # 数据库实体（对应MySQL表）  
├── repository/        # 数据访问层（Spring Data JPA）  
├── service/           # 业务逻辑层  
│   ├── impl/          # 业务实现  
│   ├── AiService.kt   # AI评估服务（发音/拼写评分）  
│   └── OcrService.kt  # OCR处理服务  
├── util/              # 工具类（加密、日期、校验等）  
└── MemoryApplication.kt # 启动类  
```  


### 2. 核心技术实现  
#### （1）数据库设计与访问  
- **MySQL表结构**：严格映射需求中的实体（如`user`、`word`、`user_word_progress`），通过JPA注解定义关系（如用户与单词进度的一对多关系）。  
  ```kotlin  
  // 用户单词进度实体（对应user_word_progress表）  
  @Entity  
  data class UserWordProgress(  
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)  
    val id: Long = 0,  
    @ManyToOne val user: User,  
    @ManyToOne val word: Word,  
    val currentLevel: Int = 0, // 0=L0, 1=L1...  
    val currentSpeed: Int = 50, // 语速百分比  
    val lastLearnTime: LocalDateTime? = null,  
    @GeneratedValue(strategy = GenerationType.AUTO)  
    val isLongDifficult: Boolean = false // 动态计算字段  
  )  
  ```  
- **Redis缓存**：缓存高频访问数据（如单词基础信息、用户配置），设置过期时间（如单词数据缓存1小时，用户配置缓存7天）。  


#### （2）API接口设计（RESTful风格）  
| 接口路径                | 方法 | 功能描述                     | 权限   |  
|-------------------------|------|------------------------------|--------|  
| `/auth/register`        | POST | 用户注册                     | 匿名   |  
| `/auth/login`           | POST | 账号登录（返回Token）        | 匿名   |  
| `/learning/words`       | GET  | 获取今日学习单词列表         | 登录用户 |  
| `/learning/evaluate`    | POST | 提交发音/拼写评估结果        | 登录用户 |  
| `/review/list`          | GET  | 获取待复习单词列表           | 登录用户 |  
| `/stats/word-level`     | GET  | 获取单词等级分布统计         | 登录用户 |  
| `/ocr/upload`           | POST | 上传图片并提取生词           | 登录用户 |  


#### （3）核心业务逻辑  
- **学习进度更新**：根据用户测试结果（正确率、语速适应度），通过`UserWordProgressService`动态调整单词等级（如连续2次L3达标→升级L4）。  
- **复习策略引擎**：基于`review_strategy`表规则，`ReviewService`计算待复习单词（如长难词+L0→密集复习，每日3次）。  
- **AI发音评估**：接收前端音频数据，调用阿里云语音识别API提取特征（音节完整性、重音位置），与单词标准发音比对打分。  


### 3. 安全与性能优化  
- **接口安全**：使用JWT进行身份认证，`@PreAuthorize`注解控制权限（如家长角色可访问自定义材料接口）。  
- **数据库优化**：对高频查询字段建索引（如`user_word_progress.user_id`、`learning_record.learning_date`），复杂统计用MySQL视图。  
- **并发处理**：通过Redis分布式锁解决并发更新冲突（如多设备同时提交学习记录）。  


## 四、部署与运维方案  
### 1. 阿里云资源配置  
| 资源类型         | 规格                          | 用途                          |  
|------------------|-------------------------------|-------------------------------|  
| ECS实例          | 2核4G（CentOS 7.9）           | 部署后端应用（Spring Boot）   |  
| RDS MySQL        | 2核4G，80GB存储               | 主数据库（用户/学习数据）     |  
| Redis实例        | 1核2G（阿里云Redis版）        | 缓存/分布式锁                 |  
| OSS              | 标准存储                      | 存储图片、音频、OCR识别结果   |  
| SLB              | 负载均衡（4层TCP）            | 分发前端API请求到后端集群     |  


### 2. 部署流程  
1. **前端部署**：  
   - 通过`expo build:android`和`expo build:ios`生成安装包，上传至阿里云OSS，提供下载链接。  
   - 热更新：使用`expo-updates`，前端代码变更后无需重新打包，用户打开APP自动更新。  

2. **后端部署**：  
   - 打包为Jar包，通过Docker容器化部署（`Dockerfile`定义运行环境）。  
   - 配置`docker-compose.yml`管理Spring Boot、Redis容器，实现一键启动。  
   ```yaml  
   version: '3'  
   services:  
     app:  
       image: memory-app:latest  
       ports:  
         - "8080:8080"  
       environment:  
         - SPRING_PROFILES_ACTIVE=prod  
     redis:  
       image: redis:6.2  
       ports:  
         - "6379:6379"  
   ```  

3. **数据库部署**：  
   - 阿里云RDS初始化MySQL，通过`Flyway`执行SQL脚本（建表、初始化基础数据如学习模式）。  


### 3. 监控与维护  
- **日志管理**：集成Logback，日志输出至阿里云SLS（日志服务），支持按接口/错误类型检索。  
- **性能监控**：阿里云ARMS监控应用性能（接口响应时间、JVM状态），设置告警（如API错误率>5%时通知）。  
- **备份策略**：MySQL每日自动备份（保留7天），Redis开启持久化（RDB+AOF）。  


## 五、前后端交互流程示例（以“单词学习”为例）  
1. 前端调用`/learning/words?mode=2`（正常模式），后端返回今日7个单词列表（含发音路径、图片URL）。  
2. 前端展示L2等级单词界面，用户跟读发音，前端录音并调用`/learning/evaluate`提交音频数据。  
3. 后端评估后返回结果（音节完整性85%、重音准确性90%），前端更新Redux状态（当前单词等级提升至L3）。  
4. 学习结束后，前端调用`/learning/finish`，后端更新`learning_record`和`user_word_progress`表，返回今日学习统计。  

通过以上方案，既满足了需求中“个性化学习”“动态语速调整”等核心功能，又通过技术栈的稳定性（React Native+Spring Boot）和阿里云的可靠性，确保系统在用户量增长后仍能高效运行。