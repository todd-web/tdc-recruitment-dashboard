import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, TrendingUp, AlertTriangle, Target, Mail, UserPlus,
  Heart, ArrowRight
} from 'lucide-react';
import { fetchEndpoint } from '../api';

const GOLD = '#C5A572';
const GOLD_DARK = '#A88B5E';
const GOLD_LIGHT = '#D4B896';
const BLACK = '#1A1A1A';
const GREEN = '#22c55e';

export default function PerformanceTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const { streak, totalActiveExperts, onboarded, bipoc } = data;

  // Funnel: 3 stages - Leads -> Prospects -> Onboarded
  const totalLeads = streak.combined.total || 0;
  const prospects = data.prospects || 508;
  const onboardedYTD = onboarded.thisQuarter || 0;

  // Conversion rates
  const leadToProspect = totalLeads > 0 ? ((prospects / totalLeads) * 100).toFixed(1) : 0;
  const prospectToOnboarded = prospects > 0 ? ((onboardedYTD / prospects) * 100).toFixed(1) : 0;
  const overallConversion = totalLeads > 0 ? ((onboardedYTD / totalLeads) * 100).toFixed(1) : 0;

  // Bad email counts
  const badEmailApplied = streak.applied.byStage?.['Bad Email'] || streak.applied.byStage?.['bad-email'] || streak.applied.byStage?.['Bad Email / Bounced'] || 0;
  const badEmailSourced = streak.sourced.byStage?.['Bad Email'] || streak.sourced.byStage?.['bad-email'] || streak.sourced.byStage?.['Bad Email / Bounced'] || 0;
  const totalBadEmails = badEmailApplied + badEmailSourced;

  // 2026 targets
  const targets = {
    onboardings: { current: onboardedYTD, target: 1500, label: 'Total Onboardings' },
    communitySize: { current: totalActiveExperts, target: 3500, label: 'Community Size' },
    conversionRate: { current: parseFloat(overallConversion), target: 10, label: 'Conversion Rate', suffix: '%' },
  };

  // Funnel chart data for Recharts FunnelChart
  const funnelData = [
    { name: 'Leads', value: totalLeads, fill: GOLD },
    { name: 'Prospects', value: prospects, fill: GOLD_DARK },
    { name: 'Onboarded', value: onboardedYTD || 1, fill: GREEN },
  ];

  // Stage breakdown chart data
  const stageChartData = Object.entries(streak.applied.byStage || {}).map(([name, count]) => ({
    name: formatStageName(name),
    count,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-tdc-black flex items-center gap-2">
          <TrendingUp size={20} className="text-tdc-gold" />
          Recruitment Performance
        </h2>
        <p className="text-xs text-tdc-gray-light">
          Data snapshot as of {new Date(data.lastRefresh).toLocaleDateString()}
        </p>
      </div>

      {/* 3-Stage Recruitment Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-sm text-tdc-black mb-5 flex items-center gap-2">
          <Users size={16} className="text-tdc-gold" />
          Recruitment Funnel (YTD)
        </h3>

        {/* Visual Funnel Steps */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[
            { label: 'Leads', value: totalLeads, color: 'bg-tdc-gold', textColor: 'text-tdc-black' },
            { label: 'Prospects', value: prospects, color: 'bg-tdc-gold-dark', textColor: 'text-white' },
            { label: 'Onboarded', value: onboardedYTD, color: 'bg-green-500', textColor: 'text-white' },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && (
                <div className="flex flex-col items-center">
                  <ArrowRight size={20} className="text-tdc-gray-light" />
                </div>
              )}
              <div className={`${step.color} ${step.textColor} rounded-xl px-8 py-5 text-center min-w-[140px] shadow-sm`}>
                <p className="text-3xl font-bold">{step.value.toLocaleString()}</p>
                <p className="text-xs font-semibold opacity-90 mt-1">{step.label}</p>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Conversion Rates */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <ConversionBadge
            label="Lead to Prospect"
            rate={leadToProspect}
          />
          <ConversionBadge
            label="Prospect to Onboarded"
            rate={prospectToOnboarded}
          />
          <ConversionBadge
            label="Overall (Lead to Onboarded)"
            rate={overallConversion}
            highlight
          />
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-tdc-gray-light font-medium uppercase tracking-wider mb-1">2026 Target</p>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              parseFloat(overallConversion) >= 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <Target size={12} />
              10%
            </span>
          </div>
        </div>
      </div>

      {/* Tracking Cards Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bad Email Tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <Mail size={16} className="text-orange-500" />
            Bad Email Tracking
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-tdc-gray-light">Total Bad Emails</span>
              <span className="text-2xl font-bold text-tdc-black">{totalBadEmails}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-tdc-gray-light">Applied</p>
                <p className="text-lg font-bold text-tdc-black">{badEmailApplied}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-tdc-gray-light">Sourced</p>
                <p className="text-lg font-bold text-tdc-black">{badEmailSourced}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] text-tdc-gray-light">
                Bounce rate: {totalLeads > 0 ? ((totalBadEmails / totalLeads) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Referral Pipeline Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 border-dashed p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <UserPlus size={16} className="text-blue-500" />
            Referral Pipeline
          </h3>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="bg-blue-50 text-blue-600 rounded-full px-4 py-2 text-xs font-semibold mb-3">
              Coming Soon
            </div>
            <p className="text-xs text-tdc-gray-light text-center leading-relaxed">
              Pipeline setup in progress. Dedicated Streak pipeline with 3 stages: Prospect, Contacted, Onboarded.
            </p>
            <p className="text-[10px] text-tdc-gray-light mt-2 font-medium">Phase 2</p>
          </div>
        </div>

        {/* Disability Advocacy Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 border-dashed p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-3 flex items-center gap-2">
            <Heart size={16} className="text-purple-500" />
            Disability Advocacy
          </h3>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="bg-purple-50 text-purple-600 rounded-full px-4 py-2 text-xs font-semibold mb-3">
              Coming Soon
            </div>
            <p className="text-xs text-tdc-gray-light text-center leading-relaxed">
              Sub-profession setup in progress. "Advocate: Disability" category will be created in Expert Portal.
            </p>
            <p className="text-[10px] text-tdc-gray-light mt-2 font-medium">D&I Initiative</p>
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
            const pct = t.suffix === '%'
              ? Math.min(100, Math.round((t.current / t.target) * 100))
              : Math.min(100, Math.round((t.current / t.target) * 100));
            const displayCurrent = t.suffix ? `${t.current}${t.suffix}` : t.current.toLocaleString();
            const displayTarget = t.suffix ? `${t.target}${t.suffix}` : t.target.toLocaleString();
            const barColor = pct >= 90 ? 'bg-green-500' : pct >= 50 ? 'bg-tdc-gold' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-500';

            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-tdc-black">{t.label}</span>
                  <span className="text-tdc-gray-mid font-medium">
                    {displayCurrent} / {displayTarget}
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
      </div>

      {/* Pipeline Details Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-4">Pipeline Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-tdc-black">Applied Pipeline</p>
                <p className="text-[10px] text-tdc-gray-light">Workable + direct applications</p>
              </div>
              <p className="text-xl font-bold text-tdc-black">{streak.applied.total}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-tdc-black">Sourced Pipeline</p>
                <p className="text-[10px] text-tdc-gray-light">Team-sourced outreach</p>
              </div>
              <p className="text-xl font-bold text-tdc-black">{streak.sourced.total}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-tdc-gold bg-opacity-10 rounded-lg border border-tdc-gold border-opacity-30">
              <div>
                <p className="text-xs font-semibold text-tdc-black">Combined Total</p>
                <p className="text-[10px] text-tdc-gray-light">All active leads</p>
              </div>
              <p className="text-xl font-bold text-tdc-black">{streak.combined.total}</p>
            </div>
          </div>
        </div>

        {/* Applied Stage Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-tdc-black mb-4">Applied Pipeline - Stage Distribution</h3>
          {stageChartData.length > 0 ? (
            <div className="h-52">
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
            <p className="text-sm text-tdc-gray-light text-center py-8">Stage data will populate after first data refresh</p>
          )}
        </div>
      </div>

      {/* Last Refresh */}
      <p className="text-xs text-tdc-gray-light text-right">
        Last refreshed: {new Date(data.lastRefresh).toLocaleString()}
      </p>
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

function formatStageName(name) {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Tdc/g, 'TDC');
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-24 shimmer rounded mb-3" />
            <div className="h-8 w-16 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-4 w-40 shimmer rounded mb-4" />
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 w-36 shimmer rounded-xl" />
          ))}
        </div>
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
