import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BillingProvider } from "./contexts/BillingContext";
import { ProductProvider } from "./contexts/ProductContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import DashboardLayout from "./components/DashboardLayout";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAStatus from "./components/PWAStatus";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SimpleBilling from "./pages/SimpleBilling";
import BillingHistory from "./pages/BillingHistory";
import BillPreviewPage from "./pages/BillPreviewPage";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  // Prevent mouse wheel scrolling on number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add event listener to document
    document.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <CompanyProvider>
          <Login />
        </CompanyProvider>
      } />
      
      {/* Protected routes - all other paths */}
      <Route path="/*" element={
        <ProtectedRoute>
          <CompanyProvider>
            <ProductProvider>
              <BillingProvider>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/billing" element={<SimpleBilling />} />
                    <Route path="/billing-history" element={<BillingHistory />} />
                    <Route path="/bill-preview/:id" element={<BillPreviewPage />} />
                    <Route path="/bill-preview" element={<BillPreviewPage />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile" element={<Profile />} />
                    {/* Redirect any unknown routes to dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  <PWAInstallPrompt />
                  <PWAStatus />
                </DashboardLayout>
            </BillingProvider>
          </ProductProvider>
          </CompanyProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
