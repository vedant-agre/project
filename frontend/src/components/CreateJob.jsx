import React, { useState } from 'react';
import { parseEther, isAddress } from 'ethers';

export default function CreateJob({ account, contract, onSuccess }) {
  const [freelancer, setFreelancer] = useState('');
  const [arbitrator, setArbitrator] = useState('');
  const [milestones, setMilestones] = useState([
    { description: 'Milestone 1: Design & Specification', amount: '0.001' },
    { description: 'Milestone 2: Implementation & Testing', amount: '0.001' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txSuccess, setTxSuccess] = useState(null);

  const handleAddMilestone = () => {
    if (milestones.length >= 3) return;
    setMilestones([
      ...milestones,
      { description: `Milestone ${milestones.length + 1}`, amount: '0.001' },
    ]);
  };

  const handleRemoveMilestone = (index) => {
    if (milestones.length <= 2) return;
    const updated = milestones.filter((_, i) => i !== index);
    setMilestones(updated);
  };

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const calculateTotalEth = () => {
    try {
      let total = 0n;
      for (const m of milestones) {
        if (!m.amount || isNaN(parseFloat(m.amount))) continue;
        total += parseEther(m.amount);
      }
      return total;
    } catch {
      return 0n;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTxSuccess(null);

    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }
    if (!contract) {
      setError('Smart contract instance not loaded. Please make sure you are on Sepolia network.');
      return;
    }

    // Client-side validation
    if (!isAddress(freelancer)) {
      setError('Invalid Freelancer Ethereum address.');
      return;
    }
    if (!isAddress(arbitrator)) {
      setError('Invalid Arbitrator Ethereum address.');
      return;
    }
    if (freelancer.toLowerCase() === account.toLowerCase()) {
      setError('Freelancer address cannot be your own Client address.');
      return;
    }
    if (arbitrator.toLowerCase() === account.toLowerCase()) {
      setError('Arbitrator address cannot be your own Client address.');
      return;
    }
    if (freelancer.toLowerCase() === arbitrator.toLowerCase()) {
      setError('Freelancer and Arbitrator addresses must be different.');
      return;
    }

    if (milestones.length < 2 || milestones.length > 3) {
      setError('Jobs must have between 2 and 3 milestones.');
      return;
    }

    const descriptions = [];
    const amountsInWei = [];
    let totalWei = 0n;

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.description.trim()) {
        setError(`Milestone #${i + 1} description cannot be empty.`);
        return;
      }
      const parsedAmount = parseFloat(m.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError(`Milestone #${i + 1} amount must be a positive number.`);
        return;
      }

      try {
        const wei = parseEther(m.amount);
        descriptions.push(m.description.trim());
        amountsInWei.push(wei);
        totalWei += wei;
      } catch {
        setError(`Invalid ETH amount format in Milestone #${i + 1}.`);
        return;
      }
    }

    try {
      setLoading(true);
      const tx = await contract.createJob(
        freelancer,
        arbitrator,
        descriptions,
        amountsInWei,
        { value: totalWei }
      );

      const receipt = await tx.wait();

      // Extract JobID event if available
      const jobCount = await contract.getJobCount();
      const newJobId = (jobCount - 1n).toString();

      setTxSuccess({
        jobId: newJobId,
        txHash: tx.hash,
      });

      // Reset form
      setFreelancer('');
      setArbitrator('');
      setMilestones([
        { description: 'Milestone 1: Specification', amount: '0.001' },
        { description: 'Milestone 2: Delivery', amount: '0.001' },
      ]);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('createJob error:', err);
      const msg = err.reason || err.message || 'Transaction failed or was rejected.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalEthWei = calculateTotalEth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Create New Escrow Job</h2>
          <p className="text-xs text-slate-400 mt-1">
            Fund a new project escrow with 2 to 3 milestone deliverables. ETH funds will be locked securely until approved or resolved.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2 text-rose-400">✕</button>
          </div>
        )}

        {txSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-4 rounded-xl space-y-2">
            <div className="font-semibold text-sm text-emerald-400">🎉 Job Created Successfully!</div>
            <div>Assigned Job ID: <span className="font-mono font-bold text-white">#{txSuccess.jobId}</span></div>
            <div>
              Tx Hash:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${txSuccess.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-mono text-emerald-400 hover:text-emerald-300 break-all"
              >
                {txSuccess.txHash}
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Freelancer Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Freelancer Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={freelancer}
              onChange={(e) => setFreelancer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              required
            />
          </div>

          {/* Arbitrator Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Arbitrator Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={arbitrator}
              onChange={(e) => setArbitrator(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              required
            />
          </div>

          {/* Milestones List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Milestones ({milestones.length}/3)
              </label>
              <button
                type="button"
                onClick={handleAddMilestone}
                disabled={milestones.length >= 3}
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 font-medium"
              >
                + Add Milestone
              </button>
            </div>

            {milestones.map((m, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-indigo-400">Milestone #{idx + 1}</span>
                  {milestones.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-rose-400 hover:text-rose-300 text-[11px]"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Description (e.g. Design UI Mockups)"
                      value={m.description}
                      onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="0.001"
                        value={m.amount}
                        onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-semibold">ETH</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Funding Summary */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Required ETH Deposit</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {(Number(totalEthWei) / 1e18).toFixed(4)} ETH
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !account}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Confirming Transaction on Sepolia...</span>
            ) : (
              <span>Fund & Create Escrow Job</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
