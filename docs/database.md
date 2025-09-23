# 增强记忆学习软件-数据库表

**版本：0.1**
**日期：2025年9月7日**

---

## 1. 用户表（`user`）
存储用户基础信息及配置项
```sql
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户唯一标识',
  `phone` varchar(20) NOT NULL COMMENT '注册手机号（唯一）',
  `nickname` varchar(50) NOT NULL COMMENT '用户昵称',
  `pronunciation` tinyint NOT NULL COMMENT '发音偏好（1=英式，2=美式）',
  `role` tinyint NOT NULL COMMENT '用户角色（1=学生，2=家长）',
  `english_level` tinyint NOT NULL COMMENT '英语水平（1=零基础，2=小学，3=初中，4=高中）',
  `grade` tinyint DEFAULT NULL COMMENT '小学年级（仅english_level=2时有效，1-6年级）',
  `learning_mode` tinyint DEFAULT 2 COMMENT '默认学习模式（1=轻松，2=正常，3=努力）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB COMMENT '用户信息表';
```

## 2. 学习模式表（`learning_mode`）
定义三种学习模式的参数
```sql
CREATE TABLE `learning_mode` (
  `id` tinyint NOT NULL COMMENT '模式ID（1=轻松，2=正常，3=努力）',
  `mode_name` varchar(20) NOT NULL COMMENT '模式名称',
  `duration_range` varchar(20) NOT NULL COMMENT '单次时长范围（如"10-15分钟"）',
  `word_count` int NOT NULL COMMENT '单次学习单词数',
  `phrase_count` int NOT NULL COMMENT '单次学习词组数',
  `sentence_count` int NOT NULL COMMENT '单次学习句型数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT '学习模式配置表';
```

## 3. 单词表（`word`）
存储单词基础信息及发音属性
```sql
CREATE TABLE `word` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '单词唯一标识',
  `spelling` varchar(50) NOT NULL COMMENT '单词拼写（唯一）',
  `british_phonetic` varchar(200) DEFAULT NULL COMMENT '英式音标',
  `american_phonetic` varchar(200) DEFAULT NULL COMMENT '美式音标',
  `definition` varchar(200) DEFAULT NULL COMMENT '英文释义',
  `chinese_meaning` varchar(200) NOT NULL COMMENT '中文释义',
  `frequency` varchar(512) DEFAULT NULL COMMENT '词频顺序',
  `syllable_count` int NOT NULL COMMENT '音节数',
  `is_abstract` tinyint NOT NULL DEFAULT 0 COMMENT '是否抽象词（1=是，0=否）',
  `letter_count` int NOT NULL COMMENT '字母总数',
  `british_audio` varchar(255) DEFAULT NULL COMMENT '英式发音音频路径',
  `american_audio` varchar(255) DEFAULT NULL COMMENT '美式发音音频路径',
  `image_path` varchar(255) DEFAULT NULL COMMENT '单词配图路径',
  `example_sentence` varchar(512) DEFAULT NULL COMMENT '例句',
  `exchange` varchar(512) DEFAULT NULL COMMENT '时态复数等变换，使用 "/" 分割不同项目',
  `speed_sensitivity` tinyint NOT NULL DEFAULT 2 COMMENT '语速敏感值（1=低，2=中，3=高，多音节/抽象词为3）',
  `difficulty_level` tinyint NOT NULL COMMENT '适配水平（1=小学，2=初中，3=高中）',
  `tag` tinyint NULL COMMENT '字符串标签：zk/中考，gk/高考，cet4/四级 等等标签，空格分割',
  `is_analyzed` tinyint NOT NULL DEFAULT '0' COMMENT '是否已完成词根词缀分析（1=是，0=否）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spelling` (`spelling`)
) ENGINE=InnoDB COMMENT '单词基础信息表';
```

## 4. 词素表 (`morpheme`)
存储词根、前缀、后缀的基础信息，是词根词缀系统的核心。
```sql
CREATE TABLE `morpheme` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '词素唯一标识',
  `morpheme_text` varchar(50) NOT NULL COMMENT '词素文本（如   "spect  ",   "un-",   "-able  "）',
  `type` tinyint NOT NULL COMMENT '类型（1=词根-root, 2=前缀-prefix, 3=后缀-suffix）',
  `meaning_zh` varchar(200) NOT NULL COMMENT '中文释义（如   "看  "）',
  `meaning_en` varchar(200) NOT NULL COMMENT '英文释义（如   "to look  "）',
  `origin` varchar(50) DEFAULT NULL COMMENT '来源（如   "Latin  ",   "Greek  ",   "Old English  "）',
  `description` text COMMENT '详细描述、演变历史、用法说明',
  `priority` tinyint NOT NULL DEFAULT NULL COMMENT '常见度优先级（1-5，1最高，5最低）',
  `difficulty_level` tinyint DEFAULT NULL COMMENT '推荐学习  水平（1=小学，2=初中，3=高中，NULL=通用）',
   PRIMARY KEY (`id`),
  UNIQUE KEY `uk_morpheme_text_type` (`morpheme_text`,`type`) COMMENT '同一文本不同类别的词素可共存（如 "ing  "既可能是后缀也可能是词根）'
) ENGINE=InnoDB COMMENT '词素表（词根、前缀、后缀）';
```

## 5. 单词-词素关联表 (`word_morpheme_association`)
建立单词与其构成词素之间的关系，并记录顺序。
```sql
CREATE TABLE `word_morpheme_association` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `morpheme_id` bigint NOT NULL COMMENT '关联词素ID',
  `order_index` tinyint NOT NULL COMMENT '在单词中的出现顺序（从1开始）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_word_morpheme_order` (`word_id`,`morpheme_id`,`order_index`),
  KEY `idx_morpheme` (`morpheme_id`),
  CONSTRAINT `fk_wma_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wma_morpheme` FOREIGN KEY (`morpheme_id`) REFERENCES `morpheme` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT '单词-词素关联表';
