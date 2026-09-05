import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import Navbar from './components/Navbar';
import CreateJob from './components/CreateJob';
import Dashboard from './components/Dashboard';
import JobDetail from './components/JobDetail';
import contractInfo from './contractInfo.json';

const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

export default function App() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [userRoles, setUserRoles] = useState([]);

  const initEthers = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_accounts', []);
      const network = await provider.getNetwork();
      setChainId(network.chainId);

      if (accounts && accounts.length > 0) {
        const userAddr = accounts[0];
        setAccount(userAddr);

        const signer = await provider.getSigner();
        const escrowContract = new Contract(contractInfo.address, contractInfo.abi, signer);
        setContract(escrowContract);
      }
    } catch (err) {
      console.error('Error initializing ethers:', err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask extension is not installed. Please install MetaMask to use this dApp.');
      return;
    }
    try {
      setIsConnecting(true);
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      setChainId(network.chainId);

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        const signer = await provider.getSigner();
        const escrowContract = new Contract(contractInfo.address, contractInfo.abi, signer);
        setContract(escrowContract);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setContract(null);
    setUserRoles([]);
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID_HEX,
                chainName: 'Sepolia Test Network',
                rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
        }
      } else {
        console.error('Failed to switch to Sepolia network:', switchError);
      }
    }
  };

  useEffect(() => {
    initEthers();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setUserRoles([]);
          initEthers();
        } else {
          setAccount('');
          setContract(null);
          setUserRoles([]);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Navbar
        account={account}
        chainId={chainId}
        isConnecting={isConnecting}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        onSwitchNetwork={switchToSepolia}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedJobId(null);
        }}
        userRoles={userRoles}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {selectedJobId !== null ? (
          <JobDetail
            jobId={selectedJobId}
            account={account}
            contract={contract}
            onBack={() => setSelectedJobId(null)}
          />
        ) : activeTab === 'create' ? (
          <CreateJob
            account={account}
            contract={contract}
            onSuccess={() => {
              setActiveTab('dashboard');
            }}
          />
        ) : (
          <Dashboard
            account={account}
            contract={contract}
            onSelectJob={(id) => setSelectedJobId(id)}
            onCreateJobClick={() => setActiveTab('create')}
            onUserRolesFetched={(roles) => setUserRoles(roles)}
          />
        )}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 text-center py-4 text-xs text-slate-500">
        Decentralized Escrow dApp • Built for Hackathon • Contract Address:{' '}
        <a
          href={`https://sepolia.etherscan.io/address/${contractInfo.address}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-indigo-400 hover:underline"
        >
          {contractInfo.address}
        </a>
      </footer>
    </div>
  );
}
