import './fonts';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { DashboardPage } from './pages/Dashboard';
import { EditorPage } from './editor/EditorPage';
import { PrintPage } from './pages/PrintPage';
import { TemplatesPage } from './pages/Templates';
import { WebViewPage } from './pages/WebView';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const router = createBrowserRouter([
  { path: '/', element: <DashboardPage /> },
  { path: '/templates', element: <TemplatesPage /> },
  { path: '/resumes/:id', element: <EditorPage mode="resume" /> },
  { path: '/templates/:id/design', element: <EditorPage mode="template" /> },
  { path: '/print/:id', element: <PrintPage /> },
  { path: '/r/:id', element: <WebViewPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" style={{ '--width': '440px' } as React.CSSProperties} toastOptions={{ className: 'font-sans', classNames: { description: 'break-all' } }} />
    </QueryClientProvider>
  </StrictMode>,
);
