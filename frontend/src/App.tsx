import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function PublicRoute({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="/features" element={<PublicRoute><FeaturesPage /></PublicRoute>} />
            <Route path="/pricing" element={<PublicRoute><PricingPage /></PublicRoute>} />
            <Route path="/about" element={<PublicRoute><AboutPage /></PublicRoute>} />
            <Route path="/contact" element={<PublicRoute><ContactPage /></PublicRoute>} />
            <Route path="/faq" element={<PublicRoute><FAQPage /></PublicRoute>} />
            <Route path="/blog" element={<PublicRoute><BlogPage /></PublicRoute>} />
            <Route path="/docs" element={<PublicRoute><DocsPage /></PublicRoute>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
