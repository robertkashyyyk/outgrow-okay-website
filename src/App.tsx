import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Book } from "./pages/Book";
import { ProgressLog } from "./pages/ProgressLog";
import { Insights } from "./pages/Insights";
import { InsightPost } from "./pages/InsightPost";
import { Privacy } from "./pages/Privacy";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/book" element={<Book />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/insights/:slug" element={<InsightPost />} />
      <Route path="/privacy" element={<Privacy />} />
      {/* Internal build journal — intentionally not linked from the public nav. */}
      <Route path="/progress-log" element={<ProgressLog />} />
    </Routes>
  );
}

export default App;
