import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import DemoPage from './pages/demo/DemoPage';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DemoPage />
      </ToastProvider>
    </ThemeProvider>
  );
}