```

## 6. 复习策略表（`review_strategy`）
定义不同类型单词的复习规则，并支持区分传统策略和FSRS策略。
```sql
CREATE TABLE `review_strategy` (
  `id` tinyint NOT NULL COMMENT '策略ID',
  `strategy_type` tinyint NOT NULL DEFAULT 1 COMMENT '策略类型 (1=传统手动策略, 2=FSRS算法策略)',
  `strategy_name` varchar(20) NOT NULL COMMENT '策略名称（密集/正常/稀疏/FSRS）',
  `applicable_condition` varchar(200) NOT NULL COMMENT '适用条件（如"长难词+L0"）',
  `interval_rule` varchar(100) NOT NULL COMMENT '复习间隔规则（如"1h,3h,1d"）— 仅对传统策略有效',
  `frequency` int NOT NULL COMMENT '每日复习频次',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT '复习策略配置表';
```

## 7. 每日学习会话表 (`daily_learning_session`)
核心表，用于管理“评测-学习-再评测”全流程的状态、进度和内容。
```sql
CREATE TABLE `daily_learning_session` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '会话唯一标识',
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `session_date` date NOT NULL COMMENT '会话日期（通常是当天）',
  `mode_id` tinyint NOT NULL COMMENT '本次会话的学习模式',
  `status` tinyint NOT NULL DEFAULT NULL COMMENT '会话状态 (0=待开始, 1=前置评测中, 2=学习中, 3=当日评测中, 4=已完成)',
  `pre_test_progress` varchar(50) DEFAULT NULL COMMENT '前置评测进度 (如 "3/7")',
  `learning_progress` varchar(50) DEFAULT NULL COMMENT '学习阶段进度 (如 "5/10")',
  `post_test_progress` varchar(50) DEFAULT NULL COMMENT '当日评测进度 (如 "2/7")',
  `pre_test_word_ids` json NOT NULL COMMENT '前置评测单词ID列表 (JSON数组)',
  `learning_word_ids` json NOT NULL COMMENT '学习阶段单词ID列表 (JSON数组)',
  `post_test_word_ids` json NOT NULL COMMENT '当日评测单词ID列表 (JSON数组)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `session_date`),
  CONSTRAINT `fk_dls_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_dls_mode` FOREIGN KEY (`mode_id`) REFERENCES `learning_mode` (`id`)
) ENGINE=InnoDB COMMENT '每日学习会话表，用于管理“评测-学习-再评测”全流程状态与内容';
```

## 8. 用户单词行为日志表 (`user_word_action_log`)
核心表，用于记录用户在“评测-学习-再评测”全流程中，与每个单词的每一次原子级交互，是数据驱动和个性化推荐的基础。
```sql
CREATE TABLE `user_word_action_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志唯一标识',
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `session_id` bigint NULL COMMENT '关联的每日学习会话ID（快速复习时可为空）',
  `phase` tinyint NOT NULL COMMENT '阶段 (1=前置评测, 2=学习阶段, 3=当日评测, 4=快速复习, 5=专项训练)',
  `action_type` tinyint NOT NULL COMMENT '行为类型 
    -- 评测/测试类：
    (1=听单词, 2=英译中, 3=中译英, 4=拼写, 5=跟读, 6=词义匹配, 7=语境应用, 8=快速反应)
    -- 学习/吸收类：
    (10=观看图文, 11=播放例句, 12=词根词缀解析, 13=联想记忆故事, 14=自定义材料学习)',
  `learning_method` tinyint NULL COMMENT '学习方法 (仅当action_type=2时有效) 
    (1=词根词缀法, 2=联想记忆法, 3=语境法, 4=自定义材料法, 5=重复朗读法)',
  `is_correct` tinyint NULL COMMENT '是否正确 (1=是, 0=否) — 对于纯学习活动可为空',
  `response_time_ms` int NULL COMMENT '响应耗时（毫秒） — 对于纯学习活动可为空',
  `study_duration_ms` int NULL COMMENT '学习时长（毫秒）— 仅当action_type=2时有效，记录沉浸式学习耗时',
  `speed_used` int NOT NULL COMMENT '活动时使用的语速（百分比）',
  PRIMARY KEY (`id`),
  KEY `idx_user_word` (`user_id`, `word_id`),
  KEY `idx_session` (`session_id`),
  CONSTRAINT `fk_uwal_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_uwal_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`),
  CONSTRAINT `fk_uwal_session` FOREIGN KEY (`session_id`) REFERENCES `daily_learning_session` (`id`)
) ENGINE=InnoDB COMMENT '用户单词行为日志表（记录每一次原子级交互，包括学习与评测）';
```

