export default function TagBar({ tags, active, onSelect }) {
  if (!tags?.length) return null;
  return (
    <div className="tagbar" role="group" aria-label="Filter op onderwerp">
      <button className={!active ? "active" : ""} onClick={() => onSelect(null)}>
        Alles
      </button>
      {tags.map((t) => (
        <button key={t} className={active === t ? "active" : ""} onClick={() => onSelect(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
