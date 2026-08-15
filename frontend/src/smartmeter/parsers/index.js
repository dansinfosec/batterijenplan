// ── Adapter-register voor slimme-meterdata ─────────────────────────────────
// HomeWizard is de eerste ondersteunde bron. Nieuwe bronnen (andere P1-meters,
// energiemonitors, leveranciers-exports) worden hier als extra adapter
// geregistreerd — de rest van de flow praat alleen met parseSmartMeterText en
// het genormaliseerde intervalmodel.

import { homeWizardAdapter, SmartMeterParseError } from "./homewizard.js";

export { SmartMeterParseError };

export const ADAPTERS = [homeWizardAdapter];

export function getAdapter(id) {
  return ADAPTERS.find((a) => a.id === id) || null;
}

// Parseert bestandsinhoud met de gekozen adapter. Voor bronnen zonder eigen
// adapter (de "andere slimme-meterdata"-route) bestaat nog geen parser; die
// route valt bewust NIET terug op de HomeWizard-adapter, maar meldt eerlijk
// dat het formaat nog niet wordt ondersteund.
export function parseSmartMeterText(text, { adapterId = "homewizard" } = {}) {
  const adapter = getAdapter(adapterId);
  if (!adapter) {
    throw new SmartMeterParseError(
      "UNSUPPORTED_SOURCE",
      "Dit formaat wordt nog niet ondersteund. Er volgen binnenkort meer formaten. " +
        "Is uw bestand een HomeWizard Energy+-export? Ga dan terug en kies de HomeWizard-optie."
    );
  }
  return adapter.parse(text);
}
