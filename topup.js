// topup.js (FULL REPLACE)
(function () {
  const env = (window.__ENV || {});
  const fmtISK = (n) => isNaN(n) ? '0 kr' : (Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' kr');
  const toNum = (v) => Math.max(0, Number(v || 0));
  const providers = {
    A: { name: env.PROVIDER_A_NAME || 'Aðili A', pct: +env.PROVIDER_A_PCT || 0, fixed: +env.PROVIDER_A_FIXED || 0 },
    B: { name: env.PROVIDER_B_NAME || 'Aðili B', pct: +env.PROVIDER_B_PCT || 0, fixed: +env.PROVIDER_B_FIXED || 0 },
    C: { name: env.PROVIDER_C_NAME || 'Aðili C', pct: +env.PROVIDER_C_PCT || 0, fixed: +env.PROVIDER_C_FIXED || 0 },
  };
  const rateDAI = Number(env.DAI_ISK_RATE || 140);

  // els
  const $ = (id) => document.getElementById(id);
  const openBtn = $('openTopup');
  const modal = $('topupModal');
  const amountInput = $('topupAmount');
  const receiverInput = $('receiver');
  const cancelBtn = $('cancelTopup');
  const confirmBtn = $('confirmTopup');
  const scanBtn = $('scanBtn');
  const stopScan = $('stopScan');
  const scanWrap = $('scanWrap');
  const video = $('qrVideo');

  const bAmount = $('bAmount');
  const pAName = $('pAName'), pAFee = $('pAFee');
  const pBName = $('pBName'), pBFee = $('pBFee');
  const pCName = $('pCName'), pCFee = $('pCFee');
  const bTotal = $('bTotal');
  const bToAccount = $('bToAccount');
  const bDai = $('bDai');

  // sýna heiti aðila
  pAName.textContent = providers.A.name;
  pBName.textContent = providers.B.name;
  pCName.textContent = providers.C.name;

  // hraðval
  document.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => {
      amountInput.value = ch.getAttribute('data-amt');
      calc();
    });
  });

  function kycBlocked() {
    try {
      const u = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
      const tier = (u.tier || '').toLowerCase();
      return (tier.includes('almenn') || tier.includes('amat')) && u.kyc_status !== 'staðfest';
    } catch { return false; }
  }

  function calc() {
    const amount = toNum(amountInput.value);
    const feeA = amount * (providers.A.pct / 100) + providers.A.fixed;
    const feeB = amount * (providers.B.pct / 100) + providers.B.fixed;
    const feeC = amount * (providers.C.pct / 100) + providers.C.fixed;
    const totalFees = feeA + feeB + feeC;
    const totalPay = amount + totalFees;
    const daiRecv = (amount / rateDAI).toFixed(2);

    bAmount.textContent = fmtISK(amount);
    pAFee.textContent = fmtISK(feeA);
    pBFee.textContent = fmtISK(feeB);
    pCFee.textContent = fmtISK(feeC);
    bTotal.textContent = fmtISK(totalPay);
    bToAccount.textContent = fmtISK(amount);
    bDai.textContent = daiRecv + ' DAI';

    const ok = amount > 0 && receiverInput.value.trim().length > 0 && !kycBlocked();
    confirmBtn.disabled = !ok;
    confirmBtn.title = (!ok && kycBlocked()) ? 'KYC þarf til að fylla á reikning' : '';
    return { amount, totalPay, daiRecv };
  }

  [amountInput, receiverInput].forEach(el => el && el.addEventListener('input', calc));

  // QR skönnun
  let qrScanner = null;
  async function startScan() {
    scanWrap.classList.remove('hidden');
    try {
      qrScanner = new QrScanner(video, result => {
        const txt = String(result || '');
        try {
          if (txt.startsWith('stealthpay:')) {
            const q = new URLSearchParams(txt.split(':')[1]);
            const r = q.get('receiver'); const a = q.get('amount');
            if (r) receiverInput.value = r;
            if (a) amountInput.value = a;
          } else if (txt.includes('receiver=')) {
            const q = new URLSearchParams(txt.split('?')[1] || txt);
            const r = q.get('receiver'); const a = q.get('amount');
            if (r) receiverInput.value = r;
            if (a) amountInput.value = a;
          } else {
            receiverInput.value = txt.trim();
          }
        } catch { receiverInput.value = txt.trim(); }
        calc();
        stopScanning();
      }, { highlightScanRegion: true, maxScansPerSecond: 8 });
      await qrScanner.start();
    } catch (e) {
      alert('Gat ekki opnað myndavél. Leyfðu myndavél í vafranum.');
      scanWrap.classList.add('hidden');
    }
  }
  function stopScanning() {
    if (qrScanner) { qrScanner.stop(); qrScanner.destroy(); qrScanner = null; }
    scanWrap.classList.add('hidden');
  }
  scanBtn?.addEventListener('click', startScan);
  stopScan?.addEventListener('click', stopScanning);

  // opna/loka
  openBtn?.addEventListener('click', () => { modal.classList.remove('hidden'); calc(); });
  cancelBtn?.addEventListener('click', () => { stopScanning(); modal.classList.add('hidden'); });

  // staðfesta (demo)
  confirmBtn?.addEventListener('click', async () => {
    const { amount, totalPay, daiRecv } = calc();
    alert(`Fylling á reikning\nMóttakandi: ${receiverInput.value}\nFylling: ${fmtISK(amount)}\nSamtals greitt: ${fmtISK(totalPay)}\nÁætlað DAI: ${daiRecv} DAI`);
    try {
      const u = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
      if (u.wallet_id) {
        await fetch('/topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId: u.wallet_id, amountISK: amount })
        });
      }
    } catch {}
    stopScanning();
    modal.classList.add('hidden');
  });

  // tryggja demo reikning
  (function ensureWallet(){
    const u = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
    if (!u.wallet_id) {
      u.wallet_id = 'burner_' + Math.random().toString(36).slice(2,8).toUpperCase();
      if (!u.tier) u.tier = 'Almennur notandi';
      if (!u.kyc_status) u.kyc_status = 'óstaðfest';
      localStorage.setItem('stealthpay_user', JSON.stringify(u));
    }
  })();

  calc();
})();
