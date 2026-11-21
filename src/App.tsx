import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import MockResult from "./pages/MockResult";
import MockTest from "./pages/MockTest";
import Path from "./pages/Path";
import Practice from "./pages/Practice";
import Profile from "./pages/Profile";
import Result from "./pages/Result";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/practice/:section" element={<Practice />} />
        <Route path="/result/:sessionId" element={<Result />} />
        <Route path="/path" element={<Path />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/mock" element={<MockTest />} />
        <Route path="/mock/result/:sessionId" element={<MockResult />} />
      </Route>
    </Routes>
  );
}
