import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import EkvPage from "@/pages/EkvPage";
import EkvDetailPage from "@/pages/EkvDetailPage";
import LetterPage from "@/pages/LetterPage";
import LetterDetailPage from "@/pages/LetterDetailPage";
import LetterUploadPage from "@/pages/LetterUploadPage";
import MigratePage from "@/pages/MigratePage";
import LogsPage from "@/pages/LogsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminPermissionsPage from "@/pages/AdminPermissionsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="ekv" element={<EkvPage />} />
              <Route path="ekv/:id" element={<EkvDetailPage />} />
              <Route path="letter" element={<Navigate to="/dashboard/letter/all" replace />} />
              <Route path="letter/all" element={<LetterPage />} />
              <Route path="letter/upload" element={<LetterUploadPage />} />
              <Route path="letter/:id" element={<LetterDetailPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/permissions" element={<AdminPermissionsPage />} />
              <Route path="admin/migrate" element={<MigratePage />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
