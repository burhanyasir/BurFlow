import express from 'express';
import onboardingRouter from './routes/onboarding';
import widgetRouter from './routes/widget';
import knowledgeRouter from './routes/knowledge';

const app = express();
app.use(express.json());

app.use('/onboarding', onboardingRouter);
app.use('/widget', widgetRouter);
app.use('/knowledge', knowledgeRouter);

export default app;
