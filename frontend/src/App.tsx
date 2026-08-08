import { useLocation, Navigate } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './lib/auth-context';
import { PublicLayout } from './layouts/PublicLayout';
import LandingPage from './pages/landing/LandingPageV2';
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
import PrivacyPage from './pages/trust/PrivacyPage';
import ChangelogPage from './pages/trust/ChangelogPage';
import StatusPage from './pages/trust/StatusPage';
import MethodologyPage from './pages/trust/MethodologyPage';

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
import { ProtectedRoute } from './lib/protected-route';
import { OnboardingPage } from './pages/admin/onboarding/OnboardingPage';

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
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
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
        <Route path="/privacy" element={<PublicRoute><PrivacyPage /></PublicRoute>} />
        <Route path="/changelog" element={<PublicRoute><ChangelogPage /></PublicRoute>} />
        <Route path="/status" element={<PublicRoute><StatusPage /></PublicRoute>} />
        <Route path="/methodology" element={<PublicRoute><MethodologyPage /></PublicRoute>} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Admin Dashboard Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute><AgentInboxPage /></ProtectedRoute>} />
        <Route path="/dashboard/executive" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="/dashboard/conversations" element={<ProtectedRoute><ConversationDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/conversations/:id" element={<ProtectedRoute><ConversationDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard/knowledge" element={<ProtectedRoute><KnowledgeDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/leads" element={<ProtectedRoute><LeadInboxPage /></ProtectedRoute>} />
        <Route path="/dashboard/insights" element={<ProtectedRoute><InsightsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/billing" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/widget" element={<ProtectedRoute><WidgetDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/unanswered" element={<ProtectedRoute><UnansweredDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/citations" element={<ProtectedRoute><CitationDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/followups" element={<ProtectedRoute><FollowUpQueuePage /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
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
