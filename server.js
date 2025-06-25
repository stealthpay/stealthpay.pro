<script>
  const leyfilegt = prompt("Sláðu inn lykilorð:");
  if (leyfilegt !== "stelpay2024") {
    alert("Aðgangur hafnað.");
    window.location.href = "https://google.com";
  }
</script>
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

const FILE = './wallets.json';
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');
function loadWallets() {
  return JSON.parse(fs.readFileSync(FILE));
}
function saveWallets(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json());

app.post('/register', (req, res) => {
  const { name } = req.body;
  const walletId = 'burneWallet_' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const wallets = loadWallets();
  wallets[walletId] = { name, balance: 0 };
  saveWallets(wallets);
  res.json({ walletId, name, balance: 0 });
});

app.post('/send', (req, res) => {
  const { from, to, amount } = req.body;
  const wallets = loadWallets();
  if (!wallets[from]) return res.status(400).json({ error: "Sendandi fannst ekki" });
  if (!wallets[to]) return res.status(400).json({ error: "Viðtakandi fannst ekki" });
  if (wallets[from].balance < amount) return res.status(400).json({ error: "Ekki næg inneign" });
  wallets[from].balance -= amount;
  wallets[to].balance += amount;
  saveWallets(wallets);
  res.json({ success: true });
});

app.get('/wallet/:id', (req, res) => {
  const wallets = loadWallets();
  const wallet = wallets[req.params.id];
  if (!wallet) return res.status(404).json({ error: "Veski fannst ekki" });
  res.json(wallet);
});

app.post('/deposit', (req, res) => {
  const { walletId, amount } = req.body;
  const wallets = loadWallets();
  if (!wallets[walletId]) return res.status(404).json({ error: "Veski fannst ekki" });
  wallets[walletId].balance += amount;
  saveWallets(wallets);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('✅ StealthPay backend running on http://localhost:3000');
});
