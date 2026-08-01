// Herbruikbare keuzekaart voor de calculator-wizard. Puur presentatie:
// de waarde/handler komt van de aanroeper, dus veldnamen en payloads blijven
// exact zoals ze waren. aria-pressed maakt de selectiestatus hoorbaar.
export default function ChoiceCard({ selected, onSelect, title, text, compact = false }) {
  return (
    <button
      type="button"
      className={`calc2-choice${selected ? " active" : ""}${compact ? " calc2-choice--compact" : ""}`}
      aria-pressed={selected === undefined ? undefined : selected}
      onClick={onSelect}
    >
      <span className="calc2-choice-title">{title}</span>
      {text && <span className="calc2-choice-text">{text}</span>}
      <span className="calc2-choice-check" aria-hidden="true">✓</span>
    </button>
  );
}
