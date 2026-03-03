import { useState } from 'react';
import { BlueprintSection, makeDefaultFactions } from './pages/BlueprintPage';
import { BattleSection } from './pages/BattlePage';
import { ResultsSection } from './pages/ResultsPage';
import type { BattleSetupData } from './pages/ResultsPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Faction, FactionDeployment, NpcDeployment, SimulationConfig } from './types/game';

type Tab = 'blueprints' | 'battle' | 'results';
const TABS: { id: Tab; label: string }[] = [
  { id: 'blueprints', label: 'Blueprints' },
  { id: 'battle', label: 'Battle' },
  { id: 'results', label: 'Results' },
];

function App() {
  const [factions, setFactions] = useLocalStorage<Faction[]>('eclipse-factions', makeDefaultFactions());
  const [factionDeployments, setFactionDeployments] = useState<FactionDeployment[]>([]);
  const [npcDeployments, setNpcDeployments] = useState<NpcDeployment[]>([]);
  const [config, setConfig] = useState<SimulationConfig>({ runs: 1000, dicePool: 600 });
  const [battleSetup, setBattleSetup] = useState<BattleSetupData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('blueprints');

  const handleRunSimulation = () => {
    const resolvedFactions = factionDeployments
      .map(d => factions.find(f => f.id === d.factionId))
      .filter((f): f is Faction => f !== undefined);

    setBattleSetup({
      factionDeployments,
      npcDeployments,
      config,
      factions: resolvedFactions,
    });

    // On mobile: switch to results tab; on desktop: scroll to results
    if (window.innerWidth < 640) {
      setActiveTab('results');
    } else {
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 z-30 bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <span className="text-base sm:text-xl font-bold text-white truncate">
          Eclipse Combat Forecast
        </span>

        {/* Mobile: segmented control */}
        <nav className="sm:hidden flex bg-gray-700 rounded-lg p-0.5 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Desktop: hash-link nav */}
        <nav className="hidden sm:flex gap-4 shrink-0">
          <a href="#blueprints" className="text-sm text-gray-300 hover:text-white transition-colors">Blueprints</a>
          <a href="#battle" className="text-sm text-gray-300 hover:text-white transition-colors">Battle</a>
          <a href="#results" className="text-sm text-gray-300 hover:text-white transition-colors">Results</a>
        </nav>
      </header>

      {/* Mobile: show only active tab */}
      <div className="sm:hidden">
        {activeTab === 'blueprints' && (
          <BlueprintSection factions={factions} onFactionsChange={setFactions} />
        )}
        {activeTab === 'battle' && (
          <BattleSection
            factions={factions}
            factionDeployments={factionDeployments}
            npcDeployments={npcDeployments}
            config={config}
            onFactionDeploymentsChange={setFactionDeployments}
            onNpcDeploymentsChange={setNpcDeployments}
            onConfigChange={setConfig}
            onRunSimulation={handleRunSimulation}
          />
        )}
        {activeTab === 'results' && (
          <ResultsSection setup={battleSetup} />
        )}
      </div>

      {/* Desktop: all sections visible */}
      <div className="hidden sm:block">
        <BlueprintSection factions={factions} onFactionsChange={setFactions} />
        <BattleSection
          factions={factions}
          factionDeployments={factionDeployments}
          npcDeployments={npcDeployments}
          config={config}
          onFactionDeploymentsChange={setFactionDeployments}
          onNpcDeploymentsChange={setNpcDeployments}
          onConfigChange={setConfig}
          onRunSimulation={handleRunSimulation}
        />
        <ResultsSection setup={battleSetup} />
      </div>
    </div>
  );
}

export default App;
