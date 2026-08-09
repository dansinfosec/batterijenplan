import { useRef, useState } from "react";
import { getAdapter, parseSmartMeterText, SmartMeterParseError } from "../../../smartmeter/parsers/index.js";
import { buildEnergyProfile } from "../../../smartmeter/model.js";
import { buildDemoHomeWizardCsv } from "../../../smartmeter/fixtures/demoBatteryAnalysis.js";

// ── Uploadstap: bestand kiezen/slepen → controleren → geparsed profiel ─────
// Het bestand wordt volledig in de browser gelezen (File.text()) en door de
// adapter geparsed; er wordt in deze versie niets naar een server verstuurd.
// De privacytekst hieronder beschrijft precies dat gedrag — pas hem aan zodra
// er wél een backend-upload komt.

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — ruim boven een meerjarige kwartier-export

export default function SmartMeterUpload({ source, onParsed }) {
  const [state, setState] = useState("idle"); // idle | checking | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  // Voor bronnen zonder eigen adapter ("other") is er bewust géén terugval op
  // de HomeWizard-parser: parseSmartMeterText meldt dan dat het formaat nog
  // niet wordt ondersteund.
  const adapter = getAdapter(source);
  const isHomeWizard = source === "homewizard";
  const acceptedLabel = adapter
    ? adapter.acceptedFormatsLabel
    : "CSV (.csv) — herkenning van meer formaten volgt binnenkort";

  const analyzeText = async (text, fileName) => {
    setState("checking");
    setErrorMsg(null);
    // Korte, vaste controle-pauze zodat de "Bestand controleren…"-status
    // leesbaar is (parsen zelf is vrijwel direct); daarna echte parse.
    await new Promise((r) => setTimeout(r, 450));
    try {
      const { intervals, meta } = parseSmartMeterText(text, { adapterId: source });
      const profile = buildEnergyProfile(intervals, meta);
      if (!profile || profile.pointCount < 24) {
        throw new SmartMeterParseError(
          "TOO_FEW_ROWS",
          "Het bestand bevat te weinig meetpunten voor een bruikbaar profiel. Exporteer een langere periode."
        );
      }
      onParsed({ profile, intervals, meta, fileName });
    } catch (err) {
      setErrorMsg(
        err instanceof SmartMeterParseError
          ? err.userMessage
          : "Het bestand kon niet worden gelezen. Controleer of het een geldige CSV-export is."
      );
      setState("error");
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg("Dit bestand is groter dan 25 MB. Exporteer een kortere periode en probeer het opnieuw.");
      setState("error");
      return;
    }
    const text = await file.text();
    await analyzeText(text, file.name);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section className="calc-step-panel" aria-labelledby="sm-upload-title">
      <h2 id="sm-upload-title" className="calc-form-start">
        {isHomeWizard ? "Upload uw HomeWizard-bestand" : "Upload uw slimme-meterdata"}
      </h2>
      <p className="calc2-sm-entry-sub">
        {isHomeWizard
          ? "Gebruik uw geëxporteerde Energy+ CSV om uw historische afname en teruglevering te analyseren."
          : "Upload een CSV-export van uw P1-meter, energiemonitor of energieleverancier. Deze formaten worden nog niet automatisch herkend — heeft u een HomeWizard-export, kies dan de HomeWizard-route."}
      </p>

      {state === "checking" ? (
        <div className="calc2-sm-drop calc2-sm-drop--checking" role="status">
          <span className="calc2-summary-batt" aria-hidden="true">
            <span className="calc2-summary-batt-fill" />
          </span>
          <p className="calc2-sm-drop-title">Bestand controleren…</p>
          <p className="calc2-sm-drop-sub">Uw meetintervallen worden ingelezen en gecontroleerd.</p>
        </div>
      ) : (
        <div
          className={`calc2-sm-drop${dragOver ? " is-drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <span className="calc2-sm-drop-icon" aria-hidden="true">⇪</span>
          <p className="calc2-sm-drop-title">Sleep uw bestand hierheen</p>
          <p className="calc2-sm-drop-sub">of</p>
          <button
            type="button"
            className="field-submit-button"
            onClick={() => inputRef.current?.click()}
          >
            Bestand selecteren
          </button>
          <p className="mono calc2-sm-drop-formats">
            Geaccepteerd formaat: {acceptedLabel}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="calc2-sm-file-input"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {state === "error" && errorMsg && (
        <div className="calc-error mono" role="alert">
          {errorMsg}
        </div>
      )}

      <p className="calc2-sm-privacy">
        <span aria-hidden="true">🔒</span> Uw energiegegevens worden alleen
        gebruikt om uw batterijadvies te berekenen. Uw bestand wordt in deze
        versie volledig in uw browser gelezen en niet geüpload.
      </p>

      {import.meta.env.DEV && state !== "checking" && (
        <button
          type="button"
          className="calc2-sm-linkbtn calc2-sm-devbtn"
          onClick={() => analyzeText(buildDemoHomeWizardCsv(21), "homewizard-voorbeeld.csv")}
        >
          Dev: laad voorbeeldbestand (alleen zichtbaar in development)
        </button>
      )}
    </section>
  );
}
