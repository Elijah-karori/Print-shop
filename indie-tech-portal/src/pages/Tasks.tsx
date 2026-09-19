import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Plus, Award, CheckCircle2, AlertCircle, Loader2,
  DollarSign, Star, ShieldCheck, ChevronRight, UserCheck, TrendingUp, Layers
} from 'lucide-react';
import {
  createTask, submitBid, getTaskBidsRanked, acceptBid, submitRating,
  type Task, type ScoredBid, type CreateTaskInput
} from '../lib/api';

export function Tasks() {
  const [activeTab, setActiveTab] = useState<'create' | 'rank' | 'bid' | 'rate'>('rank');

  // Task creation state
  const [customerId, setCustomerId] = useState('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
  const [customerType, setCustomerType] = useState<'enterprise' | 'personal'>('personal');
  const [serviceType, setServiceType] = useState<'corrective' | 'preventive' | 'contract_based' | 'project_based' | 'one_time'>('corrective');
  const [taskTitle, setTaskTitle] = useState('Emergency ATM Power Supply Replacement');
  const [taskDesc, setTaskDesc] = useState('ATM terminal #42 in Westlands branch experiencing power fluctuations.');
  const [targetPrice, setTargetPrice] = useState('4500');
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateLoadingError] = useState<string | null>(null);

  // Bid submission state
  const [bidTaskId, setBidTaskId] = useState('');
  const [bidTechId, setBidTechId] = useState('f9e8d7c6-b5a4-3f2e-1d0c-9b8a7f6e5d4c');
  const [bidAmount, setBidAmount] = useState('4200');
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  // Bid ranking & Advisory scoring state
  const [rankTaskId, setRankTaskId] = useState('');
  const [rankedTask, setRankedTask] = useState<Task | null>(null);
  const [rankedBids, setRankedBids] = useState<ScoredBid[]>([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  // Rating submission state
  const [ratingTaskId, setRatingTaskId] = useState('');
  const [ratingTechId, setRatingTechId] = useState('');
  const [ratingCustomerId, setRatingCustomerId] = useState('');
  const [ratingScore, setRatingScore] = useState('5.0');
  const [ratingReview, setRatingReview] = useState('Exceptional repair turn-around and diagnostic precision!');
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoadingError(null);
    setCreateLoading(true);

    try {
      const priceNum = parseFloat(targetPrice);
      const payload: CreateTaskInput = {
        customer_id: customerId,
        customer_type: customerType,
        service_type: serviceType,
        title: taskTitle,
        description: taskDesc,
        target_price_kes: isNaN(priceNum) ? undefined : priceNum,
      };

      const task = await createTask(payload);
      setCreatedTask(task);
      setBidTaskId(task.id);
      setRankTaskId(task.id);
      setRatingTaskId(task.id);
    } catch (err: any) {
      setCreateLoadingError(err.message || 'Failed to create task');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);
    setBidLoading(true);

    try {
      const amountNum = parseFloat(bidAmount);
      if (!bidTaskId || isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Valid Task ID and positive Bid Amount required');
      }

      await submitBid({
        task_id: bidTaskId,
        technician_id: bidTechId,
        bid_amount_kes: amountNum,
      });

      setBidSuccess(true);
      setTimeout(() => setBidSuccess(false), 3000);
    } catch (err: any) {
      setBidError(err.message || 'Failed to submit bid');
    } finally {
      setBidLoading(false);
    }
  };

  const handleFetchRankedBids = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rankTaskId) return;

    setRankError(null);
    setRankLoading(true);

    try {
      const res = await getTaskBidsRanked(rankTaskId);
      setRankedTask(res.task);
      setRankedBids(res.bids);
    } catch (err: any) {
      setRankError(err.message || 'Failed to fetch ranked bids');
    } finally {
      setRankLoading(false);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    if (!rankTaskId) return;
    setAcceptingBidId(bidId);

    try {
      await acceptBid(rankTaskId, bidId);
      await handleFetchRankedBids();
    } catch (err: any) {
      setRankError(err.message || 'Failed to accept bid');
    } finally {
      setAcceptingBidId(null);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setRatingError(null);
    setRatingLoading(true);

    try {
      const scoreNum = parseFloat(ratingScore);
      if (!ratingTaskId || !ratingTechId || !ratingCustomerId || isNaN(scoreNum)) {
        throw new Error('Task ID, Technician ID, Customer ID, and valid Score required');
      }

      await submitRating({
        task_id: ratingTaskId,
        technician_id: ratingTechId,
        customer_id: ratingCustomerId,
        score: scoreNum,
        review_text: ratingReview,
      });

      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 3000);
    } catch (err: any) {
      setRatingError(err.message || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <p className="font-mono text-xs tracking-widest text-diag uppercase flex items-center gap-1.5">
          <Layers className="h-4 w-4" /> TASK MANAGEMENT &amp; ADVISORY BID SCORING
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold text-ink">Variable Service Bidding Pipeline</h1>
        <p className="mt-1 text-sm text-inkMuted max-w-2xl">
          Multi-context weight allocation, 4-level reference price fallback resolution, and atomic O(1) technician ratings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab('rank')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            activeTab === 'rank' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          ADVISORY BID RANKING ENGINE
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            activeTab === 'create' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          CREATE TASK
        </button>
        <button
          onClick={() => setActiveTab('bid')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            activeTab === 'bid' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          SUBMIT BID
        </button>
        <button
          onClick={() => setActiveTab('rate')}
          className={`rounded-lg px-4 py-2 font-bold transition-colors ${
            activeTab === 'rate' ? 'bg-diag/10 border border-diag text-diag' : 'text-inkMuted hover:text-ink'
          }`}
        >
          RATE TECHNICIAN
        </button>
      </div>

      {/* TAB 1: Create Task */}
      {activeTab === 'create' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-md space-y-4">
            <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2">
              <Plus className="h-5 w-5 text-diag" /> Create Task Request
            </h2>

            {createError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 font-mono text-xs text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-inkMuted uppercase mb-1">Customer UUID *</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-inkMuted uppercase mb-1">Customer Type *</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  >
                    <option value="personal">Personal (High Price Weight)</option>
                    <option value="enterprise">Enterprise (SLA Weight)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Service Type *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as any)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  >
                    <option value="corrective">Corrective (Break-Fix / Emergency)</option>
                    <option value="preventive">Preventive (Scheduled PM)</option>
                    <option value="contract_based">Contract Based (SLA Managed)</option>
                    <option value="project_based">Project Based</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-inkMuted uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                />
              </div>

              <div>
                <label className="block text-inkMuted uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                />
              </div>

              <div>
                <label className="block text-inkMuted uppercase mb-1">Target Price (KES)</label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                />
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full rounded-lg border border-diag bg-diag/10 py-3 font-bold text-diag hover:bg-diag/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CREATE TASK &amp; OPEN BIDDING →'}
              </button>
            </form>
          </div>

          {createdTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-diag/40 bg-diag/10 p-5 font-mono text-xs text-ink space-y-2">
              <p className="font-bold text-diag flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Task Created &amp; Open for Bids
              </p>
              <p>Task ID: <span className="font-bold text-diag">{createdTask.id}</span></p>
              <p>Status: <span className="uppercase font-bold">{createdTask.state}</span></p>
              <p className="text-inkMuted mt-2">Auto-filled Task ID into Bid Submission and Advisory Scoring tabs.</p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* TAB 2: Submit Bid */}
      {activeTab === 'bid' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-md space-y-4">
            <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-diag" /> Submit Technician Bid
            </h2>

            {bidError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 font-mono text-xs text-red-400">
                {bidError}
              </div>
            )}

            {bidSuccess ? (
              <div className="py-6 font-mono text-xs text-diag flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 animate-bounce" /> Bid submitted idempotently! (Status: submitted)
              </div>
            ) : (
              <form onSubmit={handleSubmitBid} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-inkMuted uppercase mb-1">Task UUID *</label>
                  <input
                    type="text"
                    value={bidTaskId}
                    onChange={(e) => setBidTaskId(e.target.value)}
                    placeholder="Enter task UUID"
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Technician UUID *</label>
                  <input
                    type="text"
                    value={bidTechId}
                    onChange={(e) => setBidTechId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Bid Amount (KES) *</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bidLoading}
                  className="w-full rounded-lg border border-diag bg-diag/10 py-3 font-bold text-diag hover:bg-diag/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bidLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SUBMIT / UPSERT BID →'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 3: Advisory Bid Ranking */}
      {activeTab === 'rank' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-md space-y-4 max-w-2xl">
            <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2">
              <Award className="h-5 w-5 text-diag" /> Read-Only Advisory Scoring Engine
            </h2>

            <form onSubmit={handleFetchRankedBids} className="flex gap-3 font-mono text-xs">
              <input
                type="text"
                value={rankTaskId}
                onChange={(e) => setRankTaskId(e.target.value)}
                placeholder="Enter Task UUID to evaluate bids..."
                className="flex-1 rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
              />
              <button
                type="submit"
                disabled={rankLoading}
                className="rounded-lg border border-diag bg-diag/10 px-5 py-2.5 font-bold text-diag hover:bg-diag/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {rankLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'EVALUATE & RANK'}
              </button>
            </form>

            {rankError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 font-mono text-xs text-red-400">
                {rankError}
              </div>
            )}
          </div>

          {rankedTask && (
            <div className="rounded-xl border border-line bg-surface p-5 font-mono text-xs text-ink space-y-2">
              <p className="font-bold text-diag uppercase">EVALUATED TASK CONTEXT</p>
              <p>Title: <span className="text-ink font-bold">{rankedTask.title}</span></p>
              <p>Context: <span className="uppercase text-amber font-bold">{rankedTask.service_type}</span> ({rankedTask.customer_type} customer)</p>
              <p>Task State: <span className="uppercase text-diag font-bold">{rankedTask.state}</span></p>
            </div>
          )}

          {rankedBids.length > 0 && (
            <div className="space-y-4">
              <p className="font-mono text-xs font-bold text-inkMuted uppercase tracking-wider">
                RANKED BIDS ({rankedBids.length}) — SORTED BY TOTAL ADVISORY SCORE
              </p>

              <div className="grid grid-cols-1 gap-4">
                {rankedBids.map((sb, idx) => (
                  <div key={sb.bid.id} className="rounded-xl border border-line bg-surface p-6 shadow-md space-y-4 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                      <div>
                        <span className="rounded bg-diag/20 border border-diag px-2 py-0.5 font-bold text-diag mr-2">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-ink text-sm">{sb.technician.name}</span>
                        <span className="text-inkMuted ml-2">({sb.technician.level} level)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-diag">
                          {(sb.total_score * 100).toFixed(1)} pts
                        </span>
                        {rankedTask?.state === 'open_for_bidding' && (
                          <button
                            onClick={() => handleAcceptBid(sb.bid.id)}
                            disabled={acceptingBidId === sb.bid.id}
                            className="rounded-lg border border-diag bg-diag/10 px-4 py-2 font-bold text-diag hover:bg-diag/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {acceptingBidId === sb.bid.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'ACCEPT BID →'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Scores */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] text-inkMuted bg-background p-3 rounded-lg border border-line">
                      <div>
                        <p className="uppercase">Price Fit (w: {sb.weights.Price})</p>
                        <p className="text-ink font-bold font-mono">{(sb.price_score * 100).toFixed(0)}% (KES {sb.bid.bid_amount_kes.toLocaleString()})</p>
                      </div>
                      <div>
                        <p className="uppercase">Time Fit (w: {sb.weights.Time})</p>
                        <p className="text-ink font-bold font-mono">{(sb.time_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="uppercase">Rating Fit (w: {sb.weights.Rating})</p>
                        <p className="text-ink font-bold font-mono">{(sb.rating_score * 100).toFixed(0)}% ({sb.technician.overall_rating}/5)</p>
                      </div>
                      <div>
                        <p className="uppercase">Level Fit (w: {sb.weights.Level})</p>
                        <p className="text-ink font-bold font-mono">{(sb.level_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="uppercase">Machine Exp (w: {sb.weights.Exp})</p>
                        <p className="text-ink font-bold font-mono">{(sb.exp_score * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* TAB 4: Submit Rating */}
      {activeTab === 'rate' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-md space-y-4">
            <h2 className="font-mono text-sm font-bold text-ink uppercase flex items-center gap-2">
              <Star className="h-5 w-5 text-amber" /> Submit Technician Rating &amp; Review
            </h2>

            {ratingError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 font-mono text-xs text-red-400">
                {ratingError}
              </div>
            )}

            {ratingSuccess ? (
              <div className="py-6 font-mono text-xs text-diag flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 animate-bounce" /> Rating submitted &amp; overall technician average updated atomically O(1)!
              </div>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-inkMuted uppercase mb-1">Task UUID *</label>
                  <input
                    type="text"
                    value={ratingTaskId}
                    onChange={(e) => setRatingTaskId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Technician UUID *</label>
                  <input
                    type="text"
                    value={ratingTechId}
                    onChange={(e) => setRatingTechId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Customer UUID *</label>
                  <input
                    type="text"
                    value={ratingCustomerId}
                    onChange={(e) => setRatingCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Score (1.0 to 5.0) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={ratingScore}
                    onChange={(e) => setRatingScore(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <div>
                  <label className="block text-inkMuted uppercase mb-1">Review Comment</label>
                  <textarea
                    rows={2}
                    value={ratingReview}
                    onChange={(e) => setRatingReview(e.target.value)}
                    className="w-full rounded-lg border border-line bg-background p-2.5 text-ink outline-none focus:border-diag"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ratingLoading}
                  className="w-full rounded-lg border border-amber bg-amber/10 py-3 font-bold text-amber hover:bg-amber/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {ratingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SUBMIT RATING (ATOMIC O(1) UPDATE) →'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
