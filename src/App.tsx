import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Footer } from "@/components/Footer";
const Index = lazy(() => import("./pages/Index.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const ProposalGenerator = lazy(() => import("./pages/ProposalGenerator.tsx"));
const FlyerGenerator = lazy(() => import("./pages/FlyerGenerator.tsx"));
const AttendancePage = lazy(() => import("./pages/AttendancePage.tsx"));
const ReportGenerator = lazy(() => import("./pages/ReportGenerator.tsx"));
const EventsPage = lazy(() => import("./pages/EventsPage.tsx"));
const BudgetDashboardPage = lazy(() => import("./pages/BudgetDashboardPage.tsx"));
const BudgetPlannerPage = lazy(() => import("./pages/BudgetPlannerPage.tsx"));
const PreviousBudgetsPage = lazy(() => import("./pages/PreviousBudgetsPage.tsx"));
const BudgetCategoriesPage = lazy(() => import("./pages/BudgetCategoriesPage.tsx"));
const BudgetAnalysisPage = lazy(() => import("./pages/BudgetAnalysisPage.tsx"));
const BudgetEstimationPage = lazy(() => import("./pages/BudgetEstimationPage.tsx"));
const BudgetReportsPage = lazy(() => import("./pages/BudgetReportsPage.tsx"));
const TimelinePlannerPage = lazy(() => import("./pages/TimelinePlannerPage.tsx"));
const PostEventSummaryPage = lazy(() => import("./pages/PostEventSummaryPage.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const TeamPage = lazy(() => import("./pages/TeamPage.tsx"));
const AboutProjectPage = lazy(() => import("./pages/AboutProjectPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const FeedbackGeneratorPage = lazy(() => import("./pages/FeedbackGeneratorPage.tsx"));
const FeedbackFormPage = lazy(() => import("./pages/FeedbackFormPage.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-mono text-sm text-muted-foreground">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/about" element={<AboutProjectPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/proposal"
                element={
                  <ProtectedRoute>
                    <ProposalGenerator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/flyer"
                element={
                  <ProtectedRoute>
                    <FlyerGenerator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/attendance"
                element={
                  <ProtectedRoute>
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/report"
                element={
                  <ProtectedRoute>
                    <ReportGenerator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget"
                element={
                  <ProtectedRoute>
                    <BudgetDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget/create"
                element={
                  <ProtectedRoute>
                    <BudgetPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget/history"
                element={
                  <ProtectedRoute>
                    <PreviousBudgetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget/categories"
                element={
                  <ProtectedRoute>
                    <BudgetCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget/analysis"
                element={
                  <ProtectedRoute>
                    <BudgetAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget/estimation"
                element={
                  <ProtectedRoute>
                    <BudgetEstimationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/budget/reports"
                element={
                  <ProtectedRoute>
                    <BudgetReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/timeline"
                element={
                  <ProtectedRoute>
                    <TimelinePlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/summary"
                element={
                  <ProtectedRoute>
                    <PostEventSummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/generate/feedback"
                element={
                  <ProtectedRoute>
                    <FeedbackGeneratorPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/feedback/:formId" element={<FeedbackFormPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
