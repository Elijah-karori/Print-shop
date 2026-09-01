import { useState, useEffect } from 'react';
import { listItemUnits, listSuppliers, listDeployments, type ItemUnit, type Supplier, type Deployment } from '../lib/api';

export function Inventory() {
  const [units, setUnits] = useState<ItemUnit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      listItemUnits().catch(() => []),
      listSuppliers().catch(() => []),
      listDeployments().catch(() => []),
    ])
      .then(([u, s, d]) => {
        setUnits(u);
        setSuppliers(s);
        setDeployments(d);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">INVENTORY &amp; PROCUREMENT ENGINE</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Serialized Units, Suppliers &amp; Deployments</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Unified serialized item units with locked cost at receipt, supplier registry, and active asset deployments.
        </p>
      </div>

      {error && (
        <p className="rounded border border-line bg-surface p-4 text-sm text-inkMuted">
          Could not load inventory records right now — verify that the Go API is running.
        </p>
      )}

      {/* Serialized Item Units Table */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">SERIALIZED ITEM UNITS (LOCKED COST AT RECEIPT)</h2>
        {units.length === 0 ? (
          <p className="text-sm text-inkMuted">No serialized item units recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left font-mono text-xs text-ink">
              <thead className="border-b border-line bg-background text-inkMuted">
                <tr>
                  <th className="p-3">SERIAL NUMBER</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3">LOCKED UNIT COST</th>
                  <th className="p-3">RECEIVED AT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-background/50">
                    <td className="p-3 text-diag font-bold">{unit.serial_number}</td>
                    <td className="p-3 uppercase">
                      <span className="rounded border border-diag/40 bg-diag/10 px-2 py-0.5 text-[10px]">
                        {unit.status}
                      </span>
                    </td>
                    <td className="p-3">KES {unit.unit_cost_kes.toLocaleString()}</td>
                    <td className="p-3">{new Date(unit.created_at).toLocaleDateString('en-KE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Suppliers Table */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">SUPPLIER DIRECTORY</h2>
        {suppliers.length === 0 ? (
          <p className="text-sm text-inkMuted">No registered suppliers yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left font-mono text-xs text-ink">
              <thead className="border-b border-line bg-background text-inkMuted">
                <tr>
                  <th className="p-3">SUPPLIER NAME</th>
                  <th className="p-3">CONTACT PHONE</th>
                  <th className="p-3">EMAIL</th>
                  <th className="p-3 text-diag">RATING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="p-3 font-bold">{s.name}</td>
                    <td className="p-3">{s.contact_phone || '—'}</td>
                    <td className="p-3">{s.contact_email || '—'}</td>
                    <td className="p-3 text-diag font-bold">{s.rating} / 5.0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Deployments Table */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">ACTIVE DEPLOYMENTS &amp; HANDOFFS</h2>
        {deployments.length === 0 ? (
          <p className="text-sm text-inkMuted">No active unit deployments.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left font-mono text-xs text-ink">
              <thead className="border-b border-line bg-background text-inkMuted">
                <tr>
                  <th className="p-3">ITEM UNIT ID</th>
                  <th className="p-3">ASSIGNED TO</th>
                  <th className="p-3">DEPLOYED AT</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {deployments.map((d) => (
                  <tr key={d.id} className="hover:bg-background/50">
                    <td className="p-3 font-bold">{d.item_unit_id}</td>
                    <td className="p-3">{d.assigned_to}</td>
                    <td className="p-3">{new Date(d.deployed_at).toLocaleDateString('en-KE')}</td>
                    <td className="p-3 uppercase">{d.status}</td>
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
