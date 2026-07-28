$env:NODE_ENV="development"
$env:SEED_DEMO="true"
$env:DEMO_API_KEY="demo-key-123"
$env:LLM_API_KEY="sk-mock"
$env:LLM_BASE_URL="http://localhost:3458"
node mock-llm-server.js