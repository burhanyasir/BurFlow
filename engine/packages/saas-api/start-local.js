process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt-secret-1234567890123456789012345678901234567890';
process.env.WIDGET_SECRET = process.env.WIDGET_SECRET || 'local-dev-widget-secret-1234567890123456789012345678901234567890';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:5178';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CORS_ORIGIN = '*';
const { app, logger } = require('./dist/index.js');
const PORT = parseInt(process.env.PORT || '3457', 10);
app.listen(PORT, () => {
  console.log('SaaS API running on port ' + PORT);
});
