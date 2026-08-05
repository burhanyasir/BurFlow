$env:JWT_SECRET='burflow-local-dev-secret-change-in-production-2024'
$env:WIDGET_SECRET='local-dev-widget-secret-1234567890123456789012345678901234567890'
$env:DB_PATH='./data/saas.db'
$env:CORS_ORIGIN='http://localhost:5178'
$env:PIPELINE_URL='http://localhost:3456'
$env:INTERNAL_SYNC_KEY='dev-sync-key-1234567890123456789012345678901234567890'
$env:SENDGRID_API_KEY=''
$env:EMAIL_PROVIDER='CONSOLE'
node dist/index.js
