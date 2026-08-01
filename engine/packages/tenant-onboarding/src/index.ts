import express from 'express';
import onboardingRouter from './routes/onboarding';
import widgetRouter from './routes/widget';
import knowledgeRouter from './routes/knowledge';
import wizardRouter from './routes/wizard';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use('/onboarding', onboardingRouter);
app.use('/wizard', wizardRouter);
app.use('/widget', widgetRouter);
app.use('/knowledge', knowledgeRouter);

export default app;
