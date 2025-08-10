require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();

// ===== ENV.JS endpoint til að senda public breytur til front-end =====
app.get('/env.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(`window.__ENV = ${JSON.stringify({
    PROVIDER_A_NAME: process.env.NEXT_PUBLIC_PROVIDER_A_NAME,
    PROVIDER_B_NAME: process.env.NEXT_PUBLIC_PROVIDER_B_NAME,
    PROVIDER_C_NAME: process.env.NEXT_PUBLIC_PROVIDER_C_NAME,
    PROVIDER_A_PCT: process.env.NEXT_PUBLIC_PROVIDER_A_PCT,
    PROVIDER_A_FIXED: process.env.NEXT_PUBLIC_PROVIDER_A_FIXED,
    PROVIDER_B_PCT: process.env.NEXT_PUBLIC_PROVIDER_B_PCT,
    PROVIDER_B_FIXED: process.env.NEXT_PUBLIC_PROVIDER_B_FIXED,
    PROVIDER_C_PCT: process.env.NEXT_PUBLIC_PROVIDER_C_PCT,
    PROVIDER_C_FIXED: process.env.NEXT_PUBLIC_PROVIDER_C_FIXED,
    DAI_ISK_RATE: process.env.NEXT_PUBLIC_DAI_ISK_RATE
  })};`);
});

// ===== Wallet storage =====
const FILE = './wallets.json';
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');

function loadWallets() {
  return JSON.parse(fs.readFileSync(FILE));
}

function saveWallets(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Routes =====

// Nýskráning – býr til bráðabirgðareikning með random ID
app.post('/register', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nafn vantar' });

  const wallets = loadWallets();
  const walletId = 'burnerWallet_' + Math.random().toString(36).substr(2, 6).toUpperCase();

  wallets[walletId] = {
    name,
    createdAt: new Date().toISOString(),
    balanceISK: 0
  };

  saveWallets(wallets);

  res.json({ walletId, message: 'Bráðabirgðareikningur hefur verið búinn til' });
});

// Les inneign fyrir reikning
app.get('/balance/:walletId', (req, res) => {
  const wallets = loadWallets();
  const wallet = wallets[req.params.walletId];
  if (!wallet) return res.status(404).json({ error: 'Reikningur fannst ekki' });

  res.json({ balanceISK: wallet.balanceISK });
});

// Uppfæra inneign (demo top-up)
app.post('/topup', (req, res) => {
  const { walletId, amountISK } = req.body;
  if (!walletId || !amountISK) return res.status(400).json({ error: 'Gögn vantar' });

  const wallets = loadWallets();
  const wallet = wallets[walletId];
  if (!wallet) return res.status(404).json({ error: 'Reikningur fannst ekki' });

  wallet.balanceISK += amountISK;
  saveWallets(wallets);

  res.json({ message: 'Inneign uppfærð', newBalance: wallet.balanceISK });
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
