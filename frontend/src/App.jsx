import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import Calculator from "./pages/Calculator.jsx";
import Privacy from "./pages/Privacy.jsx";
import Contact from "./pages/Contact.jsx";
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
  // Statische first-paint shell uit index.html opruimen NA de eerste paint.
  // Bewust geen useLayoutEffect: die draait vóór de paint, waardoor de shell
  // verwijderd kon worden zonder ooit als FCP te tellen. Dubbele
  // requestAnimationFrame garandeert minstens één paint-gelegenheid vóór
  // verwijdering; de vertraging is hooguit een paar frames.
  useEffect(() => {
    const shell = document.getElementById("static-home-shell");
    if (!shell) return;

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => shell.remove());
      });
    } else {
      setTimeout(() => shell.remove(), 0);
    }
  }, []);

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
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}