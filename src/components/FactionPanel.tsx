import type { FactionDeployment, Faction, ShipType } from '../types/game';

interface FactionPanelProps {
  deployment: FactionDeployment;
  availableFactions: Faction[];
  onChange: (updated: FactionDeployment) => void;
  onRemove: () => void;
}

const SHIP_TYPE_MAX: Record<ShipType, number> = {
  interceptor: 8,
  cruiser: 4,
  dreadnought: 2,
  starbase: 4,
};

const SHIP_TYPES: ShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];

const SHIP_TYPE_LABELS: Record<ShipType, string> = {
  interceptor: 'Interceptors',
  cruiser: 'Cruisers',
  dreadnought: 'Dreadnoughts',
  starbase: 'Starbases',
};

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
        <div className="grid grid-cols-2 gap-2">
          {SHIP_TYPES.map(type => (
            <div key={type} className="flex items-center gap-2">
              <label className="text-sm text-gray-300 w-28">{SHIP_TYPE_LABELS[type]}:</label>
              <input
                type="number"
                min={0}
                max={SHIP_TYPE_MAX[type]}
                value={getShipCount(type)}
                onChange={e => setShipCount(type, parseInt(e.target.value, 10) || 0)}
                className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Turn of Entry:</label>
          <input
            type="number"
            min={1}
            value={deployment.turnOfEntry}
            onChange={e => onChange({ ...deployment, turnOfEntry: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={deployment.controlsSector}
            onChange={e => onChange({ ...deployment, controlsSector: e.target.checked })}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-gray-300">Controls Sector (Defender)</span>
        </label>
      </div>
    </div>
  );
}
