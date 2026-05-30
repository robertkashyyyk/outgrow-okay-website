import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { ProgressLog } from "./pages/ProgressLog";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/progress-log" element={<ProgressLog />} />
    </Routes>
  );
}

export default App;
