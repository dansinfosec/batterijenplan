// Vriendelijke, Nederlandse invulmeldingen i.p.v. de technische browser-
// standaardteksten. Verandert niets aan de validatielogica zelf
// (required/type/min blijven ongewijzigd) — vervangt alleen de getoonde
// boodschap van de native HTML5-validatie.
export function friendlyValidity(message) {
  return (e) => {
    if (e.target.validity.valid) {
      e.target.setCustomValidity("");
    } else {
      e.target.setCustomValidity(message);
    }
  };
}

// Combineert een bestaande onChange-updater met het opruimen van een eerder
// ingestelde custom-validity boodschap, zodat de native meldingstekst
// verdwijnt zodra de gebruiker het veld aanpast.
export function withValidityClear(onChange) {
  return (e) => {
    e.target.setCustomValidity("");
    onChange(e);
  };
}
