import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { AuthGuard } from "./guards/AuthGuard";
import { Home } from "./pages/Home";
import { Book } from "./pages/Book";
import { ProgressLog } from "./pages/ProgressLog";
import { Insights } from "./pages/Insights";
import { InsightPost } from "./pages/InsightPost";
import { Privacy } from "./pages/Privacy";
import { Login } from "./pages/Login";
import { Welcome } from "./pages/Welcome";
import { StudioLayout } from "./layouts/StudioLayout";
import { PortalLayout } from "./layouts/PortalLayout";
import { CommandCentre } from "./pages/studio/CommandCentre";
import { Clients } from "./pages/studio/Clients";
import { InsightsList } from "./pages/studio/insights/InsightsList";
import { InsightEditor } from "./pages/studio/insights/InsightEditor";
import { PortalDashboard } from "./pages/portal/PortalDashboard";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<Book />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/insights/:slug" element={<InsightPost />} />
        <Route path="/privacy" element={<Privacy />} />

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
          <Route path="insights/new" element={<InsightEditor />} />
          <Route path="insights/:id/edit" element={<InsightEditor />} />
          <Route path="clients" element={<Clients />} />
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
        </Route>

        {/* Internal build journal — intentionally not linked from the public nav. */}
        <Route path="/progress-log" element={<ProgressLog />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
