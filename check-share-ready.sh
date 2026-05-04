#!/bin/bash

# E-Listen 项目分享前检查脚本

echo "🔍 E-Listen 项目分享准备检查"
echo "==============================="
echo ""

# 1. 检查必需文件
echo "📋 检查必需文件..."
required_files=(
  "README.md"
  "package.json"
  "vercel.json"
  ".env.example"
  ".gitignore"
  "setup-supabase.sql"
  "SHARE.md"
)

all_exist=true
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (缺失)"
    all_exist=false
  fi
done
echo ""

# 2. 检查类型检查
echo "🔧 运行类型检查..."
if npm run lint 2>&1 > /dev/null; then
  echo "  ✅ TypeScript 类型检查通过"
else
  echo "  ❌ TypeScript 类型检查失败，请运行 'npm run lint' 查看详情"
fi
echo ""

# 3. 检查 .env 文件安全
echo "🔐 检查 .env 文件..."
if [ -f ".env" ] || [ -f ".env.local" ]; then
  echo "  ⚠️  .env 文件存在 - 确保不要提交到 Git!"
  if grep -q "^\.env" .gitignore && grep -q "^\.env.local" .gitignore; then
    echo "  ✅ .env 文件已在 .gitignore 中"
  else
    echo "  ❌ .env 文件未在 .gitignore 中!"
  fi
else
  echo "  ✅ 没有 .env 文件 (正常)"
fi
echo ""

# 4. 检查 Git 状态
echo "🌿 检查 Git 状态..."
if [ -d ".git" ]; then
  if git diff --quiet; then
    echo "  ✅ 工作区干净，没有未提交的更改"
  else
    echo "  ⚠️  有未提交的更改 (建议先提交)"
  fi
else
  echo "  ⚠️  Git 仓库未初始化"
fi
echo ""

# 5. 检查 node_modules
echo "📦 检查依赖..."
if [ -d "node_modules" ]; then
  echo "  ✅ node_modules 已安装"
else
  echo "  ⚠️  node_modules 未安装 (运行 'npm install')"
fi
echo ""

# 6. 总结
echo "==============================="
if $all_exist; then
  echo "✅ 项目分享准备就绪！"
  echo ""
  echo "📝 下一步："
  echo "1. 编辑 README.md 中的仓库 URL"
  echo "2. 初始化 Git 并推送到 GitHub"
  echo "3. 在 Vercel 上部署"
  echo "4. 分享 SHARE.md 指南"
else
  echo "❌ 还有缺失的文件，请先补充"
fi
echo ""
echo "查看 SHARE.md 了解详细分享指南"
