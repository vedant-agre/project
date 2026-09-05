import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

export default function App() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const connectWallet = async () => {
    setError('');
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to connect.');
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        const network = await provider.getNetwork();
        setChainId(network.chainId.toString());
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setChainId(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400">
            Decentralized Escrow dApp
          </h1>
          <p className="text-sm text-slate-400">
            Hackathon Project Scaffolding
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 font-bold ml-2">✕</button>
          </div>
        )}

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Wallet Status</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${account ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {account ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {account ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Connected Account</span>
                <span className="font-mono text-sm font-semibold text-emerald-300">{formatAddress(account)}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 break-all bg-slate-900/80 p-2 rounded border border-slate-800/80">
                {account}
              </div>
              {chainId && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Chain ID</span>
                  <span className="font-mono text-slate-300">{chainId}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              Connect your MetaMask wallet to begin
            </p>
          )}
        </div>

        <div className="pt-2">
          {account ? (
            <button
              onClick={disconnectWallet}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Disconnect Wallet
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect Wallet</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
