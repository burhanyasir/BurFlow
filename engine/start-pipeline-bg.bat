@echo off
set npm_config_cache=D:\npm-cache
cd /d "D:\Proj Chatbot\engine"
npx tsx packages/pipeline-orchestrator/src/server.ts > "D:\pipeline-out2.log" 2>&1
