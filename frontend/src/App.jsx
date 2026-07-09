import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import Calculator from "./pages/Calculator.jsx";
import Privacy from "./pages/Privacy.jsx";
import Contact from "./pages/Contact.jsx";
import { trackPageView } from "./analytics.js";

function AnalyticsTracker() {
  const location = useLocation();

  // Eén page_view per route (incl. de eerste). De GTM-container wordt via het
  // snippet in index.html geladen; hier alleen de dataLayer-push per navigatie.
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

export default function App() {
  // Statische first-paint shell uit index.html opruimen, maar pas als hij
  // gegarandeerd in gecomposite frames heeft gestaan. Dubbele rAF bleek te
  // vroeg: op mobiel mount React vóór het eerste frame, waardoor de shell
  // nooit werd geschilderd en niet als FCP/LCP telde. Nu verwijderen op het
  // laatste van: (a) window load + 300ms, (b) React mount + 800ms. De shell
  // is een fixed overlay, dus verwijderen geeft geen layout shift; hij mag
  // dus kort over de React-hero heen blijven staan.
  useEffect(() => {
    const shell = document.getElementById("static-home-shell");
    if (!shell) return;

    let waiting = 2; // beide voorwaarden (load+300ms én mount+800ms) afwachten
    const timers = [];

    const conditionMet = () => {
      waiting -= 1;
      if (waiting <= 0) shell.remove();
    };

    // (b) React gemount + 800ms
    timers.push(setTimeout(conditionMet, 800));

    // (a) window load + 300ms
    const onLoad = () => {
      timers.push(setTimeout(conditionMet, 300));
    };
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", onLoad);
    };
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