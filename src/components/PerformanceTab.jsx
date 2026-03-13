import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { Users, MapPin, Heart, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

const PERIOD_LABELS = {
  today: 'Today',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  thisQuarter: 'This Quarter',
};

const GOLD = '#C5A572';
const BLACK = '#1A1A1A';

export default function PerformanceTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('thisMonth');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = refreshKey > 0 ? '?refresh=true' : '';
        const res = await fetch(`/api/performance${params}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        setData(await res.json());
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

  const { streak, workable, totalActiveExperts, onboarded, markets, bipoc } = data;

  // Pipeline funnel data
  const funnelData = [
    { stage: 'Leads Captured', count: streak.combined.total, color: '#C5A572' },
    { stage: 'Applied Pipeline', count: streak.applied.total, color: '#D4B896' },
    { stage: 'Sourced Pipeline', count: streak.sourced.total, color: '#A88B5E' },
  ];

  // Stage breakdown for selected period
  const periodStats = {
    applied: streak.applied[period] || 0,
    sourced: streak.sourced[period] || 0,
    combined: streak.combined[period] || 0,
    onboarded: onboarded[period] || 0,
  };

  // Conversion rate
  const conversionRate = periodStats.combined > 0
    ? Math.round((periodStats.onboarded / periodStats.combined) * 100)
    : 0;

  // Stage breakdown chart data
  const stageChartData = Object.entries(streak.applied.byStage || {}).map(([name, count]) => ({
    name: formatStageName(name),
    count,
  })).sort((a, b) => b.count - a.count);

  // Market chart data
  const marketData = Object.entries(markets).map(([name, count]) => ({
    name,
    count,
    fill: name === 'Chicago' ? '#C5A572' : name === 'Los Angeles' ? '#A88B5E' : name === 'New York' ? '#D4B896' : '#8B7355',
  }));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-tdc-black flex items-center gap-2">
          <TrendingUp size={20} className="text-tdc-gold" />
          Recruitment Performance
        </h2>
        <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === key ? 'bg-tdc-gold text-tdc-black' : 'text-tdc-gray-mid hover:text-tdc-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="Total Active Experts"
          value={totalActiveExperts.toLocaleString()}
          subtitle="In Portal"
          color="gold"
        />
        <MetricCard
          label={`Leads (${PERIOD_LABELS[period]})`}
          value={periodStats.combined}
          subtitle="Streak Pipelines"
          color="gold"
        />
        <MetricCard
          label={`Onboarded (${PERIOD_LABELS[period]})`}
          value={periodStats.onboarded}
          subtitle="Prospect -> Active"
          color="green"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Target: 10%+"
          color={conversionRate >= 10 ? 'green' : conversionRate >= 7 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Workable Applicants"
          value={workable.total}
          subtitle="All Jobs"
          color="gold"
        />
      </div>

      {/* Pipeline Comparison */}
      <div className="grid grid-cols-2 gap-6">
        {/* Applied vs Sourced */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-4">Pipeline Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stage Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-4">Applied Pipeline - Stage Distribution</h3>
          {stageChartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData} layout="vertical" margin={{ left: 120 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                  <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-tdc-gray-light text-center py-8">Stage data will populate after first refresh</p>
          )}
        </div>
      </div>

      {/* Conversion Funnel Visual */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-4 flex items-center gap-2">
          <Clock size={16} className="text-tdc-gold" />
          Recruitment Funnel ({PERIOD_LABELS[period]})
        </h3>
        <div className="flex items-center justify-center gap-2">
          {[
            { label: 'Leads', value: periodStats.combined, color: 'bg-tdc-gold' },
            { label: 'Applied', value: periodStats.applied, color: 'bg-tdc-gold-dark' },
            { label: 'Sourced', value: periodStats.sourced, color: 'bg-tdc-gold-light' },
            { label: 'Onboarded', value: periodStats.onboarded, color: 'bg-green-500' },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && <div className="text-tdc-gray-light text-lg">&rarr;</div>}
              <div className={`${step.color} text-white rounded-xl px-6 py-4 text-center min-w-[120px]`}>
                <p className="text-2xl font-bold">{step.value}</p>
                <p className="text-xs font-medium opacity-90">{step.label}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Specialized Tracking */}
      <div className="grid grid-cols-2 gap-6">
        {/* Markets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-tdc-gold" />
            Top Market Distribution
          </h3>
          <div className="space-y-3">
            {marketData.map(market => (
              <div key={market.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-tdc-black">{market.name}</span>
                  <span className="font-bold text-tdc-black">{market.count} experts</span>
                </div>
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full gap-bar-fill"
                    style={{
                      width: `${Math.min(100, (market.count / Math.max(...marketData.map(m => m.count), 1)) * 100)}%`,
                      backgroundColor: market.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-tdc-gray-light">
              Combined top 3 markets: <span className="font-bold text-tdc-black">
                {markets.Chicago + markets['Los Angeles'] + markets['New York']}
              </span> experts ({Math.round(((markets.Chicago + markets['Los Angeles'] + markets['New York']) / totalActiveExperts) * 100)}% of network)
            </p>
          </div>
        </div>

        {/* Diversity & Special Targets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-4 flex items-center gap-2">
            <Heart size={16} className="text-tdc-gold" />
            Diversity & Special Recruitment Targets
          </h3>
          <div className="space-y-4">
            {/* BIPOC */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-tdc-black">BIPOC Representation</span>
                <span className="font-bold text-tdc-black">{bipoc.percentage}% ({bipoc.total} experts)</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tdc-gold rounded-full gap-bar-fill"
                  style={{ width: `${bipoc.percentage}%` }}
                />
              </div>
            </div>

            {/* Disability */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-tdc-black">Disability Representation</span>
                <span className="text-tdc-gray-light text-xs">Tracking in progress</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full gap-bar-fill" style={{ width: '0%' }} />
              </div>
              <p className="text-[10px] text-tdc-gray-light mt-1">Manual tracking - bio-based detection coming soon</p>
            </div>

            {/* Bentonville */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-tdc-black">Bentonville/NW Arkansas (Sam's Club)</span>
                <span className="font-bold text-tdc-black">{markets.Bentonville} experts</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full gap-bar-fill"
                  style={{ width: `${Math.min(100, (markets.Bentonville / 25) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-tdc-gray-light mt-1">Target: 25 experts in NW Arkansas region</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bad Emails / Bounce Tracking */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" />
          Email Quality Tracking
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-tdc-gray-light">Bad Emails (Applied)</p>
            <p className="text-xl font-bold text-tdc-black">
              {streak.applied.byStage?.['Bad Email'] || streak.applied.byStage?.['bad-email'] || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-tdc-gray-light">Bad Emails (Sourced)</p>
            <p className="text-xl font-bold text-tdc-black">
              {streak.sourced.byStage?.['Bad Email'] || streak.sourced.byStage?.['bad-email'] || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-tdc-gray-light">Declined/No Response</p>
            <p className="text-xl font-bold text-tdc-black">
              {(streak.applied.byStage?.['opportunity-declined'] || 0) + (streak.sourced.byStage?.['opportunity-declined'] || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Last Refresh */}
      <p className="text-xs text-tdc-gray-light text-right">
        Last refreshed: {new Date(data.lastRefresh).toLocaleString()}
      </p>
    </div>
  );
}

function MetricCard({ label, value, subtitle, color = 'gold' }) {
  const borderColors = {
    gold: 'border-tdc-gold',
    green: 'border-green-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
  };

  return (
    <div className={`bg-white rounded-xl border-t-4 ${borderColors[color]} p-4 shadow-sm`}>
      <p className="text-[10px] text-tdc-gray-light font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-tdc-black mt-1">{value}</p>
      {subtitle && <p className="text-[10px] text-tdc-gray-light mt-0.5">{subtitle}</p>}
    </div>
  );
}

function formatStageName(name) {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Tdc/g, 'TDC');
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-xl border-t-4 border-tdc-gold p-4">
            <div className="h-3 w-20 shimmer rounded mb-2" />
            <div className="h-8 w-12 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="text-center text-tdc-gray-light text-sm py-4">
        Loading recruitment performance data from Streak & Workable...
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
