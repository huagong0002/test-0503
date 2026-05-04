# 🎧 E-Listen - 高中英语听力智能训练系统

> 一个现代化的英语听力训练平台，支持音频管理、分段学习和进度追踪。

## ✨ 主要特性

- 📁 **材料库管理** - 上传、编辑、删除听力材料
- 🎯 **分段训练** - 支持时间分段和字幕标注
- ⚡ **变速播放** - 0.5x - 2.5x 变速控制
- 🔐 **安全认证** - 用户注册和登录（bcrypt 密码哈希）
- 📱 **响应式设计** - 支持手机、平板、桌面设备
- 🎨 **美观界面** - 现代化 UI 和流畅动画

## 🚀 快速开始

### 方式一：一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-repo-here)

### 方式二：本地运行

```bash
# 1. 克隆仓库
git clone <your-repo-url>
cd e-listen

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 凭证

# 4. 启动开发服务器
npm run dev

# 5. 访问应用
open http://localhost:3000
```

## ⚙️ 环境变量配置

在部署或运行前，请配置以下环境变量：

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 公钥 | `eyJhbGciOiJIUzI1NiIs...` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |

## 🏗️ 技术栈

- **前端框架**: React 19 + TypeScript + Vite
- **后端**: Express.js
- **数据库**: Supabase (PostgreSQL)
- **样式**: Tailwind CSS
- **动画**: Motion
- **密码安全**: bcrypt
- **部署**: Vercel

## 📊 Supabase 数据库结构

### users 表（用户表）
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### materials 表（听力材料表）
```sql
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  audio_url TEXT,
  script TEXT,
  segments JSONB,
  last_modified BIGINT,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔐 默认测试账号

### 本地开发（无 Supabase）
- 用户名: `admin` / 密码: `admin123`
- 用户名: `tester` / 密码: `password`

⚠️ **重要提示**: 生产环境请删除这些测试用户！

## 📁 项目结构

```
e-listen/
├── api/                  # 后端 API
│   └── index.ts         # 主服务器文件
├── src/                 # 前端代码
│   ├── App.tsx         # 主组件
│   ├── main.tsx        # 入口文件
│   ├── types.ts        # TypeScript 类型
│   └── utils/          # 工具函数
├── .env.example        # 环境变量模板
├── vercel.json         # Vercel 部署配置
└── package.json        # 项目配置
```

## 🌟 部署指南

### Vercel 部署（推荐）

1. **推送代码到 GitHub/GitLab**
2. **在 Vercel 导入项目**
   - 访问 https://vercel.com/new
   - 选择您的仓库
3. **配置环境变量**
   - 在 Vercel 项目设置中添加 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
4. **点击 Deploy** 🎉

### 传统服务器部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 或使用 PM2
pm2 start npm -- start
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 安全提示

1. **永远不要**提交 `.env` 文件到 Git
2. 生产环境请删除默认测试用户
3. 使用强密码保护 Supabase 账号
4. 启用 HTTPS 和 CORS 白名单
5. 定期更新依赖包

## 📈 开发说明

### 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 类型检查
npm run clean        # 清理构建文件
```

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 🆘 获取帮助

- 查看 [PROJECT_EVALUATION.md](./PROJECT_EVALUATION.md) 了解项目评估和优化建议
- 查看 [QUICKSTART.md](./QUICKSTART.md) 快速开始指南
- 如有问题请提交 Issue

---

<div align="center">
Made with ❤️ by E-Listen Team
</div>
