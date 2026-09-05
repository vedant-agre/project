import React from 'react';

export default function Navbar({
  account,
  chainId,
  isConnecting,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  activeTab,
  setActiveTab,
  userRoles = [],
}) {
  let isSepolia = false;
  if (chainId != null) {
    try {
      isSepolia = BigInt(chainId) === 11155111n;
    } catch {
      const str = String(chainId).toLowerCase();
      isSepolia = str === '0xaa36a7' || str === '11155111';
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      {/* Network Warning Banner */}
      {account && !isSepolia && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">⚠️ Wrong Network:</span>
            <span>You are not connected to the Sepolia Test Network.</span>
          </div>
          <button
            onClick={onSwitchNetwork}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-colors text-xs shadow"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Tabs */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              Ξ
            </div>
            <span className="text-lg font-bold text-slate-100 tracking-tight">
              Escrow<span className="text-indigo-400">dApp</span>
            </span>
          </div>

          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'create'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              + Create Job
            </button>
          </nav>
        </div>

        {/* Wallet Controls & Role Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {account ? (
            <div className="flex items-center space-x-3">
              {/* Role Indicator Badge */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Role:</span>
                {userRoles.length > 0 ? (
                  <div className="flex space-x-1">
                    {userRoles.map((role) => (
                      <span
                        key={role}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          role === 'Client'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : role === 'Freelancer'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    No active job roles
                  </span>
                )}
              </div>

              {/* Wallet Address & Disconnect */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono text-xs text-slate-200">{formatAddress(account)}</span>
              </div>

              <button
                onClick={onDisconnect}
                className="text-xs text-slate-400 hover:text-rose-400 py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Disconnect Wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isConnecting ? (
                <span>Connecting...</span>
              ) : (
                <span>Connect Wallet</span>
              )}
            </button>
          )}

          {/* Account Switch Tip */}
          {account && (
            <div className="text-[10px] text-slate-400 flex items-center space-x-1" title="Switch accounts in MetaMask extension to act as a different role">
              <span>💡</span>
              <span className="hidden lg:inline">Switch MetaMask account to change roles</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
