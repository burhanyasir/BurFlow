import { useLocation } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './lib/auth-context';
import { PublicLayout } from './layouts/PublicLayout';
import LandingPage from './pages/landing/LandingPageV3';
import FeaturesPage from './pages/features/FeaturesPage';
import PricingPage from './pages/pricing/PricingPage';
import AboutPage from './pages/about/AboutPage';
import ContactPage from './pages/contact/ContactPage';
import FAQPage from './pages/faq/FAQPage';
import BlogPage from './pages/blog/BlogPage';
import BlogArticlePage from './pages/blog/BlogArticlePage';
import DocsPage from './pages/docs/DocsPage';
import WidgetPage from './pages/docs/WidgetPage';
import ApiPage from './pages/docs/ApiPage';
import TrustCenterPage from './pages/trust/TrustCenterPage';
import DemoPage from './pages/demo/DemoPage';
import PrivacyPage from './pages/trust/PrivacyPage';
import ChangelogPage from './pages/trust/ChangelogPage';
import StatusPage from './pages/trust/StatusPage';
import MethodologyPage from './pages/trust/MethodologyPage';
import SecurityPage from './pages/trust/SecurityPage';
import CompliancePage from './pages/trust/CompliancePage';
import UptimePage from './pages/trust/UptimePage';
import SubprocessorsPage from './pages/trust/SubprocessorsPage';
import DpaPage from './pages/trust/DpaPage';
import ResponsibleAIPage from './pages/trust/ResponsibleAIPage';
import GroundedAnswersPage from './pages/trust/GroundedAnswersPage';
import TermsPage from './pages/legal/TermsPage';
import CookiesPage from './pages/legal/CookiesPage';

import DashboardPage from './pages/admin/dashboard/DashboardPage';
import AnalyticsDashboard from './pages/admin/analytics/AnalyticsDashboard';
import BillingDashboard from './pages/admin/billing/BillingDashboard';
import CitationDashboard from './pages/admin/citations/CitationDashboard';
import ConversationDashboard from './pages/admin/conversations/ConversationDashboard';
import ConversationDetailPage from './pages/admin/conversations/ConversationDetailPage';
import InsightsDashboard from './pages/admin/insights/InsightsDashboard';
import KnowledgeDashboard from './pages/admin/knowledge/KnowledgeDashboard';
import LeadInboxPage from './pages/admin/leads/LeadInboxPage';
import AgentInboxPage from './pages/admin/agent/AgentInboxPage';
import UnansweredDashboard from './pages/admin/unanswered/UnansweredDashboard';
import WidgetDashboard from './pages/admin/widget/WidgetDashboard';
import FollowUpQueuePage from './pages/admin/followups/FollowUpQueuePage';
import SettingsPage from './pages/admin/settings/SettingsPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from './lib/protected-route';
import { OnboardingPage } from './pages/admin/onboarding/OnboardingPage';
import ExecutiveDashboard from './pages/admin/dashboard/ExecutiveDashboard';

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

function RoutesWithAnimation() {
  const location = useLocation();
  return (
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
        <Route path="/docs" element={<PublicRoute><DocsPage /></PublicRoute>} />
        <Route path="/docs/widget" element={<PublicRoute><WidgetPage /></PublicRoute>} />
        <Route path="/docs/api" element={<PublicRoute><ApiPage /></PublicRoute>} />
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