## 9. 用户单词历史评测等级表 (`user_word_test_history`)
核心表，记录用户每次完整的评测（前置评测、当日评测）中，每个单词的等级变化或最终等级，并且能按日期查询。。
```sql
CREATE TABLE `user_word_test_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录唯一标识',
  `user_id` BIGINT NOT NULL COMMENT '关联用户ID',
  `word_id` BIGINT NOT NULL COMMENT '关联单词ID',
  `test_date` DATE NOT NULL COMMENT '测试日期 (可从 session_id 关联的 session_date 获取)',
  `phase` TINYINT NOT NULL COMMENT '测试阶段 (1=前置评测 (Pre-test), 3=当日评测 (Post-test))', -- 使用与 user_word_action_log.phase 一致的枚举
  `test_level` TINYINT NULL COMMENT '本次测试结束后该单词的掌握等级 (对应 user_word_progress.current_level 在测试完成时的值)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_word_session_phase` (`user_id`, `word_id`, `test_date`, `phase`), -- 确保每个用户在同一天中的同一阶段，一个单词只有一条记录
  KEY `idx_user_date_phase` (`user_id`, `test_date`, `phase`),
  CONSTRAINT `fk_uwth_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_uwth_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`),
) ENGINE=InnoDB COMMENT='用户单词历史测试等级表 (记录每次前置/当日评测后单词的等级)';
```

## 10. 用户单词进度表（`user_word_progress`）
核心表，记录用户对每个单词的掌握状态
```sql
CREATE TABLE `user_word_progress` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `current_level` tinyint NOT NULL DEFAULT NULL COMMENT '当前掌握等级（0=L0，1=L1，2=L2，3=L3，4=L4）',
  `current_speed` int NOT NULL DEFAULT NULL COMMENT '当前适应语速（百分比，基于母语者正常语速）',
  `last_learn_time` datetime DEFAULT NULL COMMENT '最后学习时间',
  `last_review_time` datetime DEFAULT NULL COMMENT '最后复习时间',
  `is_long_difficult` tinyint NOT NULL DEFAULT NULL COMMENT '是否为长难词',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_word` (`user_id`,`word_id`),
  KEY `idx_level` (`current_level`),
  CONSTRAINT `fk_uwp_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_uwp_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '用户单词掌握进度表';
