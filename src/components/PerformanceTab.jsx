import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend
} from 'recharts';
import {
  Users, TrendingUp, AlertTriangle, Target, Mail, UserPlus,
  Heart, ArrowRight, Calendar, ChevronDown, Activity, Info
} from 'lucide-react';
import { fetchEndpoint } from '../api';

const GOLD = '#C5A572';
const GOLD_DARK = '#A88B5E';
const GOLD_LIGHT = '#D4B896';
const BLACK = '#1A1A1A';
const GREEN = '#22c55e';
const GREEN_DARK = '#16a34a';
const BLUE = '#3b82f6';
const RED = '#ef4444';
const ORANGE = '#f97316';

const PERIOD_OPTIONS = [
  { key: 'ytd', label: 'Year to Date' },
  { key: '2026-03', label: 'March' },
  { key: '2026-02', label: 'February' },
  { key: '2026-01', label: 'January' },
  { key: 'q1-2026', label: 'Q1 2026' },
  { key: '2025', label: '2025' },
  { key: '2024', label: '2024' },
];

// Safe accessor - returns 'N/A' for missing data instead of 0
function safeNum(val, fallback = 'N/A') {
  if (val === null || val === undefined) return fallback;
  return val;
}

function safeDisplay(val) {
  if (val === null || val === undefined || val === 'N/A') return 'N/A';
  if (typeof val === 'number') return val.toLocaleString();
  return val;
}

export default function PerformanceTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('ytd');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = refreshKey > 0 ? '?refresh=true' : '';
        setData(await fetchEndpoint('performance', params));
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

  return <PerformanceContent data={data} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />;
}

