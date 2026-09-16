import React, { useState, useEffect } from 'react';
import { Wrench, Search, CheckCircle2, AlertCircle, Clock, MapPin, Phone, Package, ArrowRight } from 'lucide-react';
import { listParts, listItemUnits, type Part, type ItemUnit } from '../lib/api';

interface JobItem {
  id: string;
  device: string;
  issue: string;
  client: string;
  phone: string;
  eta: string;
  address: string;
  status: 'en_route' | 'arrived' | 'in_progress' | 'completed';
}

export function Technician() {
  const [jobs, setJobs] = useState<JobItem[]>([
    {
      id: 'TCK-2291',
      device: 'Kyocera ECOSYS M2540dn',
      issue: 'No power — won\'t turn on after power surge',
      client: 'Jane Wanjiru',
      phone: '254712345678',
      eta: '10:30 AM',
      address: 'Westlands, Commercial Center',
      status: 'en_route',
    },
    {
      id: 'TCK-2288',
      device: 'HP LaserJet Pro 400',
      issue: 'Paper jam in tray 2, recurring sensor error',
      client: 'Moses Otieno',
      phone: '254722987654',
      eta: '01:00 PM',
      address: 'Kilimani, Argwings Kodhek',
      status: 'en_route',
    },
    {
      id: 'TCK-2280',
      device: 'Kyocera TASKalfa 3253ci',
      issue: 'Fuser unit wear out / streak marks on copies',
      client: 'Amani Print Shop',
      phone: '254733112233',
      eta: '03:30 PM',
      address: 'CBD, Luthuli Avenue',
      status: 'en_route',
    },
  ]);

  const [activeJobId, setActiveJobId] = useState<string>('TCK-2291');
  const [parts, setParts] = useState<Part[]>([]);
  const [units, setUnits] = useState<ItemUnit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reservedMsg, setReservedMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listParts().catch(() => []),
      listItemUnits().catch(() => []),
    ]).then(([p, u]) => {
      setParts(p || []);
      setUnits(u || []);
    });
  }, []);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  const filteredParts = searchQuery.trim()
    ? parts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    : parts.slice(0, 3);

  const handleReservePart = (part: Part) => {
    if (part.stock_qty <= 0) {
      setReservedMsg(`Part ${part.name} is currently out of stock.`);
      return;
    }

    const availableUnit = units.find((u) => u.part_id === part.id && u.status === 'in_stock');
    const snText = availableUnit ? `Serial #${availableUnit.serial_number}` : 'Unserialized unit';

    setReservedMsg(`Reserved ${part.name} (${snText}) for Job ${activeJob.id}.`);
    setTimeout(() => setReservedMsg(null), 4000);
  };

  const updateJobStatus = (newStatus: JobItem['status']) => {
    setJobs((prev) => prev.map((j) => (j.id === activeJob.id ? { ...j, status: newStatus } : j)));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <p className="font-mono text-xs tracking-widest text-diag uppercase flex items-center gap-1.5">
          <Wrench className="h-4 w-4" /> TECHNICIAN DISPATCH &amp; FIELD QUEUE
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold text-ink">Active Service Job Cards</h1>
        <p className="mt-1 text-sm text-inkMuted max-w-2xl">
          On-site service queue, job diagnostics, client addresses, and direct spare part reservation against stock.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Job List Sidebar */}
        <div className="lg:col-span-2 space-y-3">
          <p className="font-mono text-xs font-bold text-inkMuted uppercase tracking-wider">
            TODAY'S DISPATCH QUEUE — {jobs.length} JOBS
          </p>
          <div className="space-y-3">
            {jobs.map((j) => {
              const isActive = j.id === activeJobId;
              return (
                <button
                  key={j.id}
                  onClick={() => setActiveJobId(j.id)}
                  className={`w-full rounded-xl border p-4 text-left font-mono transition-colors shadow-sm ${
                    isActive ? 'border-diag bg-diag/10' : 'border-line bg-surface hover:border-inkMuted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-diag">{j.id}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${
                      j.status === 'completed' ? 'border-diag/40 bg-diag/10 text-diag' :
                      j.status === 'arrived' ? 'border-blue-400/40 bg-blue-400/10 text-blue-400' :
                      'border-amber/40 bg-amber/10 text-amber'
                    }`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-ink">{j.device}</p>
                  <p className="mt-1 text-xs text-inkMuted flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {j.eta} · {j.client}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Job View */}
        <div className="lg:col-span-3 rounded-xl border border-line bg-surface p-6 shadow-md space-y-6">
          <div className="flex items-start justify-between border-b border-line pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-diag">{activeJob.id}</span>
              <h2 className="mt-1 font-mono text-xl font-bold text-ink">{activeJob.device}</h2>
              <p className="mt-1 font-mono text-xs text-inkMuted flex items-center gap-3">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-diag" /> {activeJob.address}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-diag" /> {activeJob.phone}</span>
              </p>
            </div>
            <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-xs font-bold text-amber uppercase">
              {activeJob.status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="font-mono text-xs font-bold text-inkMuted uppercase mb-1">REPORTED ISSUE / FAULT LOG</p>
            <p className="font-mono text-xs text-ink bg-background p-3 rounded-lg border border-line leading-relaxed">
              {activeJob.issue}
            </p>
          </div>

          {/* Part Request Section */}
          <div className="border-t border-line pt-5 space-y-3">
            <p className="font-mono text-xs font-bold text-inkMuted uppercase">REQUEST A PART FOR THIS JOB</p>

            <div className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-xs font-mono">
              <Search className="h-4 w-4 text-inkMuted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spare parts by name or SKU..."
                className="w-full bg-transparent text-ink outline-none"
              />
            </div>

            {reservedMsg && (
              <div className="rounded-lg border border-diag/40 bg-diag/10 p-3 font-mono text-xs text-diag flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {reservedMsg}
              </div>
            )}

            <div className="space-y-2">
              {filteredParts.length === 0 ? (
                <p className="font-mono text-xs text-inkMuted p-2">No spare parts matching search query.</p>
              ) : (
                filteredParts.map((part) => (
                  <div key={part.id} className="rounded-lg border border-line bg-background p-3 flex items-center justify-between font-mono text-xs">
                    <div>
                      <p className="font-bold text-ink">{part.name}</p>
                      <p className="text-[11px] text-inkMuted">
                        SKU: {part.sku} · <span className={part.stock_qty > 0 ? 'text-diag font-bold' : 'text-amber'}>{part.stock_qty} in stock</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleReservePart(part)}
                      className="rounded border border-diag bg-diag/10 px-3 py-1.5 text-xs font-bold text-diag hover:bg-diag/20 transition-colors"
                    >
                      RESERVE →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 border-t border-line pt-5">
            <button
              onClick={() => updateJobStatus('arrived')}
              className="flex-1 rounded-lg border border-line bg-background py-2.5 font-mono text-xs font-bold text-ink hover:bg-surface transition-colors"
            >
              MARK ARRIVED AT SITE
            </button>
            <button
              onClick={() => updateJobStatus('completed')}
              className="flex-1 rounded-lg border border-diag bg-diag/10 py-2.5 font-mono text-xs font-bold text-diag hover:bg-diag/20 transition-colors"
            >
              COMPLETE &amp; CLOSE JOB CARD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
