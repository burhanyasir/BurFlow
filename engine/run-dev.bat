@echo off
cd /d "D:\Proj Chatbot\engine"

echo Starting Mock LLM on port 3458...
start "mock-llm" /B node mock-llm-server.js
timeout /t 2 /nobreak >nul

echo Starting Engine on port 3456...
set NODE_ENV=development
set SEED_DEMO=true
set DEMO_API_KEY=demo-key-123
set LLM_API_KEY=sk-mock
set LLM_BASE_URL=http://localhost:3458

node packages/pipeline-orchestrator/dist/server.js
