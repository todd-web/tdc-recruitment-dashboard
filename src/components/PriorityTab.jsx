import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, Zap, Target } from 'lucide-react';

const URGENCY_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const URGENCY_BG = {
  CRITICAL: 'bg-red-600',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500',
};

export default function PriorityTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overrides, setOverrides] = useState(['', '', '']);
  const [expandedRpg, setExpandedRpg] = useState(null);
  const [appliedOverrides, setAppliedOverrides] = useState([]);

  const fetchData = async (salesOverrides = []) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (refreshKey > 0) params.set('refresh', 'true');
      const filtered = salesOverrides.filter(Boolean);
      if (filtered.length > 0) params.set('overrides', filtered.join(','));

      const res = await fetch(`/api/priorities?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(appliedOverrides); }, [refreshKey]);

  const handleApplyOverrides = () => {
    setAppliedOverrides([...overrides]);
    fetchData(overrides);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { topTen, rpgPriorities, metadata, markets } = data;

  // Chart data for top 10
  const chartData = topTen.map((item, i) => ({
    name: item.subRpg.length > 25 ? item.subRpg.substring(0, 22) + '...' : item.subRpg,
    fullName: item.subRpg,
    current: item.currentCount,
    gap: item.gap,
    target: item.target,
    score: item.score,
    urgency: item.urgency,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Active Experts" value={metadata.totalExperts.toLocaleString()} icon="people" />
        <MetricCard label="Analysis Date" value={new Date(metadata.analysisDate).toLocaleDateString()} icon="calendar" />
        <MetricCard label="Unassigned" value={metadata.unassigned} icon="warning" accent={metadata.unassigned > 100 ? 'red' : 'gold'} />
        <MetricCard label="RPGs Tracked" value="15" icon="grid" />
      </div>

      {/* Sales Override Panel */}
      <div className="bg-white rounded-xl border border-tdc-gold/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-tdc-gold" />
          <h3 className="font-bold text-sm text-tdc-black">Sales Priority Overrides</h3>
          <span className="text-xs text-tdc-gray-light ml-2">
            Enter keywords to boost specific categories (e.g., "pharmacist", "plumber", "veterinarian")
          </span>
        </div>
        <div className="flex gap-3">
          {overrides.map((val, i) => (
            <input
              key={i}
              type="text"
              value={val}
              onChange={e => {
                const next = [...overrides];
                next[i] = e.target.value;
                setOverrides(next);
              }}
              placeholder={`Override ${i + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-tdc-gold focus:ring-2 focus:ring-tdc-gold/20 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleApplyOverrides()}
            />
          ))}
          <button
            onClick={handleApplyOverrides}
            className="px-5 py-2 bg-tdc-gold hover:bg-tdc-gold-dark text-tdc-black font-semibold text-sm rounded-lg transition-all active:scale-95"
          >
            Recalculate
          </button>
        </div>
        {appliedOverrides.some(Boolean) && (
          <div className="mt-2 flex gap-2">
            {appliedOverrides.filter(Boolean).map((o, i) => (
              <span key={i} className="px-2 py-0.5 bg-tdc-gold/20 text-tdc-gold-dark text-xs font-medium rounded-full border border-tdc-gold/30">
                Boosting: {o}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Top 10 Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-tdc-black mb-4 flex items-center gap-2">
          <Target size={20} className="text-tdc-gold" />
          Top 10 Recruitment Priority Sub-Groups
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 180, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#333' }}
                width={170}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="current" stackId="a" fill="#C5A572" radius={[0, 0, 0, 0]} name="Current" />
              <Bar dataKey="gap" stackId="a" fill="#dc2626" fillOpacity={0.3} radius={[0, 4, 4, 0]} name="Gap to Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Detail Cards */}
      <div className="grid grid-cols-2 gap-4">
        {topTen.map((item, i) => (
          <div
            key={`${item.rpg}|${item.subRpg}`}
            className={`bg-white rounded-xl border-l-4 p-4 shadow-sm animate-fade-in animate-fade-in-delay-${Math.min(i + 1, 5)} ${
              item.boosted ? 'border-l-purple-500 ring-2 ring-purple-100' : `border-l-${item.urgency === 'CRITICAL' ? 'red-500' : item.urgency === 'HIGH' ? 'orange-400' : 'yellow-400'}`
            }`}
            style={{ borderLeftColor: item.boosted ? '#a855f7' : URGENCY_COLORS[item.urgency] }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-tdc-gray-light">#{i + 1}</span>
                  <h3 className="font-bold text-sm text-tdc-black">{item.subRpg}</h3>
                  {item.boosted && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">BOOSTED</span>}
                </div>
                <p className="text-xs text-tdc-gray-light">{item.rpg}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${URGENCY_BG[item.urgency]}`}>
                {item.urgency}
              </span>
            </div>

            {/* Gap Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-tdc-gray-mid">
                  <span className="font-bold text-tdc-black">{item.currentCount}</span> current
                </span>
                <span className="text-tdc-gray-mid">
                  Target: <span className="font-bold">{item.target}</span>
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full gap-bar-fill"
                  style={{
                    width: `${Math.min(100, (item.currentCount / item.target) * 100)}%`,
                    backgroundColor: item.currentCount === 0 ? '#dc2626' : item.currentCount < item.target * 0.5 ? '#f97316' : '#C5A572',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-600 font-semibold">
                  {item.gap > 0 ? `Need ${item.gap} more` : 'Target met'}
                </span>
                <span className="text-tdc-gray-light">Score: {item.score}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RPG Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-tdc-black mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-tdc-gold" />
          All 15 Recruitment Priority Groups
        </h2>
        <div className="space-y-2">
          {rpgPriorities.map(rpg => (
            <div key={rpg.rpg} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedRpg(expandedRpg === rpg.rpg ? null : rpg.rpg)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedRpg === rpg.rpg ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold text-sm">{rpg.rpg}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-tdc-gray-mid">Demand: <span className="font-bold text-tdc-black">{rpg.demand}</span></span>
                  <span className="text-tdc-gray-mid">Score: <span className="font-bold text-tdc-black">{rpg.score}</span></span>
                  <span className={`px-2 py-0.5 rounded font-bold ${rpg.count < 50 ? 'bg-red-100 text-red-700' : rpg.count < 100 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {rpg.count} experts
                  </span>
                </div>
              </button>
              {expandedRpg === rpg.rpg && rpg.subGroups.length > 0 && (
                <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {rpg.subGroups.map(sg => (
                      <div key={sg.name} className="flex items-center justify-between bg-white px-3 py-1.5 rounded text-xs border border-gray-100">
                        <span className="text-tdc-gray-mid truncate mr-2">{sg.name}</span>
                        <span className="font-bold text-tdc-black">{sg.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, accent = 'gold' }) {
  const accentClass = accent === 'red' ? 'border-red-500' : 'border-tdc-gold';
  return (
    <div className={`bg-white rounded-xl border-t-4 ${accentClass} p-4 shadow-sm`}>
      <p className="text-xs text-tdc-gray-light font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-tdc-black mt-1">{value}</p>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-tdc-black text-white p-3 rounded-lg shadow-xl text-xs">
      <p className="font-bold text-tdc-gold mb-1">{item.fullName}</p>
      <p>Current: <span className="font-bold">{item.current}</span></p>
      <p>Gap: <span className="font-bold text-red-400">{item.gap}</span></p>
      <p>Target: <span className="font-bold">{item.target}</span></p>
      <p>Priority Score: <span className="font-bold text-tdc-gold">{item.score}</span></p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-xl border-t-4 border-tdc-gold p-4 shadow-sm">
            <div className="h-3 w-20 shimmer rounded mb-2" />
            <div className="h-8 w-16 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="h-5 w-48 shimmer rounded mb-4" />
        <div className="h-64 shimmer rounded" />
      </div>
      <div className="text-center text-tdc-gray-light text-sm py-4">
        Loading expert data from TDC Portal API...
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
      <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-red-700 mb-2">Connection Error</h3>
      <p className="text-sm text-red-600 mb-4">{message}</p>
      <p className="text-xs text-red-500">Make sure the backend server is running on port 3456</p>
    </div>
  );
}
