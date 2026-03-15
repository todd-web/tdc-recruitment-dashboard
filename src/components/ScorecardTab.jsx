import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import { fetchEndpoint } from '../api';

export default function ScorecardTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { scorecard } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-tdc-black flex items-center gap-2">
          <ClipboardCheck size={20} className="text-tdc-gold" />
          Recruitment Cycle Scorecard
        </h2>
        <p className="text-xs text-tdc-gray-light">
          Last refreshed: {new Date(data.lastRefresh).toLocaleString()}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-tdc-black text-white">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Metric</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Target</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Actual</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider">Progress</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Owner</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.map((row, i) => {
              const status = getStatus(row);
              return (
                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-tdc-off-white transition-colors`}>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-sm text-tdc-black">{row.metric}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm text-tdc-gray-mid font-medium">
                      {typeof row.target === 'number' ? row.target.toLocaleString() : row.target}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-lg font-bold text-tdc-black">
                      {row.actual !== null && row.actual !== undefined ? (typeof row.actual === 'number' ? row.actual.toLocaleString() : row.actual) : '--'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-5 py-4">
                    <ProgressBar row={row} status={status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-tdc-gray-mid">{row.owner}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 justify-center text-xs text-tdc-gray-mid">
        <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> On Track</span>
        <span className="flex items-center gap-1"><MinusCircle size={14} className="text-yellow-500" /> Needs Attention</span>
        <span className="flex items-center gap-1"><XCircle size={14} className="text-red-500" /> Below Target</span>
        <span className="flex items-center gap-1"><MinusCircle size={14} className="text-gray-400" /> Tracking Only</span>
      </div>
    </div>
  );
}

function getStatus(row) {
  if (row.actual === null || row.actual === undefined) return 'no-data';
  if (typeof row.target === 'string' && row.target.toLowerCase() === 'track') return 'tracking';

  const target = typeof row.target === 'string' ? parseInt(row.target) : row.target;
  if (isNaN(target)) return 'tracking';

  const actual = typeof row.actual === 'string' ? parseInt(row.actual) : row.actual;
  if (isNaN(actual)) return 'no-data';

  const ratio = actual / target;
  if (ratio >= 0.9) return 'on-track';
  if (ratio >= 0.6) return 'attention';
  return 'below';
}

function StatusBadge({ status }) {
  const configs = {
    'on-track': { icon: CheckCircle2, color: 'text-green-500', label: 'On Track' },
    'attention': { icon: MinusCircle, color: 'text-yellow-500', label: 'Attention' },
    'below': { icon: XCircle, color: 'text-red-500', label: 'Below' },
    'tracking': { icon: MinusCircle, color: 'text-gray-400', label: 'Tracking' },
    'no-data': { icon: MinusCircle, color: 'text-gray-300', label: 'Pending' },
  };
  const cfg = configs[status] || configs['no-data'];
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
      <Icon size={14} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ row, status }) {
  if (status === 'no-data' || status === 'tracking') {
    return <div className="w-full h-2 bg-gray-100 rounded-full" />;
  }

  const target = typeof row.target === 'string' ? parseInt(row.target) : row.target;
  const actual = typeof row.actual === 'string' ? parseInt(row.actual) : row.actual;

  if (isNaN(target) || isNaN(actual)) {
    return <div className="w-full h-2 bg-gray-100 rounded-full" />;
  }

  const pct = Math.min(100, Math.round((actual / target) * 100));
  const color = status === 'on-track' ? 'bg-green-500' : status === 'attention' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full gap-bar-fill`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-tdc-gray-light text-right mt-0.5">{pct}%</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="h-5 w-48 shimmer rounded mb-4" />
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex gap-4 mb-3">
          <div className="h-4 w-40 shimmer rounded" />
          <div className="h-4 w-16 shimmer rounded" />
          <div className="h-4 w-16 shimmer rounded" />
        </div>
      ))}
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