```

## 11. 学习记录表（`learning_record`）
记录用户每日学习任务及测试结果。此表在“当日评测”完成后生成，用于归档最终结果。
```sql
CREATE TABLE `learning_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `session_id` bigint NOT NULL COMMENT '关联的每日学习会话ID',
  `learning_date` date NOT NULL COMMENT '学习日期',
  `mode_id` tinyint NOT NULL COMMENT '学习模式（关联learning_mode.id）',
  `start_time` datetime NOT NULL COMMENT '开始时间（从“前置评测”开始）',
  `end_time` datetime NOT NULL COMMENT '结束时间（“当日评测”结束）',
  `test_correct_rate` decimal(5,2) DEFAULT NULL COMMENT '当日评测的最终正确率（百分比）',
  `total_duration` int NOT NULL COMMENT '总学习时长（秒，从开始到结束）',
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`learning_date`),
  KEY `idx_session` (`session_id`),
  CONSTRAINT `fk_lr_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_lr_mode` FOREIGN KEY (`mode_id`) REFERENCES `learning_mode` (`id`),
  CONSTRAINT `fk_lr_session` FOREIGN KEY (`session_id`) REFERENCES `daily_learning_session` (`id`)
) ENGINE=InnoDB COMMENT '学习任务记录表（结果归档）';
```

