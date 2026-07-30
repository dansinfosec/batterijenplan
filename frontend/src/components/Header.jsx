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
          {/* Beeldmerk uit brand-assets (concept D). Vaste width/height +
              eigen CSS-formaat: geen layout shift terwijl de SVG laadt. Het
              woordmerk ernaast blijft echte tekst, dus het beeldmerk is
              decoratief — anders leest een screenreader de naam dubbel. */}
          <img
            src="/brand/logo-beeldmerk.svg"
            width="30"
            height="30"
            alt=""
            aria-hidden="true"
            className="logo-mark"
          />
          Batterijenplan
        </Link>

        <nav className="nav" aria-label="Hoofdnavigatie">
          <Link to="/calculator">Berekenen</Link>
          <Link to="/artikelen">Artikelen</Link>
          <Link to="/#rekenmethode">Over de berekening</Link>
        </nav>

        <Link to="/calculator" className="nav-cta">
          Bereken uw batterij
        </Link>
      </div>
    </header>
  );
}
