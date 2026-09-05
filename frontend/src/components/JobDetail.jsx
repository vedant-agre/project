import React, { useState, useEffect } from 'react';
import { formatEther } from 'ethers';

const STATUS_LABELS = {
  0: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  1: { label: 'Delivered', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  2: { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  3: { label: 'Disputed', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  4: { label: 'Resolved', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
};

export default function JobDetail({ jobId, account, contract, onBack }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // { 'milestoneIndex-action': boolean }
  const [error, setError] = useState('');
  const [txSuccessMsg, setTxSuccessMsg] = useState('');

  const fetchJobDetail = async () => {
    if (!contract || jobId === null || jobId === undefined) return;
    try {
      setLoading(true);
      setError('');
      const rawJob = await contract.getJob(jobId);

      const milestones = rawJob.milestones.map((m) => ({
        description: m.description,
        amount: m.amount,
        status: Number(m.status),
      }));

      const totalAmountWei = milestones.reduce((sum, m) => sum + BigInt(m.amount), 0n);

      setJob({
        jobId: rawJob.jobId.toString(),
        client: rawJob.client,
        freelancer: rawJob.freelancer,
        arbitrator: rawJob.arbitrator,
        milestones,
        totalAmountEth: formatEther(totalAmountWei),
      });
    } catch (err) {
      console.error('Error loading job details:', err);
      setError('Failed to fetch job details from contract.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetail();
  }, [jobId, contract]);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleAction = async (milestoneIdx, actionType, extraParam) => {
    setError('');
    setTxSuccessMsg('');

    const key = `${milestoneIdx}-${actionType}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      let tx;
      if (actionType === 'markDelivered') {
        tx = await contract.markDelivered(jobId, milestoneIdx);
      } else if (actionType === 'approveMilestone') {
        tx = await contract.approveMilestone(jobId, milestoneIdx);
      } else if (actionType === 'raiseDispute') {
        tx = await contract.raiseDispute(jobId, milestoneIdx);
      } else if (actionType === 'resolveDispute') {
        tx = await contract.resolveDispute(jobId, milestoneIdx, extraParam);
      }

      await tx.wait();
      setTxSuccessMsg(`Action "${actionType}" confirmed on Sepolia!`);
      await fetchJobDetail(); // Auto-refresh job status after transaction confirmation
    } catch (err) {
      console.error(`Error executing ${actionType}:`, err);
      const msg = err.reason || err.message || 'Transaction failed or was rejected.';
      setError(msg);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4"></div>
        <div className="h-40 bg-slate-900 border border-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 text-center py-12">
        <p className="text-slate-400 text-sm">Job not found.</p>
        <button onClick={onBack} className="text-xs text-indigo-400 underline">Back to Dashboard</button>
      </div>
    );
  }

  const accLower = (account || '').toLowerCase();
  const isClient = job.client.toLowerCase() === accLower;
  const isFreelancer = job.freelancer.toLowerCase() === accLower;
  const isArbitrator = job.arbitrator.toLowerCase() === accLower;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <span>← Back to Dashboard</span>
        </button>
        <button
          onClick={fetchJobDetail}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          🔄 Refresh Status
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold text-rose-400 ml-2">✕</button>
        </div>
      )}

      {txSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center justify-between">
          <span>{txSuccessMsg}</span>
          <button onClick={() => setTxSuccessMsg('')} className="font-bold text-emerald-400 ml-2">✕</button>
        </div>
      )}

      {/* Main Job Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-slate-100">Job #{job.jobId}</h2>
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {parseFloat(job.totalAmountEth).toFixed(3)} ETH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Escrow Job Details & Milestone Management</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {isClient && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg font-semibold">Your Role: Client</span>}
            {isFreelancer && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold">Your Role: Freelancer</span>}
            {isArbitrator && <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-lg font-semibold">Your Role: Arbitrator</span>}
            {!isClient && !isFreelancer && !isArbitrator && <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">Viewer</span>}
          </div>
        </div>

        {/* Participant Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Client</span>
            <div className="font-mono text-slate-200 font-medium truncate" title={job.client}>
              {formatAddress(job.client)} {isClient && '(You)'}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Freelancer</span>
            <div className="font-mono text-slate-200 font-medium truncate" title={job.freelancer}>
              {formatAddress(job.freelancer)} {isFreelancer && '(You)'}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Arbitrator</span>
            <div className="font-mono text-slate-200 font-medium truncate" title={job.arbitrator}>
              {formatAddress(job.arbitrator)} {isArbitrator && '(You)'}
            </div>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-200">Job Milestones ({job.milestones.length})</h3>

          {job.milestones.map((m, idx) => {
            const statusInfo = STATUS_LABELS[m.status] || { label: 'Unknown', bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };

            // Determine available buttons
            const isPending = m.status === 0;
            const isDelivered = m.status === 1;
            const isApproved = m.status === 2;
            const isDisputed = m.status === 3;
            const isResolved = m.status === 4;

            const canFreelancerDeliver = isFreelancer && isPending;
            const canClientApprove = isClient && isDelivered;
            const canClientOrFreelancerDispute = (isClient || isFreelancer) && isDelivered;
            const canArbitratorResolve = isArbitrator && isDisputed;

            return (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-400">Milestone #{idx + 1}</span>
                    <h4 className="text-sm font-semibold text-slate-100">{m.description}</h4>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {formatEther(m.amount)} ETH
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {(canFreelancerDeliver || canClientApprove || canClientOrFreelancerDispute || canArbitratorResolve) && (
                  <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-900">
                    {/* Freelancer Mark Delivered */}
                    {canFreelancerDeliver && (
                      <button
                        onClick={() => handleAction(idx, 'markDelivered')}
                        disabled={actionLoading[`${idx}-markDelivered`]}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                      >
                        {actionLoading[`${idx}-markDelivered`] ? 'Confirming...' : 'Mark Delivered'}
                      </button>
                    )}

                    {/* Client Approve */}
                    {canClientApprove && (
                      <button
                        onClick={() => handleAction(idx, 'approveMilestone')}
                        disabled={actionLoading[`${idx}-approveMilestone`]}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                      >
                        {actionLoading[`${idx}-approveMilestone`] ? 'Confirming...' : 'Approve & Release Funds'}
                      </button>
                    )}

                    {/* Client / Freelancer Raise Dispute */}
                    {canClientOrFreelancerDispute && (
                      <button
                        onClick={() => handleAction(idx, 'raiseDispute')}
                        disabled={actionLoading[`${idx}-raiseDispute`]}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                      >
                        {actionLoading[`${idx}-raiseDispute`] ? 'Confirming...' : 'Raise Dispute'}
                      </button>
                    )}

                    {/* Arbitrator Resolve */}
                    {canArbitratorResolve && (
                      <>
                        <button
                          onClick={() => handleAction(idx, 'resolveDispute', true)}
                          disabled={actionLoading[`${idx}-resolveDispute`]}
                          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                        >
                          {actionLoading[`${idx}-resolveDispute`] ? 'Confirming...' : 'Resolve: Pay Freelancer'}
                        </button>
                        <button
                          onClick={() => handleAction(idx, 'resolveDispute', false)}
                          disabled={actionLoading[`${idx}-resolveDispute`]}
                          className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                        >
                          {actionLoading[`${idx}-resolveDispute`] ? 'Confirming...' : 'Resolve: Refund Client'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
