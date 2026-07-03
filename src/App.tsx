import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { AuthGuard } from "./guards/AuthGuard";
import { ScrollToTop } from "./components/ScrollToTop";
import { Home } from "./pages/Home";
import { Book } from "./pages/Book";
import { ProgressLog } from "./pages/ProgressLog";
import { Insights } from "./pages/Insights";
import { InsightPost } from "./pages/InsightPost";
import { Privacy } from "./pages/Privacy";
import { Review } from "./pages/Review";
import { ReviewReturn } from "./pages/ReviewReturn";
import { Login } from "./pages/Login";
import { Welcome } from "./pages/Welcome";
import { StudioLayout } from "./layouts/StudioLayout";
import { PortalLayout } from "./layouts/PortalLayout";
import { CommandCentre } from "./pages/studio/CommandCentre";
import { ClientList } from "./pages/studio/clients/ClientList";
import { ClientDetail } from "./pages/studio/clients/ClientDetail";
import { ClientForm } from "./pages/studio/clients/ClientForm";
import { TaskList } from "./pages/studio/tasks/TaskList";
import { SignalPage } from "./pages/studio/signal/SignalPage";
import { StudioProposals } from "./pages/studio/proposals/StudioProposals";
import { StudioProposalPreview } from "./pages/studio/proposals/StudioProposalPreview";
import { ReportFunnelList } from "./pages/studio/report-funnel/ReportFunnelList";
import { ReportFunnelDetail } from "./pages/studio/report-funnel/ReportFunnelDetail";
import { InsightsList } from "./pages/studio/insights/InsightsList";
import { InsightEditor } from "./pages/studio/insights/InsightEditor";
import { ContentEngine } from "./pages/studio/insights/ContentEngine";
import { PortalDashboard } from "./pages/portal/PortalDashboard";
import { PortalProposals } from "./pages/portal/PortalProposals";
import { PortalProposalView } from "./pages/portal/PortalProposalView";
import { PortalAccount } from "./pages/portal/PortalAccount";

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<Book />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/insights/:slug" element={<InsightPost />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/review" element={<Review />} />
        <Route path="/review/return" element={<ReviewReturn />} />

        {/* One login for everyone; role decides the destination. */}
        <Route path="/login" element={<Login />} />
        {/* Invited users land here from the email link to set their password. */}
        <Route path="/welcome" element={<Welcome />} />

        {/* Admin back office */}
        <Route
          path="/studio"
          element={
            <AuthGuard role="admin">
              <StudioLayout />
            </AuthGuard>
          }
        >
          <Route index element={<CommandCentre />} />
          <Route path="insights" element={<InsightsList />} />
          <Route path="insights/engine" element={<ContentEngine />} />
          <Route path="insights/new" element={<InsightEditor />} />
          <Route path="insights/:id/edit" element={<InsightEditor />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="signal" element={<SignalPage />} />
          <Route path="proposals" element={<StudioProposals />} />
          <Route path="proposals/:slug" element={<StudioProposalPreview />} />
          <Route path="report-funnel" element={<ReportFunnelList />} />
          <Route path="report-funnel/:id" element={<ReportFunnelDetail />} />
        </Route>

        {/* Customer area */}
        <Route
          path="/portal"
          element={
            <AuthGuard role="customer">
              <PortalLayout />
            </AuthGuard>
          }
        >
          <Route index element={<PortalDashboard />} />
          <Route path="proposals" element={<PortalProposals />} />
          <Route path="proposals/:slug" element={<PortalProposalView />} />
          <Route path="account" element={<PortalAccount />} />
        </Route>

        {/* Internal build journal — intentionally not linked from the public nav. */}
        <Route path="/progress-log" element={<ProgressLog />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
