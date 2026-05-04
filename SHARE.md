# 📦 E-Listen 项目分享指南

本指南详细说明如何分享和部署 E-Listen 项目给其他人使用。

---

## 🚀 分享方式概览

| 方式 | 难度 | 适用场景 | 推荐 |
|------|------|----------|------|
| Vercel 一键部署 | ⭐ | 演示/快速分享 | ✅ 最推荐 |
| GitHub + Vercel | ⭐⭐ | 开源项目/协作 | ✅ 推荐 |
| Docker 镜像 | ⭐⭐ | 企业部署 | ✅ 推荐 |
| 传统服务器 | ⭐⭐⭐ | 自有服务器 | 可选 |
| 源码压缩包 | ⭐ | 技术人员 | 可选 |

---

## 方式一：Vercel 一键部署（最简单）

### 准备工作

1. **确保代码在 GitHub/GitLab**

2. **修改 README.md 中的部署按钮**
   编辑 [README.md](./README.md#L18) 中的仓库 URL：
   ```markdown
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR-USERNAME%2FYOUR-REPO)
   ```

3. **准备 Supabase 凭证**
   - Supabase URL
   - Supabase ANON KEY

### 部署步骤

1. **分享仓库链接给朋友**
   ```
   https://github.com/YOUR-USERNAME/e-listen
   ```

2. **朋友点击 README 中的 "Deploy with Vercel" 按钮**

3. **在 Vercel 配置中：**
   - 填写项目名称
   - 添加环境变量：
     - `SUPABASE_URL` = 您的 Supabase URL
     - `SUPABASE_ANON_KEY` = 您的 Supabase 公钥

4. **点击 Deploy，等待完成！** 🎉

---

## 方式二：GitHub + Vercel（最灵活）

### 步骤 1：初始化 Git 仓库

```bash
# 在项目根目录
git init
git add .
git commit -m "Initial commit - E-Listen Project"
```

### 步骤 2：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建仓库（名称推荐：`e-listen`）
3. 按照 GitHub 提示推送代码

```bash
git remote add origin https://github.com/YOUR-USERNAME/e-listen.git
git branch -M main
git push -u origin main
```

### 步骤 3：配置 Vercel 自动部署

1. 访问 https://vercel.com/new
2. 导入您的 GitHub 仓库
3. 配置环境变量（在项目 Settings > Environment Variables）：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. 点击部署

### 步骤 4：分享给他人

```
👉 访问链接: https://your-project-name.vercel.app
👉 源代码: https://github.com/YOUR-USERNAME/e-listen
```

---

## 方式三：Docker 镜像分享

### 构建 Docker 镜像

```bash
# 构建镜像
docker build -t e-listen:latest .

# 测试本地运行
docker run -d -p 3000:3000 \
  -e SUPABASE_URL="your-supabase-url" \
  -e SUPABASE_ANON_KEY="your-supabase-key" \
  e-listen:latest
```

### 推送到 Docker Hub

```bash
# 登录 Docker Hub
docker login

# 打标签
docker tag e-listen:latest your-username/e-listen:latest

# 推送
docker push your-username/e-listen:latest
```

### 其他人使用

```bash
# 拉取并运行
docker pull your-username/e-listen:latest
docker run -d -p 3000:3000 \
  -e SUPABASE_URL="their-supabase-url" \
  -e SUPABASE_ANON_KEY="their-supabase-key" \
  your-username/e-listen:latest
```

---

## 方式四：传统服务器部署

### 适用于 Linux 服务器

```bash
# 1. 在服务器上安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 克隆项目
git clone https://github.com/YOUR-USERNAME/e-listen.git
cd e-listen

# 3. 安装依赖
npm ci

# 4. 配置环境变量
cp .env.example .env
nano .env  # 填入凭证

# 5. 构建
npm run build

# 6. 启动（使用 PM2 保持运行）
npm install -g pm2
pm2 start npm --name "e-listen" -- start

# 7. 检查状态
pm2 status
pm2 logs e-listen
```

### 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 方式五：源码压缩包分享

### 创建压缩包

```bash
# 创建干净的压缩包（排除 node_modules 等）
git archive --format=zip -o e-listen.zip HEAD
```

### 分享给其他人

发送 `e-listen.zip` 给他们，然后：

```bash
# 解压
unzip e-listen.zip -d e-listen
cd e-listen

# 按 README.md 说明操作
npm install
cp .env.example .env.local
# 编辑 .env.local
npm run dev
```

---

## 🔐 重要安全提醒

### 1. 千万不要提交 .env 文件！

确保 `.env` 在 `.gitignore` 中（已配置）。

### 2. 生产环境删除测试用户

修改 [api/index.ts](./api/index.ts) 中的 `LOCAL_USERS`，生产环境应该移除。

### 3. 使用单独的 Supabase 项目

建议每个部署使用独立的 Supabase 项目，或者：
- 正确配置 RLS (Row Level Security)
- 使用单独的 schema
- 限制 API Key 权限

### 4. HTTPS 强制

生产环境务必使用 HTTPS：
- Vercel 自动提供 HTTPS
- 自有服务器使用 Let's Encrypt

---

## 📋 Supabase 设置指南

### 新用户设置步骤

1. **注册 Supabase 账号**
   - 访问 https://supabase.com
   - 创建新项目

2. **获取凭证**
   - Project Settings → API
   - 复制 `URL` 和 `anon public`

3. **运行数据库脚本**
   - 在 Supabase SQL Editor 中
   - 打开 [setup-supabase.sql](./setup-supabase.sql)
   - 运行该脚本创建表

4. **配置允许的 URL**
   - Authentication → URL Configuration
   - 添加部署的域名

---

## 📞 分享检查清单

在分享前，请确认：

- [ ] README.md 已完整填写
- [ ] .env.example 已更新
- [ ] .gitignore 配置正确
- [ ] 测试账号已移除（或标记清楚）
- [ ] Vercel 部署按钮链接正确
- [ ] setup-supabase.sql 可正常运行
- [ ] 代码类型检查通过 (`npm run lint`)
- [ ] 本地运行测试通过

---

## 🎯 快速分享流程（推荐）

对于大多数情况，使用这个流程：

1. ✅ **推送到 GitHub**
2. ✅ **配置 Vercel 自动部署**
3. ✅ **测试部署的应用**
4. ✅ **分享这两个链接：**
   ```
   🌐 演示网站: https://your-app.vercel.app
   📖 源代码: https://github.com/your-username/e-listen
   ```

---

## 📚 相关文档

- [README.md](./README.md) - 项目主文档
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [PROJECT_EVALUATION.md](./PROJECT_EVALUATION.md) - 项目评估
- [SETUP-SUPABASE.SQL](./setup-supabase.sql) - 数据库脚本

---

有问题？查看项目文档或提交 Issue！ 💡
