import { useState, useEffect } from 'react';
import { Wrench, TrendingUp, AlertTriangle, Clock, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { getMTBFMetrics, getSupplierFailureMetrics, listParts, type MTBFMetric, type SupplierFailureMetric, type Part } from '../lib/api';

export function Admin() {
  const [mtbfList, setMtbfList] = useState<MTBFMetric[]>([]);
  const [supplierList, setSupplierList] = useState<SupplierFailureMetric[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMTBFMetrics().catch(() => []),
      getSupplierFailureMetrics().catch(() => []),
      listParts().catch(() => []),
    ])
      .then(([m, s, p]) => {
        setMtbfList(m || []);
        setSupplierList(s || []);
        setParts(p || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const lowStockParts = parts.filter((p) => p.stock_qty < 5);
  const maxHours = Math.max(...mtbfList.map((m) => m.mtbf_hours), 1000);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <p className="font-mono text-xs tracking-widest text-diag uppercase">ADMINISTRATIVE DASHBOARD</p>
        <h1 className="mt-2 font-mono text-3xl font-bold text-ink">System Overview &amp; Control</h1>
        <p className="mt-1 text-sm text-inkMuted max-w-2xl">
          Live ticket dispatch monitoring, order volume, inventory low-stock alerts, and reliability analytics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>OPEN TICKETS</span>
            <Wrench className="h-4 w-4 text-diag" />
          </div>
          <p className="font-mono text-2xl font-bold text-ink">7</p>
          <p className="text-[11px] font-mono text-diag">4 active in field</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>TODAY'S ORDERS</span>
            <TrendingUp className="h-4 w-4 text-diag" />
          </div>
          <p className="font-mono text-2xl font-bold text-ink">KES 34,200</p>
          <p className="text-[11px] font-mono text-inkMuted">12 checkout transactions</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>LOW STOCK ITEMS</span>
            <AlertTriangle className="h-4 w-4 text-amber" />
          </div>
          <p className="font-mono text-2xl font-bold text-amber">{lowStockParts.length}</p>
          <p className="text-[11px] font-mono text-amber/80">Reorder threshold &lt; 5</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-inkMuted">
            <span>AVG. RESPONSE TIME</span>
            <Clock className="h-4 w-4 text-diag" />
          </div>
          <p className="font-mono text-2xl font-bold text-ink">1.8 hrs</p>
          <p className="text-[11px] font-mono text-diag">On-site SLA achieved</p>
        </div>
      </div>

      {/* Grid: Low Stock & MTBF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert List */}
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <h2 className="font-mono text-xs font-bold uppercase text-amber tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> LOW STOCK — REORDER SOON
          </h2>
          {lowStockParts.length === 0 ? (
            <p className="text-xs font-mono text-inkMuted">All spare parts are sufficiently stocked.</p>
          ) : (
            <div className="divide-y divide-line">
              {lowStockParts.map((part) => (
                <div key={part.id} className="py-2.5 flex items-center justify-between font-mono text-xs">
                  <div>
                    <p className="font-bold text-ink">{part.name}</p>
                    <p className="text-[11px] text-inkMuted">SKU: {part.sku}</p>
                  </div>
                  <span className="rounded border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] font-bold text-amber">
                    {part.stock_qty} UNITS LEFT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reliability / MTBF */}
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <h2 className="font-mono text-xs font-bold uppercase text-diag tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4" /> MEAN TIME BETWEEN FAILURES (UPTIME)
          </h2>
          {mtbfList.length === 0 ? (
            <p className="text-xs font-mono text-inkMuted">No machine model failure telemetry recorded.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {mtbfList.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink font-semibold">{m.brand} {m.model}</span>
                    <span className="text-diag font-bold">{m.mtbf_hours.toLocaleString()} hrs</span>
                  </div>
                  <div className="h-2 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-diag"
                      style={{ width: `${Math.min((m.mtbf_hours / maxHours) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Queue Overview */}
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <h2 className="font-mono text-xs font-bold uppercase text-ink tracking-wider flex items-center gap-2">
          <Wrench className="h-4 w-4 text-diag" /> LIVE TICKET QUEUE OVERVIEW
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-ink">
            <thead className="border-b border-line bg-background text-inkMuted">
              <tr>
                <th className="p-3">TICKET CODE</th>
                <th className="p-3">DEVICE MODEL</th>
                <th className="p-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                { code: 'TCK-2291', device: 'Kyocera ECOSYS M2540dn', status: 'en_route', tone: 'amber' },
                { code: 'TCK-2288', device: 'HP LaserJet Pro 400', status: 'queued', tone: 'muted' },
                { code: 'TCK-2280', device: 'Kyocera TASKalfa 3253ci', status: 'queued', tone: 'muted' },
                { code: 'TCK-2276', device: 'Epson EcoTank L3250', status: 'resolved', tone: 'diag' },
              ].map((t) => (
                <tr key={t.code} className="hover:bg-background/50 transition-colors">
                  <td className="p-3 font-bold text-diag">{t.code}</td>
                  <td className="p-3">{t.device}</td>
                  <td className="p-3 uppercase">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                      t.tone === 'amber' ? 'border-amber/40 bg-amber/10 text-amber' :
                      t.tone === 'diag' ? 'border-diag/40 bg-diag/10 text-diag' :
                      'border-line bg-background text-inkMuted'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
