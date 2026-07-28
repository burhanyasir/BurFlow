@echo off
set PORT=3456
set JWT_SECRET=test-secret-key-change-in-production
set npm_config_cache=D:\npm-cache
cd /d D:\Proj Chatbot\engine
npx tsx packages/pipeline-orchestrator/src/server.ts
