// Gecureerde tag-filterbalk: toont alleen belangrijke tags in vaste volgorde,
// max 10 (mobiel verbergt CSS er nog een paar). Tags die niet in de API
// bestaan worden overgeslagen; er worden geen tags verzonnen.
const PRIORITY_TAGS = [
  "Thuisbatterij",
  "Batterij advies",
  "Thuisbatterij vergelijken",
  "Thuisbatterij installatie",
  "Batterijsturing",
  "Dynamisch contract",
  "EMS",
  "Energieopslag",
  "Salderen",
  "Zelfconsumptie",
  "Stroom opslaan",
  "Zonnepanelen",
];

const MAX_VISIBLE_TAGS = 10;

export default function TagBar({ tags, active, onSelect }) {
  if (!tags?.length) return null;

  // Case-insensitief matchen, maar de échte API-naam doorgeven als filter:
  // het ?tag= filter van de API is hoofdlettergevoelig.
  const byLower = new Map();
  for (const t of tags) {
    const key = t.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, t);
  }

  const curated = PRIORITY_TAGS.map((t) => byLower.get(t.toLowerCase()))
    .filter(Boolean)
    .slice(0, MAX_VISIBLE_TAGS);

  if (!curated.length) return null;

  return (
    <div className="tagbar" role="group" aria-label="Filter op onderwerp">
      <button className={!active ? "active" : ""} onClick={() => onSelect(null)}>
        Alles
      </button>
      {curated.map((t) => (
        <button key={t} className={active === t ? "active" : ""} onClick={() => onSelect(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
