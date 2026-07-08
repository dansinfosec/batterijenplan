import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="logo">
          <span className="cell" aria-hidden="true" />
          Batterijenplan<span style={{ color: "var(--volt-dk)" }}>/blog</span>
        </Link>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/">Artikelen</Link>
          <Link to="/calculator">Calculator</Link>
        </nav>
      </div>
    </header>
  );
}
