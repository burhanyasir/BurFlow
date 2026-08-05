@echo off
set PORT=8080
set JWT_SECRET=burflow-local-dev-secret-change-in-production-2024
set DB_PATH=packages/saas-api/data/saas.db
set CORS_ORIGIN=http://localhost:3000,http://localhost:3456
set npm_config_cache=D:\npm-cache
cd /d D:\Proj Chatbot\engine
npx tsx packages/saas-api/src/index.ts
