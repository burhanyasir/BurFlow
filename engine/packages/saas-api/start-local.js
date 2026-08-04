process.env.JWT_SECRET = process.env.JWT_SECRET;
process.env.WIDGET_SECRET = process.env.WIDGET_SECRET;
process.env.APP_URL = process.env.APP_URL || 'http://localhost:5178';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CORS_ORIGIN = '*';
const { app, logger } = require('./dist/index.js');
const PORT = parseInt(process.env.PORT || '3457', 10);
app.listen(PORT, () => {
  console.log('SaaS API running on port ' + PORT);
});
