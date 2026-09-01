import { useState, useEffect } from 'react';
import { getMTBFMetrics, getSupplierFailureMetrics, type MTBFMetric, type SupplierFailureMetric } from '../lib/api';

export function Analytics() {
  const [mtbfList, setMtbfList] = useState<MTBFMetric[]>([]);
  const [supplierList, setSupplierList] = useState<SupplierFailureMetric[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getMTBFMetrics(), getSupplierFailureMetrics()])
      .then(([mList, sList]) => {
        setMtbfList(mList || []);
        setSupplierList(sList || []);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">ANALYTICS ENGINE</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Reliability &amp; MTBF Analytics</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Mean Time Between Failures (MTBF) per machine model and supplier hardware failure rates.
        </p>
      </div>

      {error && (
        <p className="rounded border border-line bg-surface p-4 text-sm text-inkMuted">
          Could not load analytics metrics right now — verify that the API and database are running.
        </p>
      )}

      {/* MTBF Section */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">
          MEAN TIME BETWEEN FAILURES (MTBF BY MACHINE MODEL)
        </h2>
        {mtbfList.length === 0 ? (
          <p className="text-sm text-inkMuted">No machine failure data recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-surface">
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
                  <tr key={idx} className="hover:bg-background/50">
                    <td className="p-3">{row.brand || 'Generic'}</td>
                    <td className="p-3">{row.model || 'Standard'}</td>
                    <td className="p-3">{row.total_failures}</td>
                    <td className="p-3">{row.avg_operating_hours_failure} hrs</td>
                    <td className="p-3 text-diag font-bold">{row.mtbf_hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Supplier Failure Rates */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">
          SUPPLIER QUALITY &amp; FAILURE RATES
        </h2>
        {supplierList.length === 0 ? (
          <p className="text-sm text-inkMuted">No supplier defect data recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left font-mono text-xs text-ink">
              <thead className="border-b border-line bg-background text-inkMuted">
                <tr>
                  <th className="p-3">SUPPLIER</th>
                  <th className="p-3">UNITS RECEIVED</th>
                  <th className="p-3">FAILED UNITS</th>
                  <th className="p-3 text-amber">FAILURE RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {supplierList.map((row) => (
                  <tr key={row.supplier_id} className="hover:bg-background/50">
                    <td className="p-3">{row.supplier_name}</td>
                    <td className="p-3">{row.total_units_received}</td>
                    <td className="p-3">{row.total_failed_units}</td>
                    <td className="p-3 text-amber font-bold">{row.failure_rate_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
