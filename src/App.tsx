import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import PatientDashboard from "./pages/dashboard/PatientDashboard";
import DoctorDashboard from "./pages/dashboard/DoctorDashboard";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GoogleCalendarProvider } from "./context/GoogleCalendarContext";
import { Skeleton } from "./components/ui/skeleton";
import About from "./pages/About";
import Features from "./pages/Features";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode, 
  requiredRole?: 'patient' | 'doctor' 
}) => {
  const { user, profile, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("ProtectedRoute mount - Auth state:", { 
      isAuthenticated, 
      role: profile?.role, 
      loading, 
      path: location.pathname 
    });
  }, [isAuthenticated, profile, loading, location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login from', location.pathname);
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    console.log(`User role (${profile?.role}) doesn't match required role (${requiredRole}), redirecting`);
    return <Navigate to={`/dashboard/${profile?.role || 'patient'}`} replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute = ({ 
  children, 
  redirectTo 
}: { 
  children: React.ReactNode, 
  redirectTo?: string 
}) => {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log("PublicOnlyRoute mount - Auth state:", { 
      isAuthenticated, 
      role: profile?.role, 
      loading, 
      path: location.pathname 
    });
  }, [isAuthenticated, profile, loading, location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('User already authenticated, redirecting from public only route', location.pathname);
    const defaultRedirect = `/dashboard/${profile?.role || 'patient'}`;
    const targetPath = redirectTo || defaultRedirect;
    console.log(`Redirecting to: ${targetPath}`);
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};

const AppWithAuth = () => (
  <AuthProvider>
    <GoogleCalendarProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/auth/login" element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        } />
        <Route path="/auth/register" element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        } />
        
        <Route path="/dashboard/patient" element={
          <ProtectedRoute requiredRole="patient">
            <Navigate to="/patient/overview" replace />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/doctor" element={
          <ProtectedRoute requiredRole="doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/patient/overview" element={
          <ProtectedRoute requiredRole="patient">
            <PatientOverview />
          </ProtectedRoute>
        } />
        <Route path="/patient/appointments" element={
          <ProtectedRoute requiredRole="patient">
            <PatientAppointments />
          </ProtectedRoute>
        } />
        <Route path="/patient/medications" element={
          <ProtectedRoute requiredRole="patient">
            <PatientMedications />
          </ProtectedRoute>
        } />
        <Route path="/patient/health-query" element={
          <ProtectedRoute requiredRole="patient">
            <PatientHealthQuery />
          </ProtectedRoute>
        } />
        <Route path="/patient/assessment" element={
          <ProtectedRoute requiredRole="patient">
            <PatientAssessment />
          </ProtectedRoute>
        } />
        <Route path="/patient/health-tips" element={
          <ProtectedRoute requiredRole="patient">
            <PatientHealthTips />
          </ProtectedRoute>
        } />
        <Route path="/patient/doctors" element={
          <ProtectedRoute requiredRole="patient">
            <PatientDoctors />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </GoogleCalendarProvider>
  </AuthProvider>
);

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppWithAuth />
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
