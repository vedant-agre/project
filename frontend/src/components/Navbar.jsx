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
}) {
  const isSepolia = chainId === '0xaa36a7' || chainId === 11155111 || chainId === '11155111';

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Network Warning Banner */}
      {account && !isSepolia && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">⚠️ Wrong Network:</span>
            <span>You are not connected to the Sepolia Test Network.</span>
          </div>
          <button
            onClick={onSwitchNetwork}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition-colors text-xs shadow"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand & Tabs */}
        <div className="flex items-center space-x-8">
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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              + Create Job
            </button>
          </nav>
        </div>

        {/* Wallet Controls */}
        <div>
          {account ? (
            <div className="flex items-center space-x-3">
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono text-xs text-slate-200">{formatAddress(account)}</span>
              </div>
              <button
                onClick={onDisconnect}
                className="text-xs text-slate-400 hover:text-rose-400 py-1.5 px-2 rounded hover:bg-slate-800 transition-colors"
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
                <>
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
