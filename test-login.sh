#!/bin/bash

# E-Listen 登录问题诊断脚本

echo "🔍 E-Listen 登录问题诊断"
echo "=============================="
echo ""

# 1. 检查后端服务器是否运行
echo "1️⃣ 检查后端服务器..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ 后端服务器正在运行"
    curl -s http://localhost:3000/api/health | head -c 200
    echo ""
    echo ""
else
    echo "   ❌ 后端服务器未运行"
    echo "   💡 请运行: npm run dev"
    echo ""
    exit 1
fi

# 2. 测试登录 API
echo "2️⃣ 测试登录 API..."
echo "   发送测试登录请求 (admin/admin123)..."
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "   HTTP 状态码: $http_code"
echo "   响应内容: $body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "   ✅ 登录 API 正常工作"
    echo ""
else
    echo "   ❌ 登录 API 返回错误"
    echo "   💡 请检查服务器日志"
    echo ""
fi

# 3. 测试注册 API
echo "3️⃣ 测试注册 API..."
username="testuser_$(date +%s)"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$username\",\"password\":\"test123456\"}")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "   测试用户名: $username"
echo "   HTTP 状态码: $http_code"
echo "   响应内容: $body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "   ✅ 注册 API 正常工作"
else
    echo "   ⚠️  注册 API 返回错误（可能是用户名已存在）"
fi

echo ""
echo "=============================="
echo "诊断完成！"
echo ""
echo "如果所有测试都通过但前端仍然报错，请："
echo "1. 打开浏览器开发者工具 (F12)"
echo "2. 查看 Console 和 Network 标签"
echo "3. 检查是否有 CORS 错误"
echo "4. 查看具体的请求和响应"
