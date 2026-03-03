import type { FactionDeployment, Faction, ShipType } from '../types/game';
import { SHIP_TYPES, SHIP_TYPE_MAX, SHIP_TYPE_LABELS } from '../data/constants';
import { Stepper } from './Stepper';

interface FactionPanelProps {
  deployment: FactionDeployment;
  availableFactions: Faction[];
  onChange: (updated: FactionDeployment) => void;
  onRemove: () => void;
}

export function FactionPanel({ deployment, availableFactions, onChange, onRemove }: FactionPanelProps) {
  const getShipCount = (type: ShipType) =>
    deployment.ships.find(s => s.type === type)?.count ?? 0;

  const setShipCount = (type: ShipType, count: number) => {
    const clamped = Math.max(0, Math.min(SHIP_TYPE_MAX[type], count));
    const ships = SHIP_TYPES.map(t => ({
      type: t,
      count: t === type ? clamped : getShipCount(t),
    }));
    onChange({ ...deployment, ships });
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Faction:</label>
          <select
            value={deployment.factionId}
            onChange={e => onChange({ ...deployment, factionId: e.target.value })}
            className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {availableFactions.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onRemove}
          className="text-sm text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-1 transition-colors"
        >
          ✕ Remove
        </button>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-400 mb-2">Ships:</p>
        <div className="flex flex-col gap-2">
          {SHIP_TYPES.map(type => (
            <div key={type} className="flex items-center justify-between">
              <label className="text-sm text-gray-300">{SHIP_TYPE_LABELS[type].plural}:</label>
              <Stepper
                value={getShipCount(type)}
                min={0}
                max={SHIP_TYPE_MAX[type]}
                onChange={v => setShipCount(type, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
          <label className="text-sm text-gray-400">Turn of Entry:</label>
          <Stepper
            value={deployment.turnOfEntry}
            min={1}
            max={9}
            onChange={v => onChange({ ...deployment, turnOfEntry: v })}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={deployment.controlsSector}
            onChange={e => onChange({ ...deployment, controlsSector: e.target.checked })}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-gray-300"><span className="sm:hidden">Defender</span><span className="hidden sm:inline">Controls Sector (Defender)</span></span>
        </label>
      </div>
    </div>
  );
}
