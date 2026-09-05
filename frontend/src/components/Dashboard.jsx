import React, { useEffect, useState } from 'react';
import { formatEther } from 'ethers';

export default function Dashboard({ account, contract, onSelectJob, onCreateJobClick, onUserRolesFetched }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    if (!contract || !account) {
      setJobs([]);
      setLoading(false);
      if (onUserRolesFetched) onUserRolesFetched([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const countBig = await contract.getJobCount();
      const count = Number(countBig);

      /**
       * NOTE FOR HACKATHON vs PRODUCTION:
       * Client-side iteration over getJobCount() is suitable for hackathon demos with tens/hundreds of jobs.
       * In a production environment with thousands of jobs, an off-chain indexer or subgraph (The Graph)
       * should be used to query jobs filtered by participant address efficiently.
       */
      const userJobs = [];
      const globalRolesSet = new Set();

      for (let i = 0; i < count; i++) {
        try {
          const rawJob = await contract.getJob(i);

          const client = rawJob.client;
          const freelancer = rawJob.freelancer;
          const arbitrator = rawJob.arbitrator;

          const accLower = account.toLowerCase();
          const isClient = client.toLowerCase() === accLower;
          const isFreelancer = freelancer.toLowerCase() === accLower;
          const isArbitrator = arbitrator.toLowerCase() === accLower;

          if (isClient || isFreelancer || isArbitrator) {
            const roles = [];
            if (isClient) { roles.push('Client'); globalRolesSet.add('Client'); }
            if (isFreelancer) { roles.push('Freelancer'); globalRolesSet.add('Freelancer'); }
            if (isArbitrator) { roles.push('Arbitrator'); globalRolesSet.add('Arbitrator'); }

            const milestones = rawJob.milestones.map((m) => ({
              description: m.description,
              amount: m.amount,
              status: Number(m.status),
            }));

            const approvedCount = milestones.filter((m) => m.status === 2 || m.status === 4).length;
            const totalAmountWei = milestones.reduce((sum, m) => sum + BigInt(m.amount), 0n);

            userJobs.push({
              jobId: rawJob.jobId.toString(),
              client,
              freelancer,
              arbitrator,
              roles,
              milestones,
              approvedCount,
              totalCount: milestones.length,
              totalAmountEth: formatEther(totalAmountWei),
            });
          }
        } catch (jobErr) {
          console.error(`Error reading job #${i}:`, jobErr);
        }
      }

      setJobs(userJobs.reverse());
      if (onUserRolesFetched) {
        onUserRolesFetched(Array.from(globalRolesSet));
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs from smart contract.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [account, contract]);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!account) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
        <div className="text-4xl">👛</div>
        <h3 className="text-lg font-bold text-slate-200">Connect Your Wallet</h3>
        <p className="text-xs text-slate-400">
          Please connect your MetaMask wallet to view jobs associated with your address.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100">My Escrow Jobs</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/3"></div>
              <div className="h-3 bg-slate-800 rounded w-2/3"></div>
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">My Escrow Jobs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Jobs where your connected wallet is involved as Client, Freelancer, or Arbitrator.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="text-4xl">📋</div>
          <h3 className="text-base font-bold text-slate-200">No jobs found for this account</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any escrow jobs linked to this address. Create a job or switch accounts in MetaMask to view other roles.
          </p>
          <div>
            <button
              onClick={onCreateJobClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
            >
              + Create First Job
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div
              key={job.jobId}
              onClick={() => onSelectJob(job.jobId)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 cursor-pointer transition-all hover:shadow-xl group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-indigo-400 text-sm">Job #{job.jobId}</span>
                  <div className="flex space-x-1">
                    {job.roles.map((r) => (
                      <span
                        key={r}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          r === 'Client'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : r === 'Freelancer'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        }`}
                      >
                        Your Role: {r}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {parseFloat(job.totalAmountEth).toFixed(3)} ETH
                </span>
              </div>

              {/* Participants */}
              <div className="space-y-1 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-mono text-slate-300">{formatAddress(job.client)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freelancer:</span>
                  <span className="font-mono text-slate-300">{formatAddress(job.freelancer)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Arbitrator:</span>
                  <span className="font-mono text-slate-300">{formatAddress(job.arbitrator)}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-300">
                    {job.approvedCount} / {job.totalCount} milestones completed
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(job.approvedCount / job.totalCount) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-indigo-400 group-hover:text-indigo-300 font-medium inline-flex items-center space-x-1">
                  <span>View Job Details</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
