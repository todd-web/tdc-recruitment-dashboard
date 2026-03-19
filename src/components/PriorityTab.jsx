import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, Zap, Target, X, Info, ArrowUpDown, Filter } from 'lucide-react';
import { fetchEndpoint } from '../api';

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

const URGENCY_ROW_BG = {
  CRITICAL: 'bg-red-50 border-l-4 border-red-500',
  HIGH: 'bg-orange-50 border-l-4 border-orange-400',
  MEDIUM: 'bg-yellow-50',
  LOW: '',
};

export default function PriorityTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overrides, setOverrides] = useState(['', '', '']);
  const [appliedOverrides, setAppliedOverrides] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [expandedRpg, setExpandedRpg] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [urgencyFilter, setUrgencyFilter] = useState([]);
  const [rpgFilter, setRpgFilter] = useState('');
  const [inflationOnly, setInflationOnly] = useState(false);

  const fetchData = async (salesOverrides = []) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (refreshKey > 0) params.set('refresh', 'true');
      const filtered = salesOverrides.filter(Boolean);
      if (filtered.length > 0) params.set('overrides', filtered.join(','));

      const paramsStr = params.toString() ? `?${params}` : '';
      const json = await fetchEndpoint('priorities', paramsStr);
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

  // Compute dynamic CRITICAL count and filtered/sorted table data
  const { criticalItems, criticalCount, tableData, allParentRpgs } = useMemo(() => {
    if (!data?.subRpgPriorities) return { criticalItems: [], criticalCount: 0, tableData: [], allParentRpgs: [] };

    const subs = data.subRpgPriorities;
    const critical = subs.filter(r => r.urgency === 'CRITICAL');
    const rpgs = [...new Set(subs.map(r => r.rpg))].sort();

    // Apply filters
    let filtered = [...subs];
    if (urgencyFilter.length > 0) {
      filtered = filtered.filter(r => urgencyFilter.includes(r.urgency));
    }
    if (rpgFilter) {
      filtered = filtered.filter(r => r.rpg === rpgFilter);
    }
    if (inflationOnly) {
      filtered = filtered.filter(r => r.inflationFlag);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle string fields
      if (sortField === 'subRpg' || sortField === 'rpg' || sortField === 'urgency') {
        aVal = (aVal || '').toString();
        bVal = (bVal || '').toString();
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Handle Infinity for inflation ratio
      if (aVal === Infinity || aVal === null) aVal = 9999;
      if (bVal === Infinity || bVal === null) bVal = 9999;

      return sortDir === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });

    // Limit to top 20 unless showAll
    if (!showAll) {
      filtered = filtered.slice(0, 20);
    }

    return {
      criticalItems: critical,
      criticalCount: critical.length,
      tableData: filtered,
      allParentRpgs: rpgs,
    };
  }, [data, urgencyFilter, rpgFilter, inflationOnly, sortField, sortDir, showAll]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const toggleUrgencyFilter = (level) => {
    setUrgencyFilter(prev =>
      prev.includes(level) ? prev.filter(u => u !== level) : [...prev, level]
    );
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { rpgPriorities, metadata } = data;

  // Determine if we are consuming V4.1 format (has coreCount) or legacy V3 (has currentCount)
  const isV41 = data.subRpgPriorities?.[0]?.hasOwnProperty('coreCount');

  return (
    <div className="space-y-6">
      {/* T4-S1: CRITICAL Alert Banner */}
      {criticalCount > 0 && (
        <div className="bg-red-600 text-white rounded-xl p-4 shadow-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">
                  CRITICAL GAPS: {criticalCount} sub-categories need urgent recruitment
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {criticalItems.slice(0, 4).map(item => (
                  <span key={`${item.rpg}|${item.subRpg}`} className="bg-red-700/60 px-2.5 py-1 rounded text-xs font-medium">
                    {item.subRpg}: {isV41 ? item.coreCount : item.currentCount} core
                    {(isV41 ? item.coreCount : item.currentCount) === 0 && (
                      <span className="ml-1 text-red-200">[0 core - immediate need]</span>
                    )}
                  </span>
                ))}
                {criticalCount > 4 && (
                  <button
                    onClick={() => { setUrgencyFilter(['CRITICAL']); setShowAll(true); }}
                    className="bg-red-700/60 hover:bg-red-700/80 px-2.5 py-1 rounded text-xs font-medium underline transition-colors"
                  >
                    +{criticalCount - 4} more - View All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Active Experts" value={metadata.totalExperts?.toLocaleString()} icon="people" />
        <MetricCard
          label="Engine Version"
          value={metadata.engineVersion || 'V3'}
          icon="grid"
          accent={metadata.engineVersion === 'V4.1' ? 'gold' : 'gray'}
        />
        <MetricCard label="Unassigned" value={metadata.unassigned} icon="warning" accent={metadata.unassigned > 100 ? 'red' : 'gold'} />
        <MetricCard
          label="Bentonville Experts"
          value={metadata.bentonvilleCount ?? 'N/A'}
          icon="map"
          accent={metadata.bentonvilleCount < 5 ? 'red' : 'gold'}
        />
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

      {/* T4-S2: Sub-RPG Priority Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-tdc-black flex items-center gap-2">
              <Target size={20} className="text-tdc-gold" />
              {showAll ? `All ${data.subRpgPriorities?.length || 0}` : 'Top 20'} Sub-RPG Priorities
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showAll ? 'Show Top 20' : `Show All (${data.subRpgPriorities?.length || 0})`}
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Urgency filter toggles */}
            <div className="flex items-center gap-1">
              <Filter size={14} className="text-tdc-gray-light mr-1" />
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                <button
                  key={level}
                  onClick={() => toggleUrgencyFilter(level)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    urgencyFilter.includes(level)
                      ? `${URGENCY_BG[level]} text-white`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
              {urgencyFilter.length > 0 && (
                <button
                  onClick={() => setUrgencyFilter([])}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                  title="Clear urgency filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Parent RPG filter */}
            <select
              value={rpgFilter}
              onChange={e => setRpgFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:border-tdc-gold outline-none"
            >
              <option value="">All Parent RPGs</option>
              {allParentRpgs.map(rpg => (
                <option key={rpg} value={rpg}>{rpg}</option>
              ))}
            </select>

            {/* Inflation flag toggle */}
            <label className="flex items-center gap-1.5 text-xs text-tdc-gray-mid cursor-pointer">
              <input
                type="checkbox"
                checked={inflationOnly}
                onChange={e => setInflationOnly(e.target.checked)}
                className="rounded border-gray-300 text-tdc-gold focus:ring-tdc-gold"
              />
              Inflation flags only
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-tdc-black text-white text-xs">
                <SortableHeader label="Sub-RPG" field="subRpg" currentField={sortField} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Parent RPG" field="rpg" currentField={sortField} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Urgency" field="urgency" currentField={sortField} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Core" field="coreCount" currentField={sortField} dir={sortDir} onSort={handleSort} title="Core Specialists" />
                <SortableHeader label="Mapped" field="mappedCount" currentField={sortField} dir={sortDir} onSort={handleSort} title="Total Pitchable" />
                <SortableHeader label="Inflation" field="inflationRatio" currentField={sortField} dir={sortDir} onSort={handleSort} title="Mapped/Core Ratio" />
                <th className="px-3 py-2.5 text-left font-semibold">Core Gap</th>
                <SortableHeader label="Score" field="score" currentField={sortField} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {tableData.map((item, i) => {
                const subRpgKey = `${item.rpg}|${item.subRpg}`;
                const isSelected = selectedRow === subRpgKey;
                const coreCount = isV41 ? (item.coreCount ?? 0) : (item.currentCount ?? 0);
                const mappedCount = isV41 ? (item.mappedCount ?? item.currentCount ?? 0) : (item.currentCount ?? 0);
                const inflationRatio = isV41 ? item.inflationRatio : null;
                const inflationFlag = isV41 ? item.inflationFlag : false;
                const coreGap = Math.max(0, (item.target || 0) - coreCount);

                return (
                  <tr
                    key={subRpgKey}
                    onClick={() => setSelectedRow(isSelected ? null : subRpgKey)}
                    className={`cursor-pointer transition-colors hover:bg-tdc-gold/5 ${URGENCY_ROW_BG[item.urgency]} ${
                      isSelected ? 'ring-2 ring-inset ring-tdc-gold' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium text-tdc-black">
                      <div className="flex items-center gap-1">
                        {item.subRpg}
                        {item.boosted && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold">BOOSTED</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-tdc-gray-light text-xs">{item.rpg}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${URGENCY_BG[item.urgency]}`}>
                        {item.urgency}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 font-bold text-center ${coreCount === 0 ? 'text-red-600' : 'text-tdc-black'}`}>
                      {coreCount}
                    </td>
                    <td className="px-3 py-2.5 text-center text-tdc-gray-mid">{mappedCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-xs ${inflationFlag ? 'text-orange-600 font-bold' : 'text-tdc-gray-mid'}`}>
                          {coreCount === 0 ? (
                            <span className="text-red-600 font-bold">inf</span>
                          ) : (
                            `${inflationRatio ?? '-'}x`
                          )}
                        </span>
                        {inflationFlag && (
                          <span className="text-orange-500" title="High inflation: most pitched experts are from adjacent fields, not core specialists">
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-2.5 text-center font-semibold ${coreGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {coreGap > 0 ? `+${coreGap}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-tdc-black">{item.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* T4-S3: Deep Dive Panel */}
      {selectedRow && (
        <DeepDivePanel
          subRpgKey={selectedRow}
          data={data}
          isV41={isV41}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* RPG Overview (collapsible parent RPGs) */}
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
                  {isV41 ? (
                    <span className={`px-2 py-0.5 rounded font-bold ${(rpg.uniqueExperts || 0) < 50 ? 'bg-red-100 text-red-700' : (rpg.uniqueExperts || 0) < 100 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {rpg.uniqueExperts || 0} unique experts
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded font-bold ${rpg.count < 50 ? 'bg-red-100 text-red-700' : rpg.count < 100 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {rpg.count} experts
                    </span>
                  )}
                </div>
              </button>
              {expandedRpg === rpg.rpg && rpg.subGroups && rpg.subGroups.length > 0 && (
                <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {rpg.subGroups.map(sg => (
                      <div key={sg.name} className="flex items-center justify-between bg-white px-3 py-1.5 rounded text-xs border border-gray-100">
                        <span className="text-tdc-gray-mid truncate mr-2">{sg.name}</span>
                        <div className="flex items-center gap-2">
                          {isV41 ? (
                            <>
                              <span className="font-bold text-tdc-black" title="Core specialists">{sg.coreCount ?? '-'}</span>
                              <span className="text-tdc-gray-light" title="Total mapped">/ {sg.mappedCount ?? sg.count ?? '-'}</span>
                            </>
                          ) : (
                            <span className="font-bold text-tdc-black">{sg.count}</span>
                          )}
                        </div>
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

// ============================================================
// Deep Dive Panel (T4-S3)
// ============================================================

function DeepDivePanel({ subRpgKey, data, isV41, onClose }) {
  const [rpgName, subRpgName] = subRpgKey.split('|');

  // Find the sub-RPG entry
  const subEntry = data.subRpgPriorities?.find(s => s.rpg === rpgName && s.subRpg === subRpgName);
  if (!subEntry) return null;

  // Find the parent RPG entry
  const parentRpg = data.rpgPriorities?.find(r => r.rpg === rpgName);

  const coreCount = isV41 ? (subEntry.coreCount ?? 0) : (subEntry.currentCount ?? 0);
  const mappedCount = isV41 ? (subEntry.mappedCount ?? subEntry.currentCount ?? 0) : (subEntry.currentCount ?? 0);
  const coreGap = Math.max(0, (subEntry.target || 0) - coreCount);
  const inflationRatio = isV41 ? subEntry.inflationRatio : null;
  const inflationFlag = isV41 ? subEntry.inflationFlag : false;
  const bentonvilleMult = isV41 ? (subEntry.bentonvilleMult ?? 1) : 1;

  // Build recommended actions
  const actions = [];
  if (coreCount === 0) {
    actions.push('Zero core specialists exist. Immediate targeted recruitment needed. This category cannot be reliably pitched without core experts.');
  }
  if (inflationFlag && coreCount < 5 && coreCount > 0) {
    actions.push(`High inflation - experts from adjacent fields are being pitched but only ${coreCount} have genuine specialty. Core specialist recruitment is the priority here.`);
  }
  if (subEntry.urgency === 'CRITICAL' && (subEntry.htf || 1) >= 1.3) {
    actions.push('Hard-to-fill category. Conference-based sourcing, trade association partnerships, or formal program outreach recommended.');
  }
  if (bentonvilleMult > 1) {
    actions.push('Bentonville multiplier active. NW Arkansas sourcing particularly relevant.');
  }
  if (coreGap > 10) {
    actions.push('Large gap to target. Consider a targeted Workable job posting specific to this profession.');
  }
  if (actions.length === 0) {
    actions.push('Category is in reasonable health. Continue standard recruitment cadence and monitor for changes.');
  }

  return (
    <div className="bg-white rounded-xl border-2 border-tdc-gold shadow-lg overflow-hidden animate-fade-in">
      {/* Panel Header */}
      <div className="bg-tdc-black px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-lg">{subRpgName}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${URGENCY_BG[subEntry.urgency]}`}>
              {subEntry.urgency}
            </span>
          </div>
          <p className="text-tdc-gray-light text-xs mt-1">Parent RPG: {rpgName}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Stats */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-tdc-gray-light uppercase tracking-wider mb-2">Priority Metrics</h4>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Priority Score" value={subEntry.score} />
                <StatBox label="Demand Weight" value={subEntry.demand} />
                <StatBox label="HTF Multiplier" value={`${subEntry.htf}x`} />
                <StatBox label="Gap Multiplier" value={`${subEntry.gapMult}x`} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-tdc-gray-light uppercase tracking-wider mb-2">Expert Distribution</h4>
              <div className="space-y-2">
                <DistributionRow
                  label="Core Experts"
                  value={coreCount}
                  sublabel="(primary specialty in this sub-RPG)"
                  highlight={coreCount === 0 ? 'red' : null}
                />
                <DistributionRow
                  label="Mapped Experts"
                  value={mappedCount}
                  sublabel="(could be pitched for this sub-RPG)"
                />
                <DistributionRow
                  label="Target"
                  value={subEntry.target}
                  sublabel="core experts needed"
                />
                <DistributionRow
                  label="Core Gap"
                  value={coreGap > 0 ? `+${coreGap} needed` : 'Met'}
                  highlight={coreGap > 0 ? 'red' : 'green'}
                />
                <DistributionRow
                  label="Inflation Ratio"
                  value={coreCount === 0 ? 'inf' : `${inflationRatio ?? '-'}x`}
                  highlight={inflationFlag ? 'orange' : null}
                  icon={inflationFlag ? <AlertTriangle size={12} className="text-orange-500" /> : null}
                />
              </div>
            </div>

            {/* Parent RPG context */}
            {parentRpg && (
              <div>
                <h4 className="text-xs font-semibold text-tdc-gray-light uppercase tracking-wider mb-2">Parent RPG: {rpgName}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Unique Experts" value={isV41 ? (parentRpg.uniqueExperts || 0) : (parentRpg.count || 0)} />
                  <StatBox label="Total Mapped" value={isV41 ? (parentRpg.mappedCount || 0) : (parentRpg.count || 0)} />
                </div>
              </div>
            )}

            {/* Bentonville */}
            <div>
              <h4 className="text-xs font-semibold text-tdc-gray-light uppercase tracking-wider mb-2">Bentonville Relevance</h4>
              <p className="text-sm text-tdc-gray-mid">
                {bentonvilleMult > 1
                  ? <span className="text-tdc-gold font-semibold">Active - {bentonvilleMult}x multiplier</span>
                  : 'N/A'
                }
              </p>
            </div>
          </div>

          {/* Right Column: Recommended Actions */}
          <div>
            <h4 className="text-xs font-semibold text-tdc-gray-light uppercase tracking-wider mb-3">Recommended Actions</h4>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div key={i} className="flex gap-2 p-3 bg-tdc-off-white rounded-lg border border-tdc-gold/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-tdc-gold mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-tdc-gray-dark leading-relaxed">{action}</p>
                </div>
              ))}
            </div>

            {/* Gap visualization */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-tdc-gray-light uppercase tracking-wider mb-2">Coverage Progress</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-tdc-gray-mid">
                      Core: <span className="font-bold text-tdc-black">{coreCount}</span> / {subEntry.target}
                    </span>
                    <span className="text-tdc-gray-light">
                      {Math.round((coreCount / Math.max(subEntry.target, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (coreCount / Math.max(subEntry.target, 1)) * 100)}%`,
                        backgroundColor: coreCount === 0 ? '#dc2626' : coreCount < subEntry.target * 0.5 ? '#f97316' : '#C5A572',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-tdc-gray-mid">
                      Mapped: <span className="font-bold text-tdc-black">{mappedCount}</span>
                    </span>
                    <span className="text-tdc-gray-light">
                      {coreCount > 0 ? `${inflationRatio}x inflation` : 'No core baseline'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-tdc-gold/50"
                      style={{
                        width: `${Math.min(100, (mappedCount / Math.max(subEntry.target * 3, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

function SortableHeader({ label, field, currentField, dir, onSort, title }) {
  const isActive = currentField === field;
  return (
    <th
      className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none hover:bg-tdc-black-light transition-colors"
      onClick={() => onSort(field)}
      title={title || label}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={10} className={isActive ? 'text-tdc-gold' : 'text-gray-500 opacity-50'} />
      </div>
    </th>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-tdc-off-white rounded-lg p-3 border border-tdc-gold/10">
      <p className="text-[10px] text-tdc-gray-light uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-tdc-black mt-0.5">{value}</p>
    </div>
  );
}

function DistributionRow({ label, value, sublabel, highlight, icon }) {
  const colorClass = highlight === 'red'
    ? 'text-red-600'
    : highlight === 'green'
    ? 'text-green-600'
    : highlight === 'orange'
    ? 'text-orange-600'
    : 'text-tdc-black';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm text-tdc-gray-mid">{label}</span>
        {sublabel && <span className="text-[10px] text-tdc-gray-light ml-1">{sublabel}</span>}
      </div>
      <div className="flex items-center gap-1">
        <span className={`font-bold ${colorClass}`}>{value}</span>
        {icon}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, accent = 'gold' }) {
  const accentClass = accent === 'red' ? 'border-red-500' : accent === 'gray' ? 'border-gray-300' : 'border-tdc-gold';
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
      <p>Core: <span className="font-bold">{item.core}</span></p>
      <p>Mapped: <span className="font-bold">{item.mapped}</span></p>
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
        Loading coverage analysis data...
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
      <p className="text-xs text-red-500">Using static data fallback. Check VPS connectivity for live data.</p>
    </div>
  );
}