## 12. 学习单词关联表（`learning_word`）
记录单次学习中包含的单词及其在不同阶段的成果。此表在 `learning_record` 生成后填充。
```sql
CREATE TABLE `learning_word` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `learning_record_id` bigint NOT NULL COMMENT '关联学习记录ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `pre_test_level` tinyint NOT NULL COMMENT '前置评测时的等级',
  `post_test_level` tinyint NOT NULL COMMENT '当日评测后的等级',
  `mastery_change` tinyint GENERATED ALWAYS AS (`post_test_level` - `pre_test_level`) STORED COMMENT '学习后等级净变化',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_word` (`learning_record_id`,`word_id`),
  KEY `idx_user_word` (`user_id`, `word_id`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_lw_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`), -- 新增外键
  CONSTRAINT `fk_lw_learning` FOREIGN KEY (`learning_record_id`) REFERENCES `learning_record` (`id`),
  CONSTRAINT `fk_lw_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '学习-单词关联表（记录单次学习会话中，单词的最终等级变化）';
```

## 13. 复习记录表（`review_record`）
记录用户复习行为及效果，并增加策略类型和FSRS评分字段。
```sql
CREATE TABLE `review_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `review_time` datetime NOT NULL COMMENT '复习时间',
  `strategy_id` tinyint NOT NULL COMMENT '使用的复习策略',
  `strategy_type` tinyint NOT NULL DEFAULT 1 COMMENT '策略类型 (1=传统, 2=FSRS)',
  `review_method` tinyint NOT NULL COMMENT '复习方式（1=主动，2=被动，3=快速）',
  `correct_rate` decimal(5,2) DEFAULT NULL COMMENT '复习正确率',
  `rating` tinyint NULL COMMENT 'FSRS评分 (1=忘记, 2=犹豫, 3=正确, 4=轻松) — 仅对FSRS策略有效',
  `speed_used` int NOT NULL COMMENT '复习时使用的语速（百分比）',
  PRIMARY KEY (`id`),
  KEY `idx_user_word_time` (`user_id`,`word_id`,`review_time`),
  CONSTRAINT `fk_rr_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_rr_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`),
  CONSTRAINT `fk_rr_strategy` FOREIGN KEY (`strategy_id`) REFERENCES `review_strategy` (`id`)
) ENGINE=InnoDB COMMENT '复习记录表';
```

## 14. **FSRS复习调度表 (`fsrs_review_schedule`)**
专用于FSRS算法，为每个用户-单词对动态计算下一次复习时间（仅记录最新状态）。
```sql
CREATE TABLE `fsrs_review_schedule` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '调度记录唯一标识',
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `next_review_time` datetime NOT NULL COMMENT 'FSRS算法计算出的下一次复习时间',
  `stability` double NOT NULL COMMENT 'FSRS稳定性参数 (S)',
  `difficulty` double NOT NULL COMMENT 'FSRS难度参数 (D)',
  `retention` double NOT NULL DEFAULT 0.9 COMMENT '目标保留率 (默认0.9)',
  `reps` int NOT NULL DEFAULT 0 COMMENT '总复习次数',
  `lapses` int NOT NULL DEFAULT 0 COMMENT '遗忘次数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_word` (`user_id`, `word_id`),
  KEY `idx_next_review` (`next_review_time`),
  KEY `idx_user_next_review` (`user_id`, `next_review_time`),
  CONSTRAINT `fk_frs_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_frs_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT 'FSRS复习调度表，为每个用户-单词对记录当前状态和下一次复习时间';
```

## 15. 发音评估记录表（`pronunciation_evaluation`）
存储AI对用户发音的评估结果
```sql
CREATE TABLE `pronunciation_evaluation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `evaluation_time` datetime NOT NULL COMMENT '评估时间',
  `syllable_completeness` int NOT NULL COMMENT '音节完整性（百分比）',
  `stress_accuracy` int NOT NULL COMMENT '重音准确性（百分比）',
  `phoneme_matching` int NOT NULL COMMENT '音素匹配度（百分比）',
  `is_passed` tinyint NOT NULL COMMENT '是否达标（1=是，0=否）',
  `speed_used` int NOT NULL COMMENT '评估时使用的语速（百分比）',
  PRIMARY KEY (`id`),
  KEY `idx_user_word_time` (`user_id`,`word_id`,`evaluation_time`),
  CONSTRAINT `fk_pe_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_pe_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '发音评估记录表';
```

## 16. 词素关系表 (`morpheme_relation`)
记录词素之间的衍生、变体、反义等关系，用于构建知识网络。
```sql
CREATE TABLE `morpheme_relation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parent_morpheme_id` bigint NOT NULL COMMENT '父词素ID',
  `child_morpheme_id` bigint NOT NULL COMMENT '子词素ID',
  `relation_type` tinyint NOT NULL COMMENT '关系类型（1=变体-variant, 2=反义-opposite, 3=同源-same_origin, 4=衍生-derives）',
  `description` varchar(255) DEFAULT NULL COMMENT '关系描述',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_child_relation` (`parent_morpheme_id`,`child_morpheme_id`,`relation_type`),
  KEY `idx_child` (`child_morpheme_id`),
  CONSTRAINT `fk_mr_child_morpheme` FOREIGN KEY (`child_morpheme_id`) REFERENCES `morpheme` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mr_parent_morpheme` FOREIGN KEY (`parent_morpheme_id`) REFERENCES `morpheme` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT '词素关系网表';
```

## 17. 自定义材料表（`custom_material`）
存储家长为单词添加的个性化记忆材料
```sql
CREATE TABLE `custom_material` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '创建者（家长）用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `memory_story` text COMMENT '记忆故事/注释',
  `custom_image` varchar(255) DEFAULT NULL COMMENT '自定义图片路径',
  `recording_path` varchar(255) DEFAULT NULL COMMENT '录音路径',
  `recording_speed` tinyint DEFAULT NULL COMMENT '录音语速（1=慢速，2=正常）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_word` (`user_id`,`word_id`),
  CONSTRAINT `fk_cm_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_cm_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '自定义记忆材料表';
```

## 18. 文章表（`article`）
存储用户上传的OCR文章及提取的生词
```sql
CREATE TABLE `article` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `upload_time` datetime NOT NULL COMMENT '上传时间',
  `ocr_text` text NOT NULL COMMENT 'OCR识别的文本内容',
  `image_path` varchar(255) DEFAULT NULL COMMENT '原图路径',
  `extracted_word_ids` varchar(1000) DEFAULT NULL COMMENT '提取的生词ID（逗号分隔）',
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`,`upload_time`),
  CONSTRAINT `fk_article_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB COMMENT '用户上传文章表';
```

