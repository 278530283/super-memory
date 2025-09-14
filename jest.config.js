module.exports = {
  preset: "jest-expo",  // Expo 项目必备预设
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // 关键：在测试启动前加载 dotenv，读取 .env 文件
  setupFiles: ["dotenv/config"],
  // 配置路径别名解析
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1"
  },
  // 测试文件匹配规则（确保能找到 __test__ 目录下的测试）
  testMatch: ["**/__tests__/**/*.test.ts?(x)"]
};