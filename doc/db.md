基于需求文档，设计以下数据库表结构，覆盖用户信息、学习内容、进度追踪、评估记录等核心模块，采用关系型数据库设计思路：


### 1. 用户表（`user`）  
存储用户基础信息及配置项  
```sql
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户唯一标识',
  `phone` varchar(20) NOT NULL COMMENT '注册手机号（唯一）',
  `nickname` varchar(50) NOT NULL COMMENT '用户昵称',
  `pronunciation_preference` tinyint NOT NULL COMMENT '发音偏好（1=英式，2=美式）',
  `role` tinyint NOT NULL COMMENT '用户角色（1=学生，2=家长）',
  `english_level` tinyint NOT NULL COMMENT '英语水平（1=零基础，2=小学，3=初中，4=高中）',
  `grade` tinyint DEFAULT NULL COMMENT '小学年级（仅english_level=2时有效，1-6年级）',
  `default_learning_mode` tinyint DEFAULT 2 COMMENT '默认学习模式（1=轻松，2=正常，3=努力）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB COMMENT '用户信息表';
```


### 2. 学习模式表（`learning_mode`）  
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


### 3. 单词表（`word`）  
存储单词基础信息及发音属性  
```sql
CREATE TABLE `word` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '单词唯一标识',
  `spelling` varchar(50) NOT NULL COMMENT '单词拼写（唯一）',
  `chinese_meaning` varchar(200) NOT NULL COMMENT '中文释义',
  `syllable_count` int NOT NULL COMMENT '音节数',
  `is_abstract` tinyint NOT NULL DEFAULT 0 COMMENT '是否抽象词（1=是，0=否）',
  `letter_count` int NOT NULL COMMENT '字母总数',
  `british_audio` varchar(255) DEFAULT NULL COMMENT '英式发音音频路径',
  `american_audio` varchar(255) DEFAULT NULL COMMENT '美式发音音频路径',
  `speed_sensitivity` tinyint NOT NULL DEFAULT 2 COMMENT '语速敏感值（1=低，2=中，3=高，多音节/抽象词为3）',
  `difficulty_level` tinyint NOT NULL COMMENT '适配水平（1=小学，2=初中，3=高中）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spelling` (`spelling`)
) ENGINE=InnoDB COMMENT '单词基础信息表';
```


### 4. 用户单词进度表（`user_word_progress`）  
记录用户对每个单词的掌握状态  
```sql
CREATE TABLE `user_word_progress` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `current_level` tinyint NOT NULL DEFAULT 0 COMMENT '当前掌握等级（0=L0，1=L1，2=L2，3=L3，4=L4）',
  `current_speed` int NOT NULL DEFAULT 50 COMMENT '当前适应语速（百分比，基于母语者正常语速）',
  `last_learn_time` datetime DEFAULT NULL COMMENT '最后学习时间',
  `last_review_time` datetime DEFAULT NULL COMMENT '最后复习时间',
  `is_long_difficult` tinyint GENERATED ALWAYS AS (
    CASE WHEN (SELECT `english_level` FROM `user` WHERE `id` = `user_id`) = 2 
    THEN IF(`letter_count` > 5, 1, 0) 
    ELSE IF(`letter_count` > 6, 1, 0) END
  ) STORED COMMENT '是否为长难词（动态计算）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_word` (`user_id`,`word_id`),
  KEY `idx_level` (`current_level`),
  CONSTRAINT `fk_uwp_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_uwp_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '用户单词掌握进度表';
```


### 5. 发音评估记录表（`pronunciation_evaluation`）  
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


### 6. 学习记录表（`learning_record`）  
记录用户每日学习任务及测试结果  
```sql
CREATE TABLE `learning_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `learning_date` date NOT NULL COMMENT '学习日期',
  `mode_id` tinyint NOT NULL COMMENT '学习模式（关联learning_mode.id）',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `test_correct_rate` decimal(5,2) DEFAULT NULL COMMENT '测试正确率（百分比）',
  `total_duration` int NOT NULL COMMENT '总学习时长（秒）',
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`learning_date`),
  CONSTRAINT `fk_lr_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_lr_mode` FOREIGN KEY (`mode_id`) REFERENCES `learning_mode` (`id`)
) ENGINE=InnoDB COMMENT '学习任务记录表';
```


### 7. 学习单词关联表（`learning_word`）  
记录单次学习中包含的单词  
```sql
CREATE TABLE `learning_word` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `learning_record_id` bigint NOT NULL COMMENT '关联学习记录ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `mastery_change` tinyint DEFAULT NULL COMMENT '学习后等级变化（如+1/-1）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_learning_word` (`learning_record_id`,`word_id`),
  CONSTRAINT `fk_lw_learning` FOREIGN KEY (`learning_record_id`) REFERENCES `learning_record` (`id`),
  CONSTRAINT `fk_lw_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '学习-单词关联表';
```


### 8. 复习策略表（`review_strategy`）  
定义不同类型单词的复习规则  
```sql
CREATE TABLE `review_strategy` (
  `id` tinyint NOT NULL COMMENT '策略ID',
  `strategy_name` varchar(20) NOT NULL COMMENT '策略名称（密集/正常/稀疏/被动）',
  `applicable_condition` varchar(200) NOT NULL COMMENT '适用条件（如"长难词+L0"）',
  `interval_rule` varchar(100) NOT NULL COMMENT '复习间隔规则（如"1h,3h,1d"）',
  `frequency` int NOT NULL COMMENT '每日复习频次',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT '复习策略配置表';
```


### 9. 复习记录表（`review_record`）  
记录用户复习行为及效果  
```sql
CREATE TABLE `review_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `word_id` bigint NOT NULL COMMENT '关联单词ID',
  `review_time` datetime NOT NULL COMMENT '复习时间',
  `strategy_id` tinyint NOT NULL COMMENT '使用的复习策略',
  `review_method` tinyint NOT NULL COMMENT '复习方式（1=主动，2=被动，3=快速）',
  `correct_rate` decimal(5,2) DEFAULT NULL COMMENT '复习正确率',
  `speed_used` int NOT NULL COMMENT '复习时使用的语速（百分比）',
  PRIMARY KEY (`id`),
  KEY `idx_user_word_time` (`user_id`,`word_id`,`review_time`),
  CONSTRAINT `fk_rr_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_rr_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`),
  CONSTRAINT `fk_rr_strategy` FOREIGN KEY (`strategy_id`) REFERENCES `review_strategy` (`id`)
) ENGINE=InnoDB COMMENT '复习记录表';
```


### 10. 自定义材料表（`custom_material`）  
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
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_word` (`user_id`,`word_id`),
  CONSTRAINT `fk_cm_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_cm_word` FOREIGN KEY (`word_id`) REFERENCES `word` (`id`)
) ENGINE=InnoDB COMMENT '自定义记忆材料表';
```


### 11. 文章表（`article`）  
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


### 12. 水平评估表（`level_assessment`）  
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


### 设计说明  
1. **关系完整性**：通过外键关联确保数据一致性（如用户-单词进度、学习记录-单词）。  
2. **动态计算**：长难词判定通过生成列（`is_long_difficult`）基于用户水平动态计算，无需冗余存储。  
3. **性能优化**：核心查询字段（如`user_id`、`word_id`、时间字段）均建立索引，提升查询效率。  
4. **扩展性**：预留字段（如`difficulty_level`）支持未来按学段细化内容，JSON字段（如`level_distribution`）适配灵活的统计数据存储。  

可根据实际业务需求补充词组表（`phrase`）、句型表（`sentence_pattern`）等扩展表。