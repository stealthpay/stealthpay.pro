// wallet.js – PRO connect (Web3Modal v1 + WalletConnect + ethers)
(function () {
  const $ = (id) => document.getElementById(id);
  const connectBtn = $('connectBtn');
  const disconnectBtn = $('disconnectBtn');
  const statusEl = $('status');
  const addrBox = $('addrBox');
  const netNameEl = $('netName');

  const ENV = window.__ENV || {};
  // RPC stillingar – settu í Vercel env ef þú vilt yfirskrifa
  const RPCS = {
    8453: ENV.RPC_BASE || 'https://mainnet.base.org',         // Base
    137:  ENV.RPC_POLYGON || 'https://polygon-rpc.com',       // Polygon
    1:    ENV.RPC_ETH || 'https://cloudflare-eth.com'         // Ethereum mainnet (fallback)
  };

  let web3Modal = null;
  let provider = null;     // raw provider from Web3Modal
  let ethersProvider = null;
  let signer = null;

  function short(addr) {
    return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : '';
  }
  function setUI(addr, chainId) {
    if (addr) {
      statusEl.textContent = 'Veski tengt.';
      addrBox.style.display = 'block';
      addrBox.textContent = `${addr}`;
    } else {
      statusEl.textContent = 'Ekkert veski tengt.';
      addrBox.style.display = 'none';
      addrBox.textContent = '';
    }
    if (chainId) {
      const map = { 8453: 'Base', 137: 'Polygon', 1: 'Ethereum' };
      netNameEl.textContent = map[chainId] || ('chainId ' + chainId);
    } else {
      netNameEl.textContent = '—';
    }
  }

  async function init() {
    const providerOptions = {
      walletconnect: {
        package: window.WalletConnectProvider.default,
        options: {
          rpc: RPCS, // WC v1 krefst rpc korts
        }
      }
      // Coinbase Wallet o.fl. mætti bæta við hér (en WC nær flestum)
    };
    web3Modal = new window.Web3Modal.default({
      cacheProvider: false,
      providerOptions,
      theme: 'dark'
    });

    // Endurhlaða UI ef notandi var þegar tengdur (ef þú vilt cacheProvider: true)
    const u = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
    if (u && u.evm_address) {
      setUI(u.evm_address, u.evm_chainId);
    }
  }

  async function onConnect() {
    try {
      provider = await web3Modal.connect();
      // Umbreyta yfir í ethers
      ethersProvider = new ethers.providers.Web3Provider(provider);
      signer = ethersProvider.getSigner();

      const addr = await signer.getAddress();
      const net = await ethersProvider.getNetwork();

      // Vista sem PRO notandi
      const user = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
      user.tier = 'pro';
      user.evm_address = addr;
      user.evm_chainId = Number(net.chainId);
      localStorage.setItem('stealthpay_user', JSON.stringify(user));

      setUI(addr, Number(net.chainId));

      // Eftir connect máttu vísa notanda á dashboard
      // location.href = 'dashboard.html';
    } catch (e) {
      alert('Tenging mistókst: ' + (e && e.message ? e.message : e));
    }
  }

  async function onDisconnect() {
    try {
      if (provider && provider.close) await provider.close();
    } catch {}
    provider = null; ethersProvider = null; signer = null;
    const user = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
    delete user.evm_address; delete user.evm_chainId;
    // Sleppum tier – notandi getur verið PRO áfram en án tengds veskis
    localStorage.setItem('stealthpay_user', JSON.stringify(user));
    setUI(null, null);
  }

  connectBtn?.addEventListener('click', onConnect);
  disconnectBtn?.addEventListener('click', onDisconnect);

  init();
})();
