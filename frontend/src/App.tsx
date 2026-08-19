import { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './lib/auth-context';
import { PublicLayout } from './layouts/PublicLayout';
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from './lib/protected-route';
// The landing page is eager — it's the first paint. Everything else loads on
// demand so the marketing site ships a fraction of the JavaScript.
import LandingPage from './pages/landing/LandingPageV3';

const FeaturesPage = lazy(() => import('./pages/features/FeaturesPage'));
const PricingPage = lazy(() => import('./pages/pricing/PricingPage'));
const AboutPage = lazy(() => import('./pages/about/AboutPage'));
const ContactPage = lazy(() => import('./pages/contact/ContactPage'));
const FAQPage = lazy(() => import('./pages/faq/FAQPage'));
const BlogPage = lazy(() => import('./pages/blog/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/blog/BlogArticlePage'));
const ComparisonPage = lazy(() => import('./pages/comparison/ComparisonPage'));
const ComparisonArticle = lazy(() => import('./pages/comparison/ComparisonArticle'));
const IntegrationsHub = lazy(() => import('./pages/integrations/IntegrationsHub'));
const IntegrationArticle = lazy(() => import('./pages/integrations/IntegrationArticle'));
const DocsPage = lazy(() => import('./pages/docs/DocsPage'));
const WidgetPage = lazy(() => import('./pages/docs/WidgetPage'));
const ApiPage = lazy(() => import('./pages/docs/ApiPage'));
const QuickStartPage = lazy(() => import('./pages/docs/QuickStartPage'));
const KnowledgePage = lazy(() => import('./pages/docs/KnowledgePage'));
const IntegrationsPage = lazy(() => import('./pages/docs/IntegrationsPage'));
const TrustCenterPage = lazy(() => import('./pages/trust/TrustCenterPage'));
const DemoPage = lazy(() => import('./pages/demo/DemoPage'));
const ToolsPage = lazy(() => import('./pages/tools/ToolsPage'));
const LeadLeakCalculatorPage = lazy(() => import('./pages/tools/LeadLeakCalculatorPage'));
const ChatbotRoiCalculatorPage = lazy(() => import('./pages/tools/ChatbotRoiCalculatorPage'));
const FaqGeneratorPage = lazy(() => import('./pages/tools/FaqGeneratorPage'));
const WebpageToMarkdownPage = lazy(() => import('./pages/tools/WebpageToMarkdownPage'));
const SitemapValidatorPage = lazy(() => import('./pages/tools/SitemapValidatorPage'));
const DesignSystemPage = lazy(() => import('./pages/dev/DesignSystemPage'));
const PrivacyPage = lazy(() => import('./pages/trust/PrivacyPage'));
const ChangelogPage = lazy(() => import('./pages/trust/ChangelogPage'));
const StatusPage = lazy(() => import('./pages/trust/StatusPage'));
const MethodologyPage = lazy(() => import('./pages/trust/MethodologyPage'));
const SecurityPage = lazy(() => import('./pages/trust/SecurityPage'));
const CompliancePage = lazy(() => import('./pages/trust/CompliancePage'));
const UptimePage = lazy(() => import('./pages/trust/UptimePage'));
const SubprocessorsPage = lazy(() => import('./pages/trust/SubprocessorsPage'));
const DpaPage = lazy(() => import('./pages/trust/DpaPage'));
const ResponsibleAIPage = lazy(() => import('./pages/trust/ResponsibleAIPage'));
const GroundedAnswersPage = lazy(() => import('./pages/trust/GroundedAnswersPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));

const DashboardPage = lazy(() => import('./pages/admin/dashboard/DashboardPage'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/analytics/AnalyticsDashboard'));
const BillingDashboard = lazy(() => import('./pages/admin/billing/BillingDashboard'));
const CitationDashboard = lazy(() => import('./pages/admin/citations/CitationDashboard'));
const ConversationDashboard = lazy(() => import('./pages/admin/conversations/ConversationDashboard'));
const ConversationDetailPage = lazy(() => import('./pages/admin/conversations/ConversationDetailPage'));
const InsightsDashboard = lazy(() => import('./pages/admin/insights/InsightsDashboard'));
const KnowledgeDashboard = lazy(() => import('./pages/admin/knowledge/KnowledgeDashboard'));
const LeadInboxPage = lazy(() => import('./pages/admin/leads/LeadInboxPage'));
const AgentInboxPage = lazy(() => import('./pages/admin/agent/AgentInboxPage'));
const UnansweredDashboard = lazy(() => import('./pages/admin/unanswered/UnansweredDashboard'));
const WidgetDashboard = lazy(() => import('./pages/admin/widget/WidgetDashboard'));
const FollowUpQueuePage = lazy(() => import('./pages/admin/followups/FollowUpQueuePage'));
const SettingsPage = lazy(() => import('./pages/admin/settings/SettingsPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const OnboardingPage = lazy(() =>
  import('./pages/admin/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const ExecutiveDashboard = lazy(() => import('./pages/admin/dashboard/ExecutiveDashboard'));

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } }
};

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  return <PublicLayout><AnimatedPage>{children}</AnimatedPage></PublicLayout>;
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent-600)] border-t-transparent" aria-label="Loading" />
    </div>
  );
}

function RoutesWithAnimation() {
  const location = useLocation();
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<AnimatedPage><LandingPage /></AnimatedPage>} />
        <Route path="/features" element={<PublicRoute><FeaturesPage /></PublicRoute>} />
        <Route path="/pricing" element={<PublicRoute><PricingPage /></PublicRoute>} />
        <Route path="/about" element={<PublicRoute><AboutPage /></PublicRoute>} />
        <Route path="/contact" element={<PublicRoute><ContactPage /></PublicRoute>} />
        <Route path="/faq" element={<PublicRoute><FAQPage /></PublicRoute>} />
        <Route path="/blog" element={<PublicRoute><BlogPage /></PublicRoute>} />
        <Route path="/blog/:slug" element={<PublicRoute><BlogArticlePage /></PublicRoute>} />
        <Route path="/compare" element={<PublicRoute><ComparisonPage /></PublicRoute>} />
        <Route path="/compare/:slug" element={<PublicRoute><ComparisonArticle /></PublicRoute>} />
        <Route path="/integrations" element={<PublicRoute><IntegrationsHub /></PublicRoute>} />
        <Route path="/integrations/:slug" element={<PublicRoute><IntegrationArticle /></PublicRoute>} />
        <Route path="/docs" element={<PublicRoute><DocsPage /></PublicRoute>} />
        <Route path="/docs/widget" element={<PublicRoute><WidgetPage /></PublicRoute>} />
        <Route path="/docs/api" element={<PublicRoute><ApiPage /></PublicRoute>} />
        <Route path="/docs/quick-start" element={<PublicRoute><QuickStartPage /></PublicRoute>} />
        <Route path="/docs/knowledge" element={<PublicRoute><KnowledgePage /></PublicRoute>} />
        <Route path="/docs/integrations" element={<PublicRoute><IntegrationsPage /></PublicRoute>} />
        <Route path="/trust" element={<PublicRoute><TrustCenterPage /></PublicRoute>} />
        <Route path="/trust/security" element={<PublicRoute><SecurityPage /></PublicRoute>} />
        <Route path="/trust/compliance" element={<PublicRoute><CompliancePage /></PublicRoute>} />
        <Route path="/trust/privacy" element={<PublicRoute><PrivacyPage /></PublicRoute>} />
        <Route path="/trust/uptime" element={<PublicRoute><UptimePage /></PublicRoute>} />
        <Route path="/trust/subprocessors" element={<PublicRoute><SubprocessorsPage /></PublicRoute>} />
        <Route path="/trust/dpa" element={<PublicRoute><DpaPage /></PublicRoute>} />
        <Route path="/trust/responsible-ai" element={<PublicRoute><ResponsibleAIPage /></PublicRoute>} />
        <Route path="/trust/grounded-answers" element={<PublicRoute><GroundedAnswersPage /></PublicRoute>} />
        <Route path="/privacy" element={<PublicRoute><PrivacyPage /></PublicRoute>} />
        <Route path="/changelog" element={<PublicRoute><ChangelogPage /></PublicRoute>} />
        <Route path="/status" element={<PublicRoute><StatusPage /></PublicRoute>} />
        <Route path="/methodology" element={<PublicRoute><MethodologyPage /></PublicRoute>} />
        <Route path="/terms" element={<PublicRoute><TermsPage /></PublicRoute>} />
        <Route path="/cookies" element={<PublicRoute><CookiesPage /></PublicRoute>} />
        <Route path="/demo" element={<PublicRoute><DemoPage /></PublicRoute>} />
        <Route path="/tools" element={<PublicRoute><ToolsPage /></PublicRoute>} />
        <Route path="/tools/lead-leak-calculator" element={<PublicRoute><LeadLeakCalculatorPage /></PublicRoute>} />
        <Route path="/tools/chatbot-roi-calculator" element={<PublicRoute><ChatbotRoiCalculatorPage /></PublicRoute>} />
        <Route path="/tools/faq-generator" element={<PublicRoute><FaqGeneratorPage /></PublicRoute>} />
        <Route path="/tools/webpage-to-markdown" element={<PublicRoute><WebpageToMarkdownPage /></PublicRoute>} />
        <Route path="/tools/sitemap-validator" element={<PublicRoute><SitemapValidatorPage /></PublicRoute>} />
        <Route path="/design-system" element={<PublicRoute><DesignSystemPage /></PublicRoute>} />

        {/* Auth Routes */}
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Admin Dashboard Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute><AgentInboxPage /></ProtectedRoute>} />
        <Route path="/dashboard/executive" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/conversations" element={<ProtectedRoute><ConversationDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/conversations/:sessionId" element={<ProtectedRoute><ConversationDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard/knowledge" element={<ProtectedRoute><KnowledgeDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/leads" element={<ProtectedRoute><LeadInboxPage /></ProtectedRoute>} />
        <Route path="/dashboard/insights" element={<ProtectedRoute><AdminRoute><InsightsDashboard /></AdminRoute></ProtectedRoute>} />
        <Route path="/dashboard/billing" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/widget" element={<ProtectedRoute><WidgetDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/unanswered" element={<ProtectedRoute><AdminRoute><UnansweredDashboard /></AdminRoute></ProtectedRoute>} />
        <Route path="/dashboard/citations" element={<ProtectedRoute><AdminRoute><CitationDashboard /></AdminRoute></ProtectedRoute>} />
        <Route path="/dashboard/followups" element={<ProtectedRoute><FollowUpQueuePage /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><AdminRoute><SettingsPage /></AdminRoute></ProtectedRoute>} />
        <Route path="/dashboard/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* 404 catch-all */}
        <Route path="*" element={<PublicRoute>
          <div className="mx-auto max-w-xl px-4 py-32 text-center">
            <h1 className="text-4xl font-bold text-[var(--color-neutral-900)]">404</h1>
            <p className="mt-4 text-[var(--color-neutral-500)]">This page doesn't exist yet.</p>
            <a href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">
              ← Back to home
            </a>
          </div>
        </PublicRoute>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoutesWithAnimation />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
