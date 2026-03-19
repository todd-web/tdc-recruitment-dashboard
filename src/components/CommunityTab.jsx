import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, Cell as PieCell,
} from 'recharts';
import {
  Users, MapPin, Shield, TrendingUp, AlertTriangle, Star, Info,
} from 'lucide-react';
import { fetchEndpoint } from '../api';

// Generalist / supplementary professions to exclude from community view
const SUPPRESS_FROM_COMMUNITY = new Set([
  "Actor/TV Personality", "Advocate", "Artist", "Author", "Blogger",
  "Business Executive", "CEO/Founder", "Cinematographer", "Coach", "Dancer",
  "DIY Creator", "Drone Operator", "Educator", "Entertainer", "Entrepreneur",
  "Hybrid Worker", "Journalist", "Life Coach", "Lifestyle Expert",
  "Live Streamer/Content Creator", "Model", "Photographer", "Podcaster",
  "Recording Artist", "Remote Worker", "Reporter/Journalist", "Talent Management",
  "Talk Show Host", "TV/Film Commentator", "TV/Media Producer", "Videographer", "Other",
]);

// TDC Brand Colors
const GOLD = '#C5A572';
const GOLD_DARK = '#A88B5E';
const BLACK = '#1A1A1A';

// Urgency colors for profession bar chart
const URGENCY_BAR_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

// Ethnicity pie colors
const ETHNICITY_COLORS = [
  '#C5A572', '#1A1A1A', '#A88B5E', '#D4B896', '#555555',
  '#888888', '#E8D5B0', '#333333',
];

// Gender donut colors
const GENDER_COLORS = {
  Female: '#C5A572',
  Male: '#1A1A1A',
  'Non-Binary': '#A88B5E',
  Other: '#D4B896',
  'Prefer not to say': '#888888',
};

// Tenure bar colors
const TENURE_BAR_COLOR = '#C5A572';

export default function CommunityTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = refreshKey > 0 ? '?refresh=true' : '';
        setData(await fetchEndpoint('community', params));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const {
    totalExperts,
    onboardedThisMonth,
    bentonvilleExperts,
    coverageScore,
    coverageCritHighTotal,
    coverageCritHighMeeting,
    professionDistribution: rawProfessionDistribution,
    noProfessionCount,
    stateDistribution,
    arkansasEntry,
    ethnicity,
    gender,
    tenureByQuarter,
    dataCompleteness,
    urgencyMap,
  } = data;

  // Filter out generalist/supplementary professions, keep top 10
  const professionDistribution = (rawProfessionDistribution || [])
    .filter(p => !SUPPRESS_FROM_COMMUNITY.has(p.name))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Section 1: KPI Header Row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Active Experts"
          value={totalExperts?.toLocaleString()}
          icon={<Users size={20} className="text-tdc-gold" />}
          accent="gold"
          subtitle="Expert Portal"
          large
        />
        <KpiCard
          label="Onboarded This Month"
          value={onboardedThisMonth}
          icon={<TrendingUp size={20} className="text-green-500" />}
          accent="green"
          subtitle={`${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`}
        />
        <KpiCard
          label="Coverage Score"
          value={`${coverageScore}%`}
          icon={<Shield size={20} className={coverageScore >= 50 ? 'text-green-500' : 'text-red-500'} />}
          accent={coverageScore >= 50 ? 'green' : coverageScore >= 25 ? 'yellow' : 'red'}
          subtitle={`${coverageCritHighMeeting}/${coverageCritHighTotal} CRITICAL+HIGH meeting 50% target`}
        />
        <KpiCard
          label="Bentonville Experts"
          value={bentonvilleExperts}
          icon={<MapPin size={20} className="text-blue-500" />}
          accent={bentonvilleExperts >= 10 ? 'green' : 'red'}
          badge="Strategic Priority"
        />
      </div>

      {/* Section 2: Two-column layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* LEFT (60%): Top 10 Expert Specializations */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-tdc-black flex items-center gap-2">
              <Star size={16} className="text-tdc-gold" />
              Top 10 Expert Specializations
            </h3>
            {noProfessionCount > 0 && (
              <span className="text-[10px] text-tdc-gray-light bg-gray-100 px-2 py-1 rounded">
                {noProfessionCount} experts unassigned
              </span>
            )}
          </div>
          <ProfessionBarChart
            professions={professionDistribution}
            urgencyMap={urgencyMap || {}}
          />
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-tdc-gray-light flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#ef4444' }} /> CRITICAL
            </span>
            <span className="text-[10px] text-tdc-gray-light flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#f97316' }} /> HIGH
            </span>
            <span className="text-[10px] text-tdc-gray-light flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#eab308' }} /> MEDIUM
            </span>
            <span className="text-[10px] text-tdc-gray-light flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#22c55e' }} /> LOW/None
            </span>
            <span className="text-[10px] text-tdc-gray-light ml-auto">
              Colors reflect V4.1 urgency cross-reference
            </span>
          </div>
          <p className="text-[10px] text-tdc-gray-light mt-2 italic">
            Filtered to domain expertise categories. Supplementary tags (content creator, entrepreneur, etc.) excluded.
          </p>
        </div>

        {/* RIGHT (40%): Geographic + Demographics */}
        <div className="col-span-2 space-y-6">
          {/* Geographic Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-tdc-black flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-tdc-gold" />
              Geographic Distribution - Top 10 States
            </h3>
            <StateTable
              states={stateDistribution}
              arkansasEntry={arkansasEntry}
            />
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-tdc-black flex items-center gap-2 mb-4">
              <Users size={16} className="text-tdc-gold" />
              Demographics
            </h3>
            <DemographicsPanel
              ethnicity={ethnicity}
              gender={gender}
              dataCompleteness={dataCompleteness}
            />
          </div>

          {/* Tenure by Quarter */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-tdc-black flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-tdc-gold" />
              Expert Onboarding by Quarter
            </h3>
            <TenureChart quarters={tenureByQuarter} />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <p className="text-xs text-tdc-gray-light text-right">
        Data snapshot: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'N/A'}
      </p>
    </div>
  );
}