function PerformanceContent({ data, selectedPeriod, setSelectedPeriod }) {
  const { funnel, periods, targets2026, monthlyTrend, community } = data;

  // Funnel data
  const funnelYTD = funnel?.ytd || {};
  const leads = safeNum(funnelYTD.leads, 0);
  const prospects = safeNum(funnelYTD.prospects, 0);
  const onboardedYTD = safeNum(funnelYTD.onboarded, 0);
  const conversionRate = safeNum(funnelYTD.conversionRate, 0);

  // Period data - drives the highlight card and metric pills
  const periodData = periods?.[selectedPeriod] || {};
  const periodOnboarded = safeNum(periodData.onboarded);
  const periodLeads = safeNum(periodData.leads);
  const periodProspects = safeNum(periodData.prospects);
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label || selectedPeriod;

  // Conversion rates between stages
  const leadToProspect = leads > 0 ? ((prospects / leads) * 100).toFixed(1) : 0;
  const prospectToOnboarded = prospects > 0 ? ((onboardedYTD / prospects) * 100).toFixed(1) : 0;

  // Community data
  const totalActiveExperts = safeNum(community?.totalActive, 0);
  const communityProspects = safeNum(community?.prospects, 0);

  // 2026 targets
  const onboardTarget = safeNum(targets2026?.onboardings, 1500);
  const communityTarget = safeNum(targets2026?.communitySize, 3500);
  const conversionTarget = safeNum(targets2026?.conversionRate, 10);

  const targets = {
    onboardings: { current: onboardedYTD, target: onboardTarget, label: 'Total Onboardings' },
    communitySize: { current: totalActiveExperts, target: communityTarget, label: 'Community Size' },
    conversionRate: { current: conversionRate, target: conversionTarget, label: 'Conversion Rate', suffix: '%' },
  };

  // Monthly trend for chart - two bars: Leads and Onboarded
  const trendData = (monthlyTrend || []).map(m => ({
    month: formatMonthLabel(m.month),
    leads: safeNum(m.leads, 0),
    onboarded: safeNum(m.onboarded, 0),
    fullMonth: m.month
  }));

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-tdc-black flex items-center gap-2">
          <TrendingUp size={20} className="text-tdc-gold" />
          Recruitment Performance
        </h2>
        <div className="flex items-center gap-3">
          <PeriodSelector
            selected={selectedPeriod}
            onChange={setSelectedPeriod}
          />
          <p className="text-xs text-tdc-gray-light">
            Data: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Period-Specific Onboarded Highlight */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
              {periodLabel} - Experts Onboarded
            </p>
            <p className="text-5xl font-bold text-green-700">{safeDisplay(periodOnboarded)}</p>
            <p className="text-xs text-green-600 mt-2">
              Active experts with Portal profile created in this period
            </p>
          </div>
          <div className="text-right space-y-2">
            <MetricPill label="Leads" value={periodLeads} />
            <MetricPill label="Prospects" value={periodProspects} />
            <MetricPill label="Onboarded" value={periodOnboarded} highlight />
          </div>
        </div>
      </div>

      {/* 3-Stage Recruitment Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-5 flex items-center gap-2">
          <Users size={16} className="text-tdc-gold" />
          Recruitment Funnel (YTD 2026)
        </h3>

        {/* Visual Funnel Steps */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {[
            {
              label: 'Leads',
              sublabel: 'All entered system',
              value: leads,
              color: 'bg-tdc-gold',
              textColor: 'text-tdc-black'
            },
            {
              label: 'Prospects',
              sublabel: 'In review pipeline',
              value: prospects,
              color: 'bg-tdc-gold-dark',
              textColor: 'text-white'
            },
            {
              label: 'Onboarded',
              sublabel: 'Active in 2026',
              value: onboardedYTD,
              color: 'bg-green-500',
              textColor: 'text-white'
            },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && (
                <div className="flex flex-col items-center">
                  <ArrowRight size={20} className="text-tdc-gray-light" />
                  <span className="text-[9px] text-tdc-gray-light mt-0.5">
                    {i === 1 ? `${leadToProspect}%` : `${prospectToOnboarded}%`}
                  </span>
                </div>
              )}
              <div className={`${step.color} ${step.textColor} rounded-xl px-8 py-5 text-center min-w-[140px] shadow-sm`}>
                <p className="text-3xl font-bold">{typeof step.value === 'number' ? step.value.toLocaleString() : step.value}</p>
                <p className="text-xs font-semibold opacity-90 mt-1">{step.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{step.sublabel}</p>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Conversion Rate + Target Badge */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <ConversionBadge label="Lead to Prospect" rate={leadToProspect} />
          <ConversionBadge label="Prospect to Onboarded" rate={prospectToOnboarded} />
          <ConversionBadge label="Overall (Lead to Onboarded)" rate={conversionRate} highlight />
        </div>
      </div>

      {/* Monthly Trend Chart - Leads + Onboarded */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-4 flex items-center gap-2">
          <Activity size={16} className="text-tdc-gold" />
          Monthly Recruitment Trend (Last 12 Months)
        </h3>
        {trendData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#666' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: 12
                  }}
                  formatter={(value, name) => {
                    if (name === 'leads') return [`${value.toLocaleString()}`, 'Leads'];
                    if (name === 'onboarded') return [`${value.toLocaleString()}`, 'Onboarded'];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) return payload[0].payload.fullMonth;
                    return label;
                  }}
                />
                <Bar dataKey="leads" name="leads" radius={[4, 4, 0, 0]} fill={GOLD} opacity={0.7} />
                <Bar dataKey="onboarded" name="onboarded" radius={[4, 4, 0, 0]} fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-tdc-gray-light text-center py-8">No trend data available</p>
        )}
        <div className="flex justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GOLD, opacity: 0.7 }} />
            <span className="text-xs text-tdc-gray-light">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GREEN }} />
            <span className="text-xs text-tdc-gray-light">Onboarded</span>
          </div>
        </div>
      </div>

      {/* 2026 Target Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-5 flex items-center gap-2">
          <Target size={16} className="text-tdc-gold" />
          2026 Target Progress
        </h3>
        <div className="space-y-5">
          {Object.entries(targets).map(([key, t]) => {
            const current = typeof t.current === 'number' ? t.current : 0;
            const target = typeof t.target === 'number' ? t.target : 1;
            const pct = Math.min(100, Math.round((current / target) * 100));
            const displayCurrent = t.suffix ? `${safeDisplay(t.current)}${t.suffix}` : safeDisplay(t.current);
            const displayTarget = t.suffix ? `${safeDisplay(t.target)}${t.suffix}` : safeDisplay(t.target);
            const isAboveTarget = key === 'conversionRate' && current >= target;
            const barColor = isAboveTarget ? 'bg-green-500' : pct >= 90 ? 'bg-green-500' : pct >= 50 ? 'bg-tdc-gold' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-500';

            // Calculate pace info for onboardings
            let paceInfo = null;
            if (key === 'onboardings') {
              const dayOfYear = Math.floor((new Date('2026-03-19') - new Date('2026-01-01')) / 86400000);
              const expectedPace = Math.round((target / 365) * dayOfYear);
              const diff = current - expectedPace;
              paceInfo = {
                expected: expectedPace,
                diff: diff,
                ahead: diff >= 0
              };
            }

            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-tdc-black flex items-center gap-2">
                    {t.label}
                    {key === 'conversionRate' && current < target && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                        Below Target
                      </span>
                    )}
                    {isAboveTarget && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                        Above Target
                      </span>
                    )}
                  </span>
                  <span className="text-tdc-gray-mid font-medium">
                    {displayCurrent} / {displayTarget}
                    {key === 'conversionRate' && (
                      <span className="ml-2 text-tdc-gray-light">
                        ({pct}% of target)
                      </span>
                    )}
                    {paceInfo && (
                      <span className={`ml-2 ${paceInfo.ahead ? 'text-green-600' : 'text-red-600'}`}>
                        ({paceInfo.ahead ? '+' : ''}{paceInfo.diff} vs. pace of {paceInfo.expected})
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${barColor} rounded-full gap-bar-fill`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-tdc-black">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          <QuickStat label="Monthly Avg (2026)" value={Math.round(onboardedYTD / 2.6)} sub="experts/mo" />
          <QuickStat label="Monthly Needed" value={Math.round((1500 - onboardedYTD) / 9.5)} sub="to hit 1,500" />
          <QuickStat label="Best Month" value={getBestMonth(monthlyTrend)} sub="recent peak" />
          <QuickStat label="Conversion Rate" value={`${conversionRate}%`} sub="lead to onboarded" />
        </div>
      </div>

      {/* Tracking Cards Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Lead Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <Users size={16} className="text-tdc-gold" />
            Lead Summary (YTD)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-tdc-gray-light">Total Leads</span>
              <span className="text-2xl font-bold text-tdc-black">{safeDisplay(leads)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-tdc-gray-light">January</p>
                <p className="text-lg font-bold text-tdc-black">{safeDisplay(periods?.['2026-01']?.leads)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-tdc-gray-light">February</p>
                <p className="text-lg font-bold text-tdc-black">{safeDisplay(periods?.['2026-02']?.leads)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-tdc-gray-light">March</p>
                <p className="text-lg font-bold text-tdc-black">{safeDisplay(periods?.['2026-03']?.leads)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-tdc-gold bg-opacity-10 rounded-lg border border-tdc-gold border-opacity-30">
              <div>
                <p className="text-xs font-semibold text-tdc-black">Conversion Rate</p>
                <p className="text-[10px] text-tdc-gray-light">Onboarded / Total Leads</p>
              </div>
              <p className="text-xl font-bold text-tdc-black">{conversionRate}%</p>
            </div>
          </div>
        </div>

        {/* Community Snapshot */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <Heart size={16} className="text-green-500" />
            Community Snapshot
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-tdc-gray-light">Total Active Experts</span>
              <span className="text-2xl font-bold text-green-600">{safeDisplay(totalActiveExperts)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-tdc-black">Current Prospects</p>
                  <p className="text-[10px] text-tdc-gray-light">Experts in review pipeline</p>
                </div>
                <p className="text-lg font-bold text-tdc-black">{safeDisplay(communityProspects)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] text-tdc-gray-light">
                Target: {safeDisplay(communityTarget)} by end of 2026
                <span className="ml-1">({totalActiveExperts > 0 ? Math.round((totalActiveExperts / communityTarget) * 100) : 0}% reached)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-tdc-gold" />
          Onboarding by Period
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <PeriodCard
            label="Q1 2026"
            value={safeNum(periods?.['q1-2026']?.onboarded)}
            sub="Jan - Mar"
            active={selectedPeriod === 'q1-2026'}
            onClick={() => setSelectedPeriod('q1-2026')}
          />
          <PeriodCard
            label="2025 Total"
            value={safeNum(periods?.['2025']?.onboarded)}
            sub="Full year"
            active={selectedPeriod === '2025'}
            onClick={() => setSelectedPeriod('2025')}
          />
          <PeriodCard
            label="2024 Total"
            value={safeNum(periods?.['2024']?.onboarded)}
            sub="Full year"
            active={selectedPeriod === '2024'}
            onClick={() => setSelectedPeriod('2024')}
          />
          <PeriodCard
            label="YTD 2026"
            value={safeNum(periods?.ytd?.onboarded)}
            sub="All 2026"
            active={selectedPeriod === 'ytd'}
            onClick={() => setSelectedPeriod('ytd')}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <PeriodCard
            label="Jan 2026"
            value={safeNum(periods?.['2026-01']?.onboarded)}
            active={selectedPeriod === '2026-01'}
            onClick={() => setSelectedPeriod('2026-01')}
          />
          <PeriodCard
            label="Feb 2026"
            value={safeNum(periods?.['2026-02']?.onboarded)}
            active={selectedPeriod === '2026-02'}
            onClick={() => setSelectedPeriod('2026-02')}
          />
          <PeriodCard
            label="Mar 2026"
            value={safeNum(periods?.['2026-03']?.onboarded)}
            sub="In progress"
            active={selectedPeriod === '2026-03'}
            onClick={() => setSelectedPeriod('2026-03')}
          />
        </div>
      </div>

      {/* Context Note */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm flex items-start gap-3">
        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-blue-800 mb-1">How We Count</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Lead data combines all recruitment pipeline sources. Prospect count represents experts in review pipeline.
            Conversion rate = Onboarded / Total Leads.
          </p>
        </div>
      </div>

      {/* Last Updated */}
      <p className="text-xs text-tdc-gray-light text-right">
        Last updated: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'N/A'}
        <span className="ml-2">| Source: Portal + Streak Data</span>
      </p>
    </div>
  );
}

