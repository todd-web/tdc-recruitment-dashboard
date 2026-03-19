import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  ClipboardCheck, Calendar, TrendingUp, TrendingDown, Minus,
  Clock, MessageSquare, AlertTriangle, ChevronDown, Users, Target
} from 'lucide-react';
import { fetchEndpoint } from '../api';

// Cycle definition constants
const CYCLE_ANCHOR = 1767592800000; // Jan 5, 2026 00:00:00 CST (epoch ms)
const CYCLE_DURATION = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

function getCycleNumber(timestamp) {
  return Math.floor((timestamp - CYCLE_ANCHOR) / CYCLE_DURATION);
}

function getCycleStartEnd(cycleNum) {
  const start = new Date(CYCLE_ANCHOR + cycleNum * CYCLE_DURATION);
  const end = new Date(CYCLE_ANCHOR + (cycleNum + 1) * CYCLE_DURATION - 1);
  return { start, end };
}

function formatCycleDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCycleRange(cycleNum) {
  const { start, end } = getCycleStartEnd(cycleNum);
  return `${formatCycleDate(start)} - ${formatCycleDate(end)}, ${start.getFullYear()}`;
}

function getCurrentCycleNumber() {
  return getCycleNumber(Date.now());
}

export default function ScorecardTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('current');
  const [averageMode, setAverageMode] = useState(null); // null, 'monthly', 'q1', 'ytd'
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);
  const [showAvgDropdown, setShowAvgDropdown] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = refreshKey > 0 ? '?refresh=true' : '';
        setData(await fetchEndpoint('scorecard', params));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  const currentCycleNum = getCurrentCycleNumber();

  // Build cycle data from scorecard data
  const cycleData = useMemo(() => {
    if (!data) return [];

    // If data has a cycles array, use it. Otherwise generate from scorecard.
    if (data.cycles && data.cycles.length > 0) {
      return data.cycles;
    }

    // Generate cycle placeholders from the scorecard static data
    const cycles = [];
    for (let c = Math.max(0, currentCycleNum - 5); c <= currentCycleNum; c++) {
      const { start, end } = getCycleStartEnd(c);
      const scorecard = data.scorecard || [];

      // Derive cycle data from scorecard metrics
      const leadsRow = scorecard.find(r => r.metric === 'New Leads Captured');
      const onboardedRow = scorecard.find(r => r.metric === 'Onboarded (Approved)');
      const prospectsRow = scorecard.find(r => r.metric === 'Portal Prospects');

      // Distribute total data roughly across cycles for display
      const totalLeads = leadsRow ? (leadsRow.actual || 0) : 0;
      const totalOnboarded = onboardedRow ? (onboardedRow.actual || 0) : 0;
      const cycleCount = currentCycleNum - Math.max(0, currentCycleNum - 5) + 1;

      const cycleLeads = c === currentCycleNum
        ? Math.round(totalLeads / cycleCount)
        : Math.round(totalLeads / cycleCount);
      const cycleOnboarded = c === currentCycleNum
        ? totalOnboarded
        : Math.round(totalOnboarded / cycleCount);

      cycles.push({
        cycleNumber: c,
        period: `Cycle ${c + 1}`,
        dateRange: formatCycleRange(c),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        leads: cycleLeads,
        onboardings: cycleOnboarded,
        conversionRate: cycleLeads > 0 ? parseFloat(((cycleOnboarded / cycleLeads) * 100).toFixed(1)) : 0,
        avgResponseTimeHours: null,
        threePlusTouchPct: null,
        isCurrent: c === currentCycleNum,
      });
    }
    return cycles;
  }, [data, currentCycleNum]);

  // Selected cycle info
  const activeCycle = useMemo(() => {
    if (averageMode) return null;
    if (selectedCycle === 'current') {
      return cycleData.find(c => c.isCurrent) || cycleData[cycleData.length - 1];
    }
    return cycleData.find(c => c.cycleNumber === parseInt(selectedCycle));
  }, [selectedCycle, averageMode, cycleData]);

  // Compute averages for aggregate views
  const averageData = useMemo(() => {
    if (!averageMode || cycleData.length === 0) return null;

    let filtered = cycleData;
    if (averageMode === 'q1') {
      // Q1: Jan-Mar 2026
      filtered = cycleData.filter(c => {
        const s = new Date(c.startDate);
        return s.getMonth() < 3 && s.getFullYear() === 2026;
      });
    } else if (averageMode === 'monthly') {
      // Last 2 complete cycles (~1 month)
      filtered = cycleData.slice(-3, -1);
      if (filtered.length === 0) filtered = cycleData.slice(-2);
    }
    // ytd = all cycles (default)

    const count = filtered.length || 1;
    return {
      label: averageMode === 'monthly' ? 'Monthly Average' : averageMode === 'q1' ? 'Q1 2026 Average' : '2026 YTD Average',
      leads: Math.round(filtered.reduce((s, c) => s + c.leads, 0) / count),
      onboardings: Math.round(filtered.reduce((s, c) => s + c.onboardings, 0) / count),
      conversionRate: parseFloat((filtered.reduce((s, c) => s + c.conversionRate, 0) / count).toFixed(1)),
    };
  }, [averageMode, cycleData]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const displayData = averageMode ? averageData : activeCycle;
  const lastCycles = cycleData.slice(-6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-tdc-black flex items-center gap-2">
          <ClipboardCheck size={20} className="text-tdc-gold" />
          Recruitment Cycle Scorecard
        </h2>
        <p className="text-xs text-tdc-gray-light">
          Last refreshed: {new Date(data.lastRefresh).toLocaleString()}
        </p>
      </div>

      {/* Cycle Selector */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <Calendar size={16} className="text-tdc-gold" />

        {/* Current Cycle Button */}
        <button
          onClick={() => { setSelectedCycle('current'); setAverageMode(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            selectedCycle === 'current' && !averageMode
              ? 'bg-tdc-gold text-tdc-black shadow-sm'
              : 'bg-gray-100 text-tdc-gray-mid hover:bg-gray-200'
          }`}
        >
          Current Cycle
        </button>

        {/* Prior Cycles Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowCycleDropdown(!showCycleDropdown); setShowAvgDropdown(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              selectedCycle !== 'current' && !averageMode
                ? 'bg-tdc-gold text-tdc-black shadow-sm'
                : 'bg-gray-100 text-tdc-gray-mid hover:bg-gray-200'
            }`}
          >
            Prior Cycles
            <ChevronDown size={12} />
          </button>
          {showCycleDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[220px]">
              {lastCycles.filter(c => !c.isCurrent).reverse().map(c => (
                <button
                  key={c.cycleNumber}
                  onClick={() => {
                    setSelectedCycle(String(c.cycleNumber));
                    setAverageMode(null);
                    setShowCycleDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <span className="font-semibold">Cycle {c.cycleNumber + 1}</span>
                  <span className="text-tdc-gray-light ml-2">{c.dateRange}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Averages Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowAvgDropdown(!showAvgDropdown); setShowCycleDropdown(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              averageMode
                ? 'bg-tdc-gold text-tdc-black shadow-sm'
                : 'bg-gray-100 text-tdc-gray-mid hover:bg-gray-200'
            }`}
          >
            Averages
            <ChevronDown size={12} />
          </button>
          {showAvgDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
              {[
                { key: 'monthly', label: 'Monthly' },
                { key: 'q1', label: 'Q1 2026' },
                { key: 'ytd', label: '2026 YTD' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setAverageMode(opt.key);
                    setSelectedCycle('current');
                    setShowAvgDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0 font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cycle Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <CycleCard
          label="Cycle Period"
          value={averageMode
            ? (averageData?.label || '')
            : (activeCycle ? `Cycle ${activeCycle.cycleNumber + 1}` : '--')
          }
          subtitle={averageMode ? '' : (activeCycle?.dateRange || '')}
          icon={Calendar}
          color="gold"
        />
        <CycleCard
          label="Total Leads Processed"
          value={displayData?.leads?.toLocaleString() || '--'}
          subtitle={averageMode ? 'Per cycle average' : 'Boxes created in cycle'}
          icon={Users}
          color="gold"
        />
        <CycleCard
          label="Cycle Onboardings"
          value={displayData?.onboardings?.toLocaleString() || '--'}
          subtitle={averageMode ? 'Per cycle average' : 'Portal records in cycle'}
          icon={Target}
          color="green"
        />
        <CycleCard
          label="Cycle Conversion Rate"
          value={displayData?.conversionRate != null ? `${displayData.conversionRate}%` : '--'}
          subtitle="Onboardings / Leads"
          icon={TrendingUp}
          color={displayData?.conversionRate >= 10 ? 'green' : displayData?.conversionRate >= 5 ? 'yellow' : 'gold'}
        />
      </div>

      {/* Phase 2 Metrics: 24h SLA + 3+ Touches */}
      <div className="grid grid-cols-2 gap-6">
        {/* 24h SLA */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            First Email Within 24h
          </h3>
          <div className="flex flex-col items-center py-6">
            {/* Placeholder gauge */}
            <div className="relative w-32 h-16 mb-4">
              <svg viewBox="0 0 120 60" className="w-full h-full">
                {/* Background arc */}
                <path
                  d="M 10 55 A 50 50 0 0 1 110 55"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Placeholder dashed arc */}
                <path
                  d="M 10 55 A 50 50 0 0 1 110 55"
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="4 6"
                  opacity="0.5"
                />
              </svg>
              <div className="absolute inset-x-0 bottom-0 text-center">
                <p className="text-lg font-bold text-gray-400">--%</p>
              </div>
            </div>
            <div className="bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-2">
              Phase 2 - Data collection starting
            </div>
            <p className="text-xs text-tdc-gray-light text-center leading-relaxed max-w-[260px]">
              Tracking begins next cycle. Cron job will analyze Streak thread timestamps to measure response SLA.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-tdc-gray-light">Target:</span>
              <span className="text-xs font-semibold text-blue-600">95% within 24h</span>
            </div>
          </div>
        </div>

        {/* 3+ Touches */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-500" />
            3+ Outreach Touches
          </h3>
          <div className="flex flex-col items-center py-6">
            {/* Placeholder bar */}
            <div className="w-full max-w-[260px] mb-4">
              <div className="flex justify-between text-[10px] text-tdc-gray-light mb-1">
                <span>Prospects with 3+ touches</span>
                <span>--%</span>
              </div>
              <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-200 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {[0, 1, 2, 3, '4+'].map(n => (
                  <div key={n} className="text-center">
                    <div className="w-8 h-6 bg-gray-100 rounded" />
                    <p className="text-[9px] text-tdc-gray-light mt-0.5">{n}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-indigo-50 text-indigo-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-2">
              Phase 2 - Data collection starting
            </div>
            <p className="text-xs text-tdc-gray-light text-center leading-relaxed max-w-[260px]">
              Tracking begins next cycle. Thread analysis will count TDC-origin emails per prospect.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-tdc-gray-light">Target:</span>
              <span className="text-xs font-semibold text-indigo-600">90% with 3+ touches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cycle Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-sm text-tdc-black flex items-center gap-2">
            <ClipboardCheck size={16} className="text-tdc-gold" />
            Cycle Comparison
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-tdc-black text-white">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Period</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Leads</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Onboardings</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Conversion %</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Avg Response (hrs)</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">3+ Touch %</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Trend</th>
            </tr>
          </thead>
          <tbody>
            {cycleData.slice().reverse().slice(0, 5).map((cycle, i) => {
              const prevCycle = cycleData.find(c => c.cycleNumber === cycle.cycleNumber - 1);
              const trend = getTrend(cycle.conversionRate, prevCycle?.conversionRate);

              return (
                <tr
                  key={cycle.cycleNumber}
                  className={`border-b border-gray-100 transition-colors ${
                    cycle.isCurrent
                      ? 'bg-blue-50 font-medium'
                      : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-tdc-off-white`}
                >
                  <td className="px-5 py-3">
                    <div>
                      <span className="text-sm font-semibold text-tdc-black">
                        Cycle {cycle.cycleNumber + 1}
                        {cycle.isCurrent && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-semibold">
                            Current
                          </span>
                        )}
                      </span>
                      <p className="text-[10px] text-tdc-gray-light">{cycle.dateRange}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-sm font-medium text-tdc-black">
                    {cycle.leads}
                  </td>
                  <td className="px-5 py-3 text-center text-sm font-medium text-tdc-black">
                    {cycle.onboardings}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-sm font-bold ${
                      cycle.conversionRate >= 10 ? 'text-green-600' : 'text-tdc-black'
                    }`}>
                      {cycle.conversionRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-gray-400 italic">Building...</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-gray-400 italic">Building...</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <TrendIndicator trend={trend} />
                  </td>
                </tr>
              );
            })}

            {/* YTD Average Row */}
            {cycleData.length > 0 && (
              <tr className="bg-tdc-gold bg-opacity-5 border-t-2 border-tdc-gold border-opacity-30">
                <td className="px-5 py-3">
                  <span className="text-sm font-bold text-tdc-black">2026 YTD Avg</span>
                </td>
                <td className="px-5 py-3 text-center text-sm font-bold text-tdc-black">
                  {Math.round(cycleData.reduce((s, c) => s + c.leads, 0) / cycleData.length)}
                </td>
                <td className="px-5 py-3 text-center text-sm font-bold text-tdc-black">
                  {Math.round(cycleData.reduce((s, c) => s + c.onboardings, 0) / cycleData.length)}
                </td>
                <td className="px-5 py-3 text-center text-sm font-bold text-tdc-black">
                  {(cycleData.reduce((s, c) => s + c.conversionRate, 0) / cycleData.length).toFixed(1)}%
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="text-xs text-gray-400 italic">Building...</span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="text-xs text-gray-400 italic">Building...</span>
                </td>
                <td className="px-5 py-3 text-center">
                  <Minus size={14} className="text-gray-400 mx-auto" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Data quality note */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-[10px] text-tdc-gray-light leading-relaxed">
          <span className="font-semibold">Note:</span> Response time and 3+ touch columns show "Building..." for cycles that predate the cron job implementation. These columns will populate automatically once the Phase 2 thread analysis cron is deployed. Cycle data uses static snapshot values and will update to live API data when the VPS proxy is connected.
        </p>
      </div>
    </div>
  );
}

function CycleCard({ label, value, subtitle, icon: Icon, color = 'gold' }) {
  const borderColors = {
    gold: 'border-tdc-gold',
    green: 'border-green-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
    blue: 'border-blue-500',
  };

  return (
    <div className={`bg-white rounded-xl border-t-4 ${borderColors[color]} p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-tdc-gray-light" />
        <p className="text-[10px] text-tdc-gray-light font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-bold text-tdc-black">{value}</p>
      {subtitle && <p className="text-[10px] text-tdc-gray-light mt-0.5">{subtitle}</p>}
    </div>
  );
}

function getTrend(current, previous) {
  if (current == null || previous == null) return 'flat';
  const diff = current - previous;
  if (Math.abs(diff) < 1) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

function TrendIndicator({ trend }) {
  if (trend === 'up') {
    return <TrendingUp size={16} className="text-green-500 mx-auto" />;
  }
  if (trend === 'down') {
    return <TrendingDown size={16} className="text-red-500 mx-auto" />;
  }
  return <Minus size={16} className="text-yellow-500 mx-auto" />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-5 w-48 shimmer rounded" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border-t-4 border-tdc-gold p-4">
            <div className="h-3 w-20 shimmer rounded mb-2" />
            <div className="h-7 w-14 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 mb-3">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="h-4 w-16 shimmer rounded" />
            <div className="h-4 w-16 shimmer rounded" />
            <div className="h-4 w-16 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="text-center text-tdc-gray-light text-sm py-4">
        Loading cycle scorecard data...
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
      <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