## 19. 水平评估表（`level_assessment`）
存储用户起始水平及定期评估结果
```sql
CREATE TABLE `level_assessment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `assessment_time` datetime NOT NULL COMMENT '评估时间',
  `vocabulary_size` int NOT NULL COMMENT '词汇量估算',
  `level_distribution` json NOT NULL COMMENT '各等级占比（如{"L0":20,"L1":30}）',
  `weak_points` varchar(500) NOT NULL COMMENT '薄弱项描述',
  `speed_adaptability` json NOT NULL COMMENT '语速适应能力（如{"多音节词":60,"抽象词":55}）',
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`,`assessment_time`),
  CONSTRAINT `fk_la_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB COMMENT '水平评估记录表';
```

## 20. 用户词素进度表 (`user_morpheme_progress`)
记录用户对每个词根/词缀的掌握情况。
```sql
CREATE TABLE `user_morpheme_progress` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `morpheme_id` bigint NOT NULL COMMENT '关联词素ID',
  `mastery_level` tinyint NOT NULL DEFAULT '0' COMMENT '掌握等级（0=未学，1=已学，2=熟悉，3=掌握）',
  `last_encountered_time` datetime DEFAULT NULL COMMENT '最后一次在单词中遇到的时间',
  `last_studied_time` datetime DEFAULT NULL COMMENT '最后一次主动学习的时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_morpheme` (`user_id`,`morpheme_id`),
  KEY `idx_morpheme` (`morpheme_id`),
  CONSTRAINT `fk_ump_morpheme` FOREIGN KEY (`morpheme_id`) REFERENCES `morpheme` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ump_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT '用户词素学习进度表';
```

---

## 设计说明

### 双轨制复习系统
*   **传统策略**：通过 `review_strategy` (其中 `strategy_type=1`) 和 `review_record` (其中 `strategy_type=1`) 实现，沿用固定的间隔规则 (`interval_rule`)。
*   **FSRS算法**：通过 `fsrs_review_schedule` 表和 `review_record` (其中 `strategy_type=2` 且包含 `rating`) 实现，为每个用户-单词对动态计算最优复习时间。
*   **全局控制**：`user.review_mode` 字段决定用户默认使用哪种复习模式，便于进行A/B测试和效果对比分析。

### 关系完整性
通过外键关联确保数据一致性（如 `user`-`user_word_progress`、`learning_record`-`learning_word`、`word`-`word_morpheme_association`）。新增 `learning_record.session_id` 与 `daily_learning_session.id` 的外键，确保学习结果与学习过程精确对应。新增的 `user_word_action_log` 表通过 `session_id` 和 `word_id` 与核心流程和单词实体关联。

### 性能优化
核心查询字段（如`user_id`、`word_id`、`morpheme_id`、时间字段）均建立索引，提升查询效率。`daily_learning_session` 表的 `uk_user_date` 唯一索引确保每天每个用户只有一个会话。`user_word_action_log` 表为高频写入表，索引设计兼顾了查询性能和写入速度。

### 核心流程支持
*   **`daily_learning_session`**：是“今日学习”功能的引擎，负责管理三阶段流程的状态、进度和三个独立的单词列表，支持中断恢复。
*   **`learning_record`**：是学习成果的归档，仅在流程结束时生成，记录最终的耗时、正确率等统计信息。
*   **`learning_word`**：记录单词级别的学习成果，并通过 `phase` 字段明确区分该成果是在前置评测、学习阶段还是当日评测中产生的。
*   **`user_word_action_log`**：是系统的数据基石，记录每一次微观交互，为 `learning_word.mastery_change` 的计算、个性化复习推送、薄弱项分析提供原始数据。

### 扩展性
预留字段（如`difficulty_level`）支持未来按学段细化内容，JSON字段（如`level_distribution`）适配灵活的统计数据存储。词素模块的设计支持轻松扩展新的关系和属性。`user_word_action_log` 表的 `action_type` 和 `test_type` 字段设计为枚举，方便未来扩展新的学习或评测类型。

### 词素集成
新增的词根词缀模块与原有系统深度集成，通过`word_morpheme_association`表关联，并在`word`表中添加`is_analyzed`标志位，实现了单词学习与词素学习的无缝结合。

### 数据驱动升级
通过引入 `user_word_action_log` 表，系统从“结果驱动”升级为“过程驱动”和“数据驱动”。它捕获了用户与产品的每一次微观互动，为后续的AI算法、个性化学习和精细化运营提供了不可或缺的数据燃料。这张表是构建真正智能学习系统的数据基石。