// === Sub-Components ===

function PeriodSelector({ selected, onChange }) {
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-xs font-semibold text-tdc-black shadow-sm cursor-pointer hover:border-tdc-gold focus:outline-none focus:ring-2 focus:ring-tdc-gold focus:ring-opacity-30"
      >
        {PERIOD_OPTIONS.map(opt => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-tdc-gray-light pointer-events-none" />
    </div>
  );
}

function MetricPill({ label, value, highlight = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg text-xs ${
      highlight ? 'bg-green-100 text-green-800 font-bold' : 'bg-white bg-opacity-70 text-green-700'
    }`}>
      <span>{label}</span>
      <span className="font-bold">{safeDisplay(value)}</span>
    </div>
  );
}

function PeriodCard({ label, value, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-4 text-center transition-all ${
        active
          ? 'bg-tdc-gold bg-opacity-15 border-2 border-tdc-gold shadow-sm'
          : 'bg-gray-50 border border-gray-200 hover:border-tdc-gold hover:border-opacity-50'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <p className="text-2xl font-bold text-tdc-black">{safeDisplay(value)}</p>
      <p className="text-xs font-semibold text-tdc-black mt-1">{label}</p>
      {sub && <p className="text-[10px] text-tdc-gray-light mt-0.5">{sub}</p>}
    </button>
  );
}

function QuickStat({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-lg font-bold text-tdc-black">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-[10px] text-tdc-gray-light font-medium">{label}</p>
      {sub && <p className="text-[10px] text-tdc-gray-light opacity-70">{sub}</p>}
    </div>
  );
}

function ConversionBadge({ label, rate, highlight = false }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-tdc-gold bg-opacity-10 border border-tdc-gold border-opacity-30' : 'bg-gray-50'}`}>
      <p className="text-[10px] text-tdc-gray-light font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-tdc-gold-dark' : 'text-tdc-black'}`}>{rate}%</p>
    </div>
  );
}

function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shortYear = year.slice(2);
  return `${months[parseInt(month)]} '${shortYear}`;
}

function getBestMonth(trend) {
  if (!trend || trend.length === 0) return '-';
  const best = trend.reduce((max, m) => m.onboarded > max.onboarded ? m : max, trend[0]);
  return `${best.onboarded} (${formatMonthLabel(best.month)})`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
        <div className="h-4 w-48 shimmer rounded mb-3" />
        <div className="h-12 w-24 shimmer rounded" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-4 w-40 shimmer rounded mb-4" />
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 w-36 shimmer rounded-xl" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-4 w-48 shimmer rounded mb-4" />
        <div className="h-52 shimmer rounded" />
      </div>
      <div className="text-center text-tdc-gray-light text-sm py-4">
        Loading recruitment performance data...
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
