import { Link } from "react-router-dom";

// Kalme, editorial header. Logo zonder "/blog"-suffix, heldere navigatie en
// één duidelijke primaire actie. De ankers /#artikelen en /#rekenmethode
// verwijzen naar bestaande secties op de homepage (Home.jsx scrollt ernaartoe
// wanneer de hash aanwezig is). Alle links wijzen naar bestaande routes.
export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="logo">
          <span className="cell" aria-hidden="true" />
          Batterijenplan
        </Link>

        <nav className="nav" aria-label="Hoofdnavigatie">
          <Link to="/calculator">Berekenen</Link>
          <Link to="/#artikelen">Artikelen</Link>
          <Link to="/#rekenmethode">Over de berekening</Link>
        </nav>

        <Link to="/calculator" className="nav-cta">
          Bereken uw batterij
        </Link>
      </div>
    </header>
  );
}
