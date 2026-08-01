import { useLocation } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import { PublicLayout } from './layouts/PublicLayout';
import LandingPage from './pages/landing/LandingPage';
import FeaturesPage from './pages/features/FeaturesPage';
import PricingPage from './pages/pricing/PricingPage';
import AboutPage from './pages/about/AboutPage';
import ContactPage from './pages/contact/ContactPage';
import FAQPage from './pages/faq/FAQPage';
import BlogPage from './pages/blog/BlogPage';
import DocsPage from './pages/docs/DocsPage';

import DashboardPage from './pages/admin/dashboard/DashboardPage';
import ExecutiveDashboard from './pages/admin/dashboard/ExecutiveDashboard';
import AnalyticsDashboard from './pages/admin/analytics/AnalyticsDashboard';
import BillingDashboard from './pages/admin/billing/BillingDashboard';
import CitationDashboard from './pages/admin/citations/CitationDashboard';
import ConversationDashboard from './pages/admin/conversations/ConversationDashboard';
import ConversationDetailPage from './pages/admin/conversations/ConversationDetailPage';
import InsightsDashboard from './pages/admin/insights/InsightsDashboard';
import KnowledgeDashboard from './pages/admin/knowledge/KnowledgeDashboard';
import LeadInboxPage from './pages/admin/leads/LeadInboxPage';
import UnansweredDashboard from './pages/admin/unanswered/UnansweredDashboard';
import WidgetDashboard from './pages/admin/widget/WidgetDashboard';
import FollowUpQueuePage from './pages/admin/followups/FollowUpQueuePage';
import SettingsPage from './pages/admin/settings/SettingsPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

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
        <Route path="/docs" element={<PublicRoute><DocsPage /></PublicRoute>} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Admin Dashboard Routes */}
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/executive" element={<ExecutiveDashboard />} />
        <Route path="/admin/conversations" element={<ConversationDashboard />} />
        <Route path="/admin/conversations/:id" element={<ConversationDetailPage />} />
        <Route path="/admin/knowledge" element={<KnowledgeDashboard />} />
        <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
        <Route path="/admin/leads" element={<LeadInboxPage />} />
        <Route path="/admin/insights" element={<InsightsDashboard />} />
        <Route path="/admin/billing" element={<BillingDashboard />} />
        <Route path="/admin/widget" element={<WidgetDashboard />} />
        <Route path="/admin/unanswered" element={<UnansweredDashboard />} />
        <Route path="/admin/citations" element={<CitationDashboard />} />
        <Route path="/admin/followups" element={<FollowUpQueuePage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <RoutesWithAnimation />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
