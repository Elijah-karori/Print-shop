import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, AlertOctagon, RefreshCw, CheckCircle2, AlertCircle, Loader2, Truck, Users, ScanLine } from 'lucide-react';
import { listItemUnits, listSuppliers, listDeployments, getInventoryAnalytics, addItemUnit, triggerRecall, type ItemUnit, type Supplier, type Deployment, type InventoryAnalyticsResponse } from '../lib/api';

const addUnitSchema = z.object({
  part_id: z.string().uuid('Valid Part UUID required'),
  serial_number: z.string().min(3, 'Serial number must be at least 3 characters'),
  unit_cost_kes: z.number().positive('Unit cost must be a positive number'),
});

const recallSchema = z.object({
  serial_number: z.string().min(1, 'Serial number is required'),
  recall_reason: z.string().min(5, 'Recall reason must be at least 5 characters'),
});

const receiveSchema = z.object({
  po_line_id: z.string().uuid('Valid PO Line UUID required'),
  received_qty: z.number().int().positive('Quantity must be greater than 0'),
  serial_prefix: z.string().optional(),
});

export function Inventory() {
  const [tab, setTab] = useState<'units' | 'receive' | 'suppliers' | 'deployments'>('units');

  const [units, setUnits] = useState<ItemUnit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);

  // Add unit form
  const [addPartId, setAddPartId] = useState('');
  const [addSerial, setAddSerial] = useState('');
  const [addCost, setAddCost] = useState('');
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Recall unit form
  const [recallSerial, setRecallSerial] = useState('');
  const [recallReason, setRecallReason] = useState('');
  const [recallFormErrors, setRecallFormErrors] = useState<Record<string, string>>({});
  const [recallSubmitting, setRecallSubmitting] = useState(false);
  const [recallSuccess, setRecallSuccess] = useState(false);

  // Receive Stock Form (PO line receiving)
  const [poLineId, setPoLineId] = useState('');
  const [receivedQty, setReceivedQty] = useState('10');
  const [serialPrefix, setSerialPrefix] = useState('SN-RCV-');
  const [receiveErrors, setReceiveErrors] = useState<Record<string, string>>({});
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      listItemUnits().catch(() => []),
      listSuppliers().catch(() => []),
      listDeployments().catch(() => []),
      getInventoryAnalytics().catch(() => null),
    ])
      .then(([u, s, d, a]) => {
        setUnits(u);
        setSuppliers(s);
        setDeployments(d);
        setAnalytics(a);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormErrors({});
    const costNum = parseFloat(addCost);

    const validation = addUnitSchema.safeParse({
      part_id: addPartId,
      serial_number: addSerial,
      unit_cost_kes: isNaN(costNum) ? 0 : costNum,
    });

    if (!validation.success) {
      const formatted: Record<string, string> = {};
      validation.error.issues.forEach((issue: any) => {
        if (issue.path[0]) formatted[issue.path[0].toString()] = issue.message;
      });
      setAddFormErrors(formatted);
      return;
    }

    setAddSubmitting(true);
    try {
      await addItemUnit(validation.data);
      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddModal(false);
        setAddPartId('');
        setAddSerial('');
        setAddCost('');
        loadData();
      }, 1200);
    } catch (err: any) {
      setAddFormErrors({ submit: err.message || 'Error registering unit' });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleRecallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecallFormErrors({});

    const validation = recallSchema.safeParse({
      serial_number: recallSerial,
      recall_reason: recallReason,
    });

    if (!validation.success) {
      const formatted: Record<string, string> = {};
      validation.error.issues.forEach((issue: any) => {
        if (issue.path[0]) formatted[issue.path[0].toString()] = issue.message;
      });
      setRecallFormErrors(formatted);
      return;
    }

    setRecallSubmitting(true);
    try {
      await triggerRecall(validation.data);
      setRecallSuccess(true);
      setTimeout(() => {
        setRecallSuccess(false);
        setShowRecallModal(false);
        setRecallSerial('');
        setRecallReason('');
        loadData();
      }, 1200);
    } catch (err: any) {
      setRecallFormErrors({ submit: err.message || 'Recall error' });
    } finally {
      setRecallSubmitting(false);
    }
  };

  const handleReceiveStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiveErrors({});
    const qtyNum = parseInt(receivedQty, 10);

    const validation = receiveSchema.safeParse({
      po_line_id: poLineId,
      received_qty: isNaN(qtyNum) ? 0 : qtyNum,
      serial_prefix: serialPrefix,
    });

    if (!validation.success) {
      const formatted: Record<string, string> = {};
      validation.error.issues.forEach((issue: any) => {
        if (issue.path[0]) formatted[issue.path[0].toString()] = issue.message;
      });
      setReceiveErrors(formatted);
      return;
    }

    setReceiveSubmitting(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/admin/procurement/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      if (!res.ok) throw new Error('Receiving PO stock failed. Check PO line ID.');
      setReceiveSuccess(true);
      setTimeout(() => {
        setReceiveSuccess(false);
        setPoLineId('');
        loadData();
      }, 1500);
    } catch (err: any) {
      setReceiveErrors({ submit: err.message || 'Failed to process receipt' });
    } finally {
      setReceiveSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-diag uppercase flex items-center gap-1.5">
            <Package className="h-4 w-4" /> INVENTORY &amp; PROCUREMENT ENGINE
          </p>
          <h1 className="mt-2 font-mono text-3xl font-bold text-ink tracking-tight">
            Serialized Units, Suppliers &amp; Deployments
          </h1>
          <p className="mt-1 text-sm text-inkMuted max-w-2xl">
            Unified inventory tracking with locked cost at receipt, event-driven JetStream telemetry, supplier registry, and asset deployments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRecallModal(true)}
            className="flex items-center gap-2 rounded-lg border border-amber/40 bg-amber/10 px-4 py-2 text-xs font-mono font-bold text-amber transition-colors hover:bg-amber/20"
          >
            <AlertOctagon className="h-4 w-4" /> RECALL UNIT
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-diag px-4 py-2 text-xs font-mono font-bold text-background transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> ADD ITEM UNIT
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Could not load inventory records. Verify the Go backend service is running.</span>
        </motion.div>
      )}

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2 font-mono text-xs">
        <button
          onClick={() => setTab('units')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            tab === 'units' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          SERIALIZED UNITS ({units.length})
        </button>
        <button
          onClick={() => setTab('receive')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            tab === 'receive' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          RECEIVE PO STOCK
        </button>
        <button
          onClick={() => setTab('suppliers')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            tab === 'suppliers' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          SUPPLIERS ({suppliers.length})
        </button>
        <button
          onClick={() => setTab('deployments')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            tab === 'deployments' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          DEPLOYMENTS ({deployments.length})
        </button>
      </div>

      {/* KPI Stats */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <span className="text-xs font-mono text-inkMuted">TOTAL SERIAL UNITS</span>
            <p className="mt-2 font-mono text-2xl font-bold text-ink">{analytics.total_units}</p>
            <p className="mt-1 text-[11px] font-mono text-diag">KES {analytics.total_value_kes.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <span className="text-xs font-mono text-inkMuted">IN STOCK UNITS</span>
            <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{analytics.in_stock_units}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <span className="text-xs font-mono text-inkMuted">RECALLED UNITS</span>
            <p className="mt-2 font-mono text-2xl font-bold text-amber">{analytics.recalled_units}</p>
          </div>
        </div>
      )}

      {/* Tab 1: Serialized Item Units Table */}
      {tab === 'units' && (
        <section className="space-y-4">
          <h2 className="font-mono text-xs tracking-wider text-amber uppercase flex items-center gap-2">
            <Package className="h-4 w-4" /> SERIALIZED ITEM UNITS (LOCKED COST AT RECEIPT)
          </h2>
          {loading ? (
            <div className="h-32 flex items-center justify-center font-mono text-xs text-inkMuted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading units...
            </div>
          ) : units.length === 0 ? (
            <p className="text-sm text-inkMuted">No serialized item units recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
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
                    <tr key={unit.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-3 text-diag font-bold">{unit.serial_number}</td>
                      <td className="p-3 uppercase">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          unit.status === 'recalled'
                            ? 'border-amber/40 bg-amber/10 text-amber'
                            : 'border-diag/40 bg-diag/10 text-diag'
                        }`}>
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
      )}

      {/* Tab 2: Receive PO Stock Flow */}
      {tab === 'receive' && (
        <section className="max-w-lg space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-md">
            <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2 mb-4">
              <ScanLine className="h-5 w-5 text-diag" /> PROCESS PURCHASE ORDER RECEIPT
            </h2>

            {receiveErrors.submit && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 font-mono text-xs text-red-400">
                {receiveErrors.submit}
              </div>
            )}

            {receiveSuccess ? (
              <div className="py-8 font-mono text-xs text-diag flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-10 w-10 animate-bounce" /> Bulk PO units received &amp; NATS event published!
              </div>
            ) : (
              <form onSubmit={handleReceiveStockSubmit} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-inkMuted uppercase mb-1">PO Line UUID *</label>
                  <input
                    type="text"
                    value={poLineId}
                    onChange={(e) => setPoLineId(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                  {receiveErrors.po_line_id && <p className="mt-1 text-red-400">{receiveErrors.po_line_id}</p>}
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Received Quantity *</label>
                  <input
                    type="number"
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                  {receiveErrors.received_qty && <p className="mt-1 text-red-400">{receiveErrors.received_qty}</p>}
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Serial Number Prefix</label>
                  <input
                    type="text"
                    value={serialPrefix}
                    onChange={(e) => setSerialPrefix(e.target.value)}
                    placeholder="SN-RCV-"
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <button
                  type="submit"
                  disabled={receiveSubmitting}
                  className="w-full rounded-lg border border-diag bg-diag/10 py-3 font-bold text-diag hover:bg-diag/20 transition-colors disabled:opacity-50"
                >
                  {receiveSubmitting ? 'PROCESSING PO RECEIPT...' : 'CONFIRM RECEIPT &amp; SPAWN UNITS →'}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Tab 3: Suppliers Table */}
      {tab === 'suppliers' && (
        <section className="space-y-4">
          <h2 className="font-mono text-xs tracking-wider text-amber uppercase flex items-center gap-2">
            <Truck className="h-4 w-4" /> SUPPLIER DIRECTORY
          </h2>
          {suppliers.length === 0 ? (
            <p className="text-sm text-inkMuted">No registered suppliers yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
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
                    <tr key={s.id} className="hover:bg-background/50 transition-colors">
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
      )}

      {/* Tab 4: Deployments Table */}
      {tab === 'deployments' && (
        <section className="space-y-4">
          <h2 className="font-mono text-xs tracking-wider text-amber uppercase flex items-center gap-2">
            <Users className="h-4 w-4" /> ACTIVE DEPLOYMENTS &amp; HANDOFFS
          </h2>
          {deployments.length === 0 ? (
            <p className="text-sm text-inkMuted">No active unit deployments.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
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
                    <tr key={d.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-3 font-bold font-mono">{d.item_unit_id}</td>
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
      )}

      {/* Add Unit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
              <h3 className="font-mono text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-diag" /> Add Serialized Item Unit
              </h3>

              {addFormErrors.submit && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                  {addFormErrors.submit}
                </div>
              )}

              {addSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-diag font-mono text-sm gap-2">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" /> Unit registered successfully!
                </div>
              ) : (
                <form onSubmit={handleAddUnitSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Part UUID *</label>
                    <input
                      type="text"
                      value={addPartId}
                      onChange={(e) => setAddPartId(e.target.value)}
                      placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                      className="w-full rounded-lg border border-line bg-background p-2.5 text-xs font-mono text-ink outline-none focus:border-diag"
                    />
                    {addFormErrors.part_id && <p className="mt-1 text-xs text-red-400">{addFormErrors.part_id}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Serial Number *</label>
                    <input
                      type="text"
                      value={addSerial}
                      onChange={(e) => setAddSerial(e.target.value)}
                      placeholder="e.g. SN-SSD-9920"
                      className="w-full rounded-lg border border-line bg-background p-2.5 text-xs font-mono text-ink outline-none focus:border-diag"
                    />
                    {addFormErrors.serial_number && <p className="mt-1 text-xs text-red-400">{addFormErrors.serial_number}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Unit Cost (KES) *</label>
                    <input
                      type="number"
                      value={addCost}
                      onChange={(e) => setAddCost(e.target.value)}
                      placeholder="e.g. 7500"
                      className="w-full rounded-lg border border-line bg-background p-2.5 text-xs font-mono text-ink outline-none focus:border-diag"
                    />
                    {addFormErrors.unit_cost_kes && <p className="mt-1 text-xs text-red-400">{addFormErrors.unit_cost_kes}</p>}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="rounded-lg border border-line px-4 py-2 text-xs font-mono text-ink hover:bg-background"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={addSubmitting}
                      className="flex items-center gap-2 rounded-lg bg-diag px-4 py-2 text-xs font-mono font-bold text-background disabled:opacity-50"
                    >
                      {addSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'REGISTER UNIT'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Trigger Recall Modal */}
      <AnimatePresence>
        {showRecallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
              <h3 className="font-mono text-lg font-bold text-amber mb-4 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5" /> Trigger Item Recall
              </h3>

              {recallFormErrors.submit && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                  {recallFormErrors.submit}
                </div>
              )}

              {recallSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-amber font-mono text-sm gap-2">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" /> Unit recalled and event published to JetStream!
                </div>
              ) : (
                <form onSubmit={handleRecallSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Serial Number *</label>
                    <input
                      type="text"
                      value={recallSerial}
                      onChange={(e) => setRecallSerial(e.target.value)}
                      placeholder="e.g. SN-SSD-9920"
                      className="w-full rounded-lg border border-line bg-background p-2.5 text-xs font-mono text-ink outline-none focus:border-amber"
                    />
                    {recallFormErrors.serial_number && <p className="mt-1 text-xs text-red-400">{recallFormErrors.serial_number}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Recall Reason *</label>
                    <textarea
                      rows={3}
                      value={recallReason}
                      onChange={(e) => setRecallReason(e.target.value)}
                      placeholder="e.g. Manufacturer component fault batch #402"
                      className="w-full rounded-lg border border-line bg-background p-2.5 text-xs font-mono text-ink outline-none focus:border-amber"
                    />
                    {recallFormErrors.recall_reason && <p className="mt-1 text-xs text-red-400">{recallFormErrors.recall_reason}</p>}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setShowRecallModal(false)}
                      className="rounded-lg border border-line px-4 py-2 text-xs font-mono text-ink hover:bg-background"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={recallSubmitting}
                      className="flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-xs font-mono font-bold text-background disabled:opacity-50"
                    >
                      {recallSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONFIRM RECALL'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
