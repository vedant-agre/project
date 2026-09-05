# Decentralized Escrow dApp

A decentralized escrow application built with Ethereum smart contracts (Hardhat, OpenZeppelin) and a modern React frontend (Vite, Tailwind CSS, ethers.js).

## 📁 Project Structure

```
.
├── contracts-project/    # Smart contract development workspace (Hardhat)
│   ├── contracts/        # Solidity smart contract source files (placeholder)
│   ├── test/             # Smart contract automated unit tests (placeholder)
│   ├── scripts/          # Contract deployment and task scripts (placeholder)
│   ├── hardhat.config.js # Hardhat configuration (local & Sepolia networks)
│   ├── .env.example      # Environment variables template
│   └── package.json      # Hardhat & OpenZeppelin dependencies
│
└── frontend/             # Frontend web application (React + Vite)
    ├── src/
    │   ├── App.jsx       # Main app layout with MetaMask wallet connection
    │   ├── main.jsx      # React entry point
    │   └── index.css     # Tailwind CSS styles
    ├── vite.config.js    # Vite configuration with Tailwind CSS plugin
    └── package.json      # React, Vite, Tailwind CSS, and Ethers v6 dependencies
```

---

## 🚀 Getting Started

### 1. Install Dependencies

Install dependencies for both the smart contract workspace and the frontend workspace:

```bash
# Install smart contract dependencies
cd contracts-project
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### 2. Configure Environment Variables

Before deploying smart contracts to public testnets (e.g. Sepolia), set up your environment variables:

1. Navigate to `contracts-project/`:
   ```bash
   cd contracts-project
   ```
2. Create a `.env` file by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in your editor and fill in your values:
   - `RPC_URL`: Your Ethereum Sepolia node RPC endpoint (e.g. from Alchemy, Infura, or QuickNode).
   - `PRIVATE_KEY`: The private key of your deployment wallet (ensure it has testnet ETH).

---

### 3. Run a Local Hardhat Node

To start a local Ethereum network node for development and testing:

```bash
cd contracts-project
npx hardhat node
```

This will launch a local JSON-RPC server at `http://127.0.0.1:8545/` with 20 pre-funded test accounts.

---

### 4. Run the Frontend Dev Server

To launch the React web application:

```bash
cd frontend
npm run dev
```

Open your browser at the URL shown in the terminal (typically `http://localhost:5173/`).

---

### 5. MetaMask Wallet Connection

1. Ensure the MetaMask browser extension is installed.
2. Click the **"Connect Wallet"** button on the web app interface.
3. Approve the connection prompt in MetaMask to view your connected wallet address and chain ID.
