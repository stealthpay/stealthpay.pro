// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// ---------- Serve static files ----------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---------- Expose public env to frontend ----------
app.get('/env.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(`window.__ENV = ${JSON.stringify({
    PROVIDER_A_NAME: process.env.NEXT_PUBLIC_PROVIDER_A_NAME,
    PROVIDER_B_NAME: process.env.NEXT_PUBLIC_PROVIDER_B_NAME,
    PROVIDER_C_NAME: process.env.NEXT_PUBLIC_PROVIDER_C_NAME,
    PROVIDER_A_PCT: Number(process.env.NEXT_PUBLIC_PROVIDER_A_PCT || 0),
    PROVIDER_A_FIXED: Number(process.env.NEXT_PUBLIC_PROVIDER_A_FIXED || 0),
    PROVIDER_B_PCT: Number(process.env.NEXT_PUBLIC_PROVIDER_B_PCT || 0),
    PROVIDER_B_FIXED: Number(process.env.NEXT_PUBLIC_PROVIDER_B_FIXED || 0),
    PROVIDER_C_PCT: Number(process.env.NEXT_PUBLIC_PROVIDER_C_PCT || 0),
    PROVIDER_C_FIXED: Number(process.env.NEXT_PUBLIC_PROVIDER_C_FIXED || 0),
    DAI_ISK_RATE: Number(process.env.NEXT_PUBLIC_DAI_ISK_RATE || 140)
  })};`);
});

// ---------- Very‑light demo “database” ----------
const FILE = path.join(__dirname, 'wallets.json');
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');

const loadWallets = () => JSON.parse(fs.readFileSync(FILE));
const saveWallets = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

// ---------- API ----------
app.post('/register', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nafn vantar' });

  const wallets = loadWallets();
  const walletId = 'burner_' + Math.random().toString(36).slice(2, 8).toUpperCase();

  wallets[walletId] = {
    name,
    createdAt: new Date().toISOString(),
    balanceISK: 0
  };
  saveWallets(wallets);

  return res.json({ walletId, message: 'Bráðabirgðareikningur hefur verið búinn til' });
});

app.get('/balance/:walletId', (req, res) => {
  const wallets = loadWallets();
  const w = wallets[req.params.walletId];
  if (!w) return res.status(404).json({ error: 'Reikningur fannst ekki' });
  res.json({ balanceISK: w.balanceISK });
});

app.post('/topup', (req, res) => {
  const { walletId, amountISK } = req.body || {};
  if (!walletId || !amountISK) return res.status(400).json({ error: 'Gögn vantar' });

  const wallets = loadWallets();
  const w = wallets[walletId];
  if (!w) return res.status(404).json({ error: 'Reikningur fannst ekki' });

  w.balanceISK += Number(amountISK);
  saveWallets(wallets);

  res.json({ message: 'Inneign uppfærð', newBalance: w.balanceISK });
});

// Fallback: sendu index.html ef rót er sótt
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`StealthPay server @ http://localhost:${PORT}`));
