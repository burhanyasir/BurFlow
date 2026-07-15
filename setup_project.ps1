# Create the entire project structure and initial files

set $baseDir = "D:\\Proj Chatbot\\AI-Customer-Support-Chatbot-SaaS"

function New-Directory([string]$path) {
    $fullPath = "$baseDir\\$path"
    New-Item -Path $fullPath -ItemType Directory -Force -ErrorAction SilentlyContinue
    Write-Host "Created: $fullPath"
}

# Main directory structure
New-Directory "frontend"
New-Directory "backend"
New-Directory "docker"
New-Directory "docs"
New-Directory "scripts"
New-Directory ".github\workflows"
New-Directory "frontend/src"
New-Directory "frontend/src/components/ui"
New-Directory "frontend/src/components/layout"
New-Directory "frontend/src/components/features"
New-Directory "frontend/src/features/auth"
New-Directory "frontend/src/features/chatbot"
New-Directory "frontend/src/features/faq"
New-Directory "frontend/src/features/appointments"
New-Directory "frontend/src/features/leads"
New-Directory "frontend/src/hooks"
New-Directory "frontend/src/services"
New-Directory "frontend/src/stores"
New-Directory "frontend/src/utils"
New-Directory "frontend/src/types"
New-Directory "frontend/src/api"
New-Directory "frontend/src/tests"
New-Directory "frontend/src/e2e"
New-Directory "frontend/src/public"
New-Directory "frontend/src/deployment"
New-Directory "frontend/docs"

New-Directory "backend/src"
New-Directory "backend/src/application/use-cases"
New-Directory "backend/src/application/services"
New-Directory "backend/src/application/interfaces"
New-Directory "backend/src/domain/entities"
New-Directory "backend/src/domain/value-objects"
New-Directory "backend/src/domain/exceptions"
New-Directory "backend/src/infrastructure/database/migrations"
New-Directory "backend/src/infrastructure/database/entities"
New-Directory "backend/src/infrastructure/database/repositories"
New-Directory "backend/src/infrastructure/auth"
New-Directory "backend/src/infrastructure/external-apis"
New-Directory "backend/src/infrastructure/logging"
New-Directory "backend/src/infrastructure/middlewares"
New-Directory "backend/src/infrastructure/cache"
New-Directory "backend/src/presentation/http"
New-Directory "backend/src/presentation/routes"
New-Directory "backend/src/presentation/dto"
New-Directory "backend/src/shared/types"
New-Directory "backend/src/shared/constants"
New-Directory "backend/src/shared/utils"
New-Directory "backend/src/config"
New-Directory "backend/src/migrations"
New-Directory "backend/src/seeds"
New-Directory "backend/src/docs"

Write-Host "Project structure created successfully!"

# Create root-level configuration files
Set-Content -Path "$baseDir\\package.json" -Value '{
  "name": "ai-customer-support-chatbot-saas",
  "version": "0.1.0",
  "description": "A production-quality AI Customer Support Chatbot SaaS starter with modern React frontend and backend API",
  "main": "backend/src/main.ts",
  "scripts": {
    "dev": "concurrently "" npm:dev:* """,
    "dev:backend": "nest start --watch",
    "dev:frontend": "next dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "nest build",
    "build:frontend": "next build",
    "start": "concurrently "" npm:start:* """,
    "start:backend": "node dist/main",
    "start:frontend": "next start",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "eslint backend/src --ext .ts",
    "lint:frontend": "eslint frontend/src --ext .tsx,.ts",
    "format": "prettier --write frontend/src backend/src",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "jest",
    "test:frontend": "jest --config frontend/jest.config.js",
    "typeorm": "typeorm-ts-node-commonjs",
    "typeorm:migrate": "typeorm migration:generate -n",
    "typeorm:run": "typeorm migration:run",
    "typeorm:revert": "typeorm migration:revert"
  },
  "keywords": [
    "ai",
    "chatbot",
    "customer-support",
    "react",
    "typescript",
    "nestjs",
    "saas"
  ],
  "author": "",
  "license": "UNLICENSED",
  "dependencies": {},
  "devDependencies": {},
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}'

Write-Host "Created root package.json"
