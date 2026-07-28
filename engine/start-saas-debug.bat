@echo off
set PORT=8080
set JWT_SECRET=test-secret-key-change-in-production
set CORS_ORIGIN=http://localhost:3000,http://localhost:3456
set npm_config_cache=D:\npm-cache
cd /d "D:\Proj Chatbot\engine"
start /B npx tsx packages/saas-api/src/index.ts > "D:\saas-debug.log" 2>&1
