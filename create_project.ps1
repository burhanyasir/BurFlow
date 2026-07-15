# Create the entire project structure for AI-Customer-Support-Chatbot-SaaS

$baseDir = "D:\\Proj Chatbot\\AI-Customer-Support-Chatbot-SaaS"

function New-Directory([string]$path) {
    $fullPath = "$baseDir\\$path"
    if (-not (Test-Path $fullPath)) {
        New-Item -Path $fullPath -ItemType Directory -Force | Out-Null
        Write-Host "Created: $fullPath"
    }
}

$directories = @(
    "frontend",
    "backend",
    "docker",
    "docs",
    "scripts",
    ".github",
    ".github\workflows",
    "frontend\src",
    "frontend\src\components\ui",
    "frontend\src\components\layout",
    "frontend\src\components\features",
    "frontend\src\features\auth",
    "frontend\src\features\chatbot",
    "frontend\src\features\faq",
    "frontend\src\features\appointments",
    "frontend\src\features\leads",
    "frontend\src\hooks",
    "frontend\src\services",
    "frontend\src\stores",
    "frontend\src\utils",
    "frontend\src\types",
    "frontend\src\api",
    "frontend\src\tests",
    "frontend\src\e2e",
    "frontend\src\public",
    "frontend\src\deployment",
    "frontend\docs",
    "backend\src",
    "backend\src\application\use-cases",
    "backend\src\application\services",
    "backend\src\application\interfaces",
    "backend\src\domain\entities",
    "backend\src\domain\value-objects",
    "backend\src\domain\exceptions",
    "backend\src\infrastructure\database\migrations",
    "backend\src\infrastructure\database\entities",
    "backend\src\infrastructure\database\repositories",
    "backend\src\infrastructure\auth",
    "backend\src\infrastructure\external-apis",
    "backend\src\infrastructure\logging",
    "backend\src\infrastructure\middlewares",
    "backend\src\infrastructure\cache",
    "backend\src\presentation\http",
    "backend\src\presentation\routes",
    "backend\src\presentation\dto",
    "backend\src\shared\types",
    "backend\src\shared\constants",
    "backend\src\shared\utils",
    "backend\src\config",
    "backend\src\migrations",
    "backend\src\seeds",
    "backend\src\docs"
)

# Create all directories
foreach ($dir in $directories) {
    New-Directory $dir
}

Write-Host "Project structure created successfully!"

# Create main package.json
$mainPackageJson = @{
    name = "ai-customer-support-chatbot-saas"
    version = "0.1.0"
    description = "A production-quality AI Customer Support Chatbot SaaS starter with modern React frontend and backend API"
    main = "backend/src/main.ts"
    private = $true
    scripts = @{
        dev = "concurrently \"dev:backend dev:frontend\""
        'dev:backend' = "cd backend && nest start --watch"
        'dev:frontend' = "cd frontend && next dev"
        build = "npm run build:backend && npm run build:frontend"
        'build:backend' = "cd backend && nest build"
        'build:frontend' = "cd frontend && next build"
        start = "concurrently \"start:backend start:frontend\""
        'start:backend' = "cd backend && node dist/main"
        'start:frontend' = "cd frontend && next start"
        lint = "npm run lint:backend && npm run lint:frontend"
        'lint:backend' = "cd backend && eslint src --ext .ts"
        'lint:frontend' = "cd frontend && next lint"
        format = "prettier --write frontend/src backend/src"
        test = "npm run test:backend && npm run test:frontend"
        'test:backend' = "cd backend && jest"
        'test:frontend' = "cd frontend && jest"
        typeorm = "cd backend && typeorm"
        'typeorm:migrate' = "cd backend && typeorm migration:generate -n"
        'typeorm:run' = "cd backend && typeorm migration:run"
        'typeorm:revert' = "cd backend && typeorm migration:revert"
    }
    keywords = @( "ai", "chatbot", "customer-support", "react", "typescript", "nestjs", "saas" )
    author = ""
    license = "UNLICENSED"
    engines = @{ "node" = "18.x"; "npm" = "9.x" }
}

$mainPackageJson | ConvertTo-Json -Depth 10 | Set-Content "$baseDir\package.json"

Write-Host "Created root package.json"

