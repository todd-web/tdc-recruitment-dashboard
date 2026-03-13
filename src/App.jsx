import React, { useState, useCallback } from 'react';
import { RefreshCw, Target, BarChart3, ClipboardCheck } from 'lucide-react';
import PriorityTab from './components/PriorityTab';
import PerformanceTab from './components/PerformanceTab';
import ScorecardTab from './components/ScorecardTab';

const TABS = [
  { id: 'priorities', label: 'Recruitment Priorities', icon: Target },
  { id: 'performance', label: 'Recruitment Performance', icon: BarChart3 },
  { id: 'scorecard', label: 'Cycle Scorecard', icon: ClipboardCheck },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('priorities');
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-tdc-off-white">
      {/* Header */}
      <header className="bg-tdc-black border-b-4 border-tdc-gold">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img src="/tdc-logo-white.png" alt="The Desire Company" className="h-10" />
                <div className="border-l border-tdc-gray-mid pl-3">
                  <p className="text-tdc-gold text-xs font-semibold tracking-widest uppercase">
                    Recruitment Intelligence
                  </p>
                  <p className="text-tdc-gold-light text-[10px] tracking-wider uppercase">
                    Dashboard
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={triggerRefresh}
              className="flex items-center gap-2 bg-tdc-gold hover:bg-tdc-gold-dark text-tdc-black px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:shadow-lg active:scale-95"
            >
              <RefreshCw size={16} />
              Refresh Data
            </button>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 mt-5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-tdc-off-white text-tdc-black border-t-2 border-x-2 border-tdc-gold'
                      : 'text-gray-400 hover:text-tdc-gold-light hover:bg-tdc-black-light'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'priorities' && <PriorityTab refreshKey={refreshKey} />}
        {activeTab === 'performance' && <PerformanceTab refreshKey={refreshKey} />}
        {activeTab === 'scorecard' && <ScorecardTab refreshKey={refreshKey} />}
      </main>

      {/* Footer */}
      <footer className="bg-tdc-black text-tdc-gray-light text-xs text-center py-4 mt-8">
        <div className="flex items-center justify-center gap-3">
          <img src="/tdc-icon-gold.png" alt="" className="h-5 opacity-60" />
          <span>The Desire Company - Expert Operations Intelligence | Powered by Expert Team AI</span>
        </div>
      </footer>
    </div>
  );
}
