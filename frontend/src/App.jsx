import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import Calculator from "./pages/Calculator.jsx";
import Privacy from "./pages/Privacy.jsx";
import { initAnalytics, trackPageView } from "./analytics.js";

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AnalyticsTracker />

      <Header />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:slug" element={<PostDetail />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}