# Create backend package.json
$backendPackageJson = @{
    name = "ai-customer-support-chatbot-saas-backend"
    version = "0.1.0"
    private = $true
    scripts = @{
        dev = "nest start --watch"
        build = "nest build"
        start = "node dist/main"
        lint = "eslint '{src,test}/**/*.ts'"
        test = "jest"
        typeorm = "typeorm"
    }
    dependencies = @{
        "@nestjs/core" = "^10.4.0"
        "@nestjs/common" = "^10.4.0"
        "@nestjs/config" = "^3.0.2"
        "@nestjs/platform-express" = "^10.4.0"
        "@nestjs/typeorm" = "^10.0.5"
        "@nestjs/jwt" = "^10.2.0"
        "@nestjs/passport" = "^10.0.6"
        passport = "^0.7.0"
        "passport-jwt" = "^4.0.1"
        "passport-local" = "^1.0.5"
        "passport-google-oauth20" = "^2.0.0"
        typeorm = "^0.3.18"
        "reflect-metadata" = "^0.2.2"
        "class-transformer" = "^0.14.1"
        "class-validator" = "^0.14.3"
        pg = "^8.12.0"
        redis = "^4.6.0"
        axios = "^1.7.2"
        "@types/axios" = "^0.14.0"
        winston = "^3.13.0"
        pino = "^9.0.0"
        "pino-http" = "^8.4.0"
        "@nestjs/swagger" = "^7.3.1"
        "swagger-ui-express" = "^5.0.1"
        uuid = "^9.0.1"
        "date-fns" = "^2.30.0"
        zod = "^3.22.4"
    }
    devDependencies = @{
        "@nestjs/cli" = "^10.4.0"
        "@nestjs/schematics" = "^10.4.0"
        "@nestjs/testing" = "^10.4.0"
        "@types/express" = "^4.18.2"
        "@types/jest" = "^29.5.12"
        "@types/node" = "^18.21.0"
        "@types/passport-jwt" = "^4.0.3"
        "@types/passport-local" = "^1.0.0"
        "@typescript-eslint/eslint-plugin" = "^7.9.0"
        "@typescript-eslint/parser" = "^7.9.0"
        eslint = "^8.56.0"
        "eslint-config-prettier" = "^9.1.0"
        "eslint-plugin-import" = "^2.29.1"
        jest = "^29.7.3"
        prettier = "^3.2.5"
        supertest = "^6.3.0"
        "ts-jest" = "^29.1.2"
        "ts-node" = "^10.9.2"
        "typeorm-seeding" = "^1.6.1"
        "@flydotio/dockerfile" = "^0.5.0"
        dotenv = "^16.4.5"
    }
}

$backendPackageJson | ConvertTo-Json -Depth 10 | Set-Content "$baseDir\backend\package.json"

Write-Host "Created backend package.json"

# Create frontend package.json
$frontendPackageJson = @{
    name = "ai-customer-support-chatbot-saas-frontend"
    version = "0.1.0"
    private = $true
    scripts = @{
        dev = "next dev"
        build = "next build"
        start = "next start"
        lint = "next lint"
        test = "jest"
        'test:watch' = "jest --watch"
    }
    dependencies = @{
        next = "14.2.5"
        react = "^18.3.0"
        "react-dom" = "^18.3.0"
        "@next-auth/react" = "^1.0.0"
        "@radix-ui/react-slot" = "^1.0.0"
        "class-variance-authority" = "^0.4.0"
        clsx = "^2.1.1"
        "lucide-react" = "^0.263.0"
        "tailwind-merge" = "^2.5.2"
        "react-query" = "^3.39.3"
        zustand = "^4.5.2"
        "socket.io-client" = "^4.7.2"
        "date-fns" = "^2.30.0"
        zod = "^3.22.4"
        axios = "^1.7.2"
    }
    devDependencies = @{
        "@types/node" = "^20"
        "@types/react" = "^18"
        "@types/react-dom" = "^18"
        typescript = "^5"
        eslint = "^8"
        "eslint-config-next" = "^14.2.5"
        tailwindcss = "^3.3.6"
        autoprefixer = "^10.4.16"
        postcss = "^8.4.32"
        jest = "^29.7.0"
        "@testing-library/react" = "^14.2.2"
        "@testing-library/jest-dom" = "^5.18.1"
        prettier = "^3.2.5"
        dotenv = "^16.4.5"
    }
}

$frontendPackageJson | ConvertTo-Json -Depth 10 | Set-Content "$baseDir\frontend\package.json"

Write-Host "Created frontend package.json"

# Create backend TypeScript config
$backendTsConfig = @{
    compilerOptions = @{
        target = "ES2022"
        module = "commonjs"
        lib = @("ES2022")
        outDir = "./dist"
        rootDir = "./src"
        strict = $true
        noImplicitAny = $true
        noUnusedLocals = $true
        noUnusedParameters = $true
        noImplicitReturns = $true
        noFallthroughCasesInSwitch = $true
        skipLibCheck = $true
        forceConsistentCasingInFileNames = $true
        resolveJsonModule = $true
        declaration = $true
        declarationMap = $true
        sourceMap = $true
        esModuleInterop = $true
        allowSyntheticDefaultImports = $true
        types = @("node")
        stripInternal = $true
    }
    include = @("src/**/*")
    exclude = @("node_modules", "dist")
}

$backendTsConfig | ConvertTo-Json -Depth 10 | Set-Content "$baseDir\backend\tsconfig.json"

Write-Host "Created backend tsconfig.json"

# Create frontend TypeScript config
$frontendTsConfig = @{
    extends = "next/core/web"
    compilerOptions = @{
        target = "ES2022"
        module = "esnext"
        lib = @("dom", "dom.iterable", "ES2022")
        allowJs = $true
        skipLibCheck = $true
        strict = $true
        noUnusedLocals = $true
        noUnusedParameters = $true
        noImplicitReturns = $true
        noFallthroughCasesInSwitch = $true
        forceConsistentCasingInFileNames = $true
        resolveJsonModule = $true
        incremental = $true
        plugins = @(@{ name = "nextjs-core-pages" })
        types = @("@types/jest")
        typeRoots = @("src/types", "../../backend/src/types")
    }
    include = @("src/**/*", "../../backend/src/types/**/*.ts", "../../backend/src/shared/types/**/*.ts")
    exclude = @("node_modules")
}

$frontendTsConfig | ConvertTo-Json -Depth 10 | Set-Content "$baseDir\frontend\tsconfig.json"

Write-Host "Created frontend tsconfig.json"

Write-Host "All project files and directories created successfully!"
