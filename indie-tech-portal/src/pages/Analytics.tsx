import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';
import { Activity, ShieldAlert, Cpu, AlertCircle, RefreshCw, BarChart2, TrendingUp, CheckCircle2 } from 'lucide-react';
import { getMTBFMetrics, getSupplierFailureMetrics, getInventoryAnalytics, type MTBFMetric, type SupplierFailureMetric, type InventoryAnalyticsResponse } from '../lib/api';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

export function Analytics() {
  const [mtbfList, setMtbfList] = useState<MTBFMetric[]>([]);
  const [supplierList, setSupplierList] = useState<SupplierFailureMetric[]>([]);
  const [invAnalytics, setInvAnalytics] = useState<InventoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      getMTBFMetrics().catch(() => []),
      getSupplierFailureMetrics().catch(() => []),
      getInventoryAnalytics().catch(() => null),
    ])
      .then(([mList, sList, inv]) => {
        setMtbfList(mList || []);
        setSupplierList(sList || []);
        setInvAnalytics(inv);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-diag uppercase flex items-center gap-1.5">
            <Activity className="h-4 w-4" /> ADVANCED ANALYTICS ENGINE
          </p>
          <h1 className="mt-2 font-mono text-3xl font-bold text-ink tracking-tight">
            Reliability &amp; Hardware Quality Metrics
          </h1>
          <p className="mt-1 text-sm text-inkMuted max-w-2xl">
            Real-time telemetry on Mean Time Between Failures (MTBF), supplier defect rates, and stock status distribution.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-xs font-mono text-ink transition-colors hover:bg-background disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> REFRESH METRICS
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Could not load live analytics. Ensure the backend Go service and database are active.</span>
        </motion.div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>TOTAL SERIALIZED UNITS</span>
            <Cpu className="h-4 w-4 text-diag" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-ink">
            {loading ? '...' : invAnalytics?.total_units ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-diag font-mono">KES {(invAnalytics?.total_value_kes ?? 0).toLocaleString()} Total Value</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>IN-STOCK AVAILABILITY</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-ink">
            {loading ? '...' : invAnalytics?.in_stock_units ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-inkMuted font-mono">Ready for deployment</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>ACTIVE DEPLOYMENTS</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-ink">
            {loading ? '...' : invAnalytics?.deployed_units ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-inkMuted font-mono">In-field assigned machines</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>RECALLED UNITS</span>
            <ShieldAlert className="h-4 w-4 text-amber" />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-amber">
            {loading ? '...' : invAnalytics?.recalled_units ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-amber/80 font-mono">Flagged for component defect</p>
        </motion.div>
      </div>

      {/* Visual Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* MTBF Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-line bg-surface p-6 shadow-md"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-diag" /> MTBF by Model (Hours)
              </h2>
              <p className="text-xs text-inkMuted mt-0.5">Higher operating hours indicate higher reliability.</p>
            </div>
          </div>

          {mtbfList.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs font-mono text-inkMuted border border-dashed border-line rounded-lg">
              No machine model failure logs recorded yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mtbfList} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                  <XAxis dataKey="model" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#22c55e' }}
                  />
                  <Bar dataKey="mtbf_hours" name="MTBF (Hours)" radius={[4, 4, 0, 0]}>
                    {mtbfList.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Supplier Failure Rates Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-line bg-surface p-6 shadow-md"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber" /> Supplier Failure Rate (%)
              </h2>
              <p className="text-xs text-inkMuted mt-0.5">Defect rates calculated from received component lots.</p>
            </div>
          </div>

          {supplierList.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs font-mono text-inkMuted border border-dashed border-line rounded-lg">
              No supplier defect records found.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierList} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                  <XAxis dataKey="supplier_name" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Bar dataKey="failure_rate_percentage" name="Failure Rate (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detailed Tables */}
      <div className="space-y-6">
        <h2 className="font-mono text-xs tracking-wider text-amber uppercase">
          RELIABILITY LOG SUMMARY
        </h2>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left font-mono text-xs text-ink">
            <thead className="border-b border-line bg-background text-inkMuted">
              <tr>
                <th className="p-3">BRAND</th>
                <th className="p-3">MODEL</th>
                <th className="p-3">TOTAL FAILURES</th>
                <th className="p-3">AVG OPERATING HOURS</th>
                <th className="p-3 text-diag">MTBF (HOURS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mtbfList.map((row, idx) => (
                <tr key={idx} className="hover:bg-background/50 transition-colors">
                  <td className="p-3 font-semibold">{row.brand || 'Generic'}</td>
                  <td className="p-3">{row.model || 'Standard'}</td>
                  <td className="p-3">{row.total_failures}</td>
                  <td className="p-3">{row.avg_operating_hours_failure} hrs</td>
                  <td className="p-3 text-diag font-bold">{row.mtbf_hours} hrs</td>
                </tr>
              ))}
              {mtbfList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-inkMuted">
                    No MTBF logs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