// ============================================================
// KPI Card
// ============================================================

function KpiCard({ label, value, icon, accent = 'gold', subtitle, badge, large }) {
  const borderColors = {
    gold: 'border-tdc-gold',
    green: 'border-green-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
    blue: 'border-blue-500',
  };

  return (
    <div className={`bg-white rounded-xl border-t-4 ${borderColors[accent]} p-4 shadow-sm animate-fade-in relative`}>
      {badge && (
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-[10px] text-tdc-gray-light font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className={`font-bold text-tdc-black mt-1 ${large ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-tdc-gray-light mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ============================================================
// Profession Bar Chart (Horizontal)
// ============================================================

function ProfessionBarChart({ professions, urgencyMap }) {
  // Prepare data for horizontal bar chart
  const chartData = professions.map(p => {
    // Try to find urgency match - profession names may not exactly match sub-RPG names
    const urgency = urgencyMap[p.name] || null;
    return {
      name: p.name.length > 22 ? p.name.substring(0, 20) + '...' : p.name,
      fullName: p.name,
      count: p.count,
      pct: p.pct,
      urgency,
      fill: urgency ? (URGENCY_BAR_COLORS[urgency] || GOLD) : GOLD,
    };
  });

  return (
    <div style={{ height: Math.max(500, professions.length * 28) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 130, right: 60, top: 5, bottom: 5 }}
        >
          <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#1A1A1A' }}
            width={125}
          />
          <Tooltip content={<ProfessionTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProfessionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-tdc-black text-white p-3 rounded-lg shadow-xl text-xs">
      <p className="font-bold text-tdc-gold mb-1">{item.fullName}</p>
      <p>Experts: <span className="font-bold">{item.count}</span></p>
      <p>% of Community: <span className="font-bold">{item.pct}%</span></p>
      {item.urgency && (
        <p>V4.1 Urgency: <span className="font-bold" style={{ color: URGENCY_BAR_COLORS[item.urgency] }}>{item.urgency}</span></p>
      )}
    </div>
  );
}

// ============================================================
// State Table
// ============================================================

function StateTable({ states, arkansasEntry }) {
  // Combine states with Arkansas entry if not already in top 10
  const rows = [...states];
  let arkansasHighlighted = false;

  // Check if Arkansas is already in the list
  const arkansasIdx = rows.findIndex(s => s.state === 'Arkansas');
  if (arkansasIdx >= 0) {
    rows[arkansasIdx] = { ...rows[arkansasIdx], isBentonvilleState: true };
    arkansasHighlighted = true;
  } else if (arkansasEntry) {
    rows.push(arkansasEntry);
    arkansasHighlighted = true;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-tdc-black text-white text-xs">
            <th className="text-left px-3 py-2 font-semibold">State</th>
            <th className="text-center px-3 py-2 font-semibold">Experts</th>
            <th className="text-center px-3 py-2 font-semibold">% of Community</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.state}
              className={`border-b border-gray-50 transition-colors ${
                row.isBentonvilleState
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : i % 2 === 0
                  ? 'bg-white'
                  : 'bg-gray-50'
              }`}
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className={`font-medium ${row.isBentonvilleState ? 'text-blue-700' : 'text-tdc-black'}`}>
                    {row.state}
                  </span>
                  {row.isBentonvilleState && (
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      Strategic Priority
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-center font-bold text-tdc-black">{row.count}</td>
              <td className="px-3 py-2 text-center text-tdc-gray-mid">{row.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Demographics Panel
// ============================================================

function DemographicsPanel({ ethnicity, gender, dataCompleteness }) {
  const ethnicityComplete = (dataCompleteness?.ethnicity || 0) * 100;
  const genderComplete = (dataCompleteness?.gender || 0) * 100;

  return (
    <div className="space-y-5">
      {/* Ethnicity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-tdc-gray-mid uppercase tracking-wider">Ethnicity</h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            ethnicityComplete >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {ethnicityComplete.toFixed(0)}% complete
          </span>
        </div>
        {ethnicityComplete < 60 ? (
          <DataCompletenessWarning
            field="Ethnicity"
            percentage={ethnicityComplete}
          />
        ) : (
          <EthnicityChart ethnicity={ethnicity} />
        )}
      </div>

      {/* Gender */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-tdc-gray-mid uppercase tracking-wider">Gender</h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            genderComplete >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {genderComplete.toFixed(0)}% complete
          </span>
        </div>
        {genderComplete < 60 ? (
          <DataCompletenessWarning
            field="Gender"
            percentage={genderComplete}
          />
        ) : (
          <GenderChart gender={gender} />
        )}
      </div>
    </div>
  );
}

function DataCompletenessWarning({ field, percentage }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
      <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-yellow-800 font-medium">
          {field} data {percentage.toFixed(0)}% complete
        </p>
        <p className="text-[10px] text-yellow-600 mt-0.5">
          Improve data quality in Expert Portal to enable chart visualization. Minimum 60% completion required.
        </p>
      </div>
    </div>
  );
}

function EthnicityChart({ ethnicity }) {
  if (!ethnicity || Object.keys(ethnicity).length === 0) return null;

  const total = Object.values(ethnicity).reduce((a, b) => a + b, 0);

  // Group small segments into "Other"
  const sorted = Object.entries(ethnicity).sort((a, b) => b[1] - a[1]);
  const chartData = [];
  let otherCount = 0;

  sorted.forEach(([name, count], i) => {
    if (i < 6 && count / total > 0.02) {
      chartData.push({
        name: name.length > 30 ? name.substring(0, 28) + '...' : name,
        fullName: name,
        value: count,
        pct: parseFloat((count / total * 100).toFixed(1)),
      });
    } else {
      otherCount += count;
    }
  });

  if (otherCount > 0) {
    chartData.push({
      name: 'Other / Not Disclosed',
      fullName: 'Other / Not Disclosed',
      value: otherCount,
      pct: parseFloat((otherCount / total * 100).toFixed(1)),
    });
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={65}
            label={({ name, pct }) => `${pct}%`}
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={ETHNICITY_COLORS[i % ETHNICITY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<DemoTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function GenderChart({ gender }) {
  if (!gender || Object.keys(gender).length === 0) return null;

  const total = Object.values(gender).reduce((a, b) => a + b, 0);

  const chartData = Object.entries(gender)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      fullName: name,
      value,
      pct: parseFloat((value / total * 100).toFixed(1)),
    }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={65}
            label={({ name, pct }) => `${pct}%`}
            labelLine={false}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={GENDER_COLORS[entry.name] || '#888888'} />
            ))}
          </Pie>
          <Tooltip content={<DemoTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DemoTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-tdc-black text-white p-2.5 rounded-lg shadow-xl text-xs">
      <p className="font-bold text-tdc-gold mb-0.5">{item.fullName || item.name}</p>
      <p>{item.value?.toLocaleString()} experts ({item.pct}%)</p>
    </div>
  );
}

// ============================================================
// Tenure Chart
// ============================================================

function TenureChart({ quarters }) {
  if (!quarters || quarters.length === 0) return null;

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={quarters} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
          <XAxis
            dataKey="quarter"
            tick={{ fontSize: 9, fill: '#888' }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={40}
          />
          <YAxis tick={{ fontSize: 10, fill: '#888' }} width={35} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: 11,
            }}
            formatter={(value) => [value, 'Experts']}
          />
          <Bar dataKey="count" fill={TENURE_BAR_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Loading & Error States
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border-t-4 border-tdc-gold p-4 shadow-sm">
            <div className="h-3 w-24 shimmer rounded mb-2" />
            <div className="h-8 w-16 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-white rounded-xl p-5 shadow-sm">
          <div className="h-5 w-56 shimmer rounded mb-4" />
          <div className="h-96 shimmer rounded" />
        </div>
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="h-5 w-48 shimmer rounded mb-4" />
            <div className="h-48 shimmer rounded" />
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="h-5 w-32 shimmer rounded mb-4" />
            <div className="h-40 shimmer rounded" />
          </div>
        </div>
      </div>
      <div className="text-center text-tdc-gray-light text-sm py-4">
        Loading expert community data...
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
