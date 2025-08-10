// topup.js
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

  const $ = (id) => document.getElementById(id);
  const openBtn = $('openTopup');
  const modal = $('topupModal');
  const amountInput = $('topupAmount');
  const providerSel = $('topupProvider');
  const cancelBtn = $('cancelTopup');
  const confirmBtn = $('confirmTopup');

  const bAmount = $('bAmount');
  const pAName = $('pAName'), pAFee = $('pAFee');
  const pBName = $('pBName'), pBFee = $('pBFee');
  const pCName = $('pCName'), pCFee = $('pCFee');
  const bTotal = $('bTotal');
  const bToAccount = $('bToAccount');
  const bDai = $('bDai');

  if (providerSel) {
    providerSel.options[0].text = providers.A.name;
    providerSel.options[1].text = providers.B.name;
    providerSel.options[2].text = providers.C.name;
  }
  pAName.textContent = providers.A.name;
  pBName.textContent = providers.B.name;
  pCName.textContent = providers.C.name;

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

    confirmBtn.disabled = amount <= 0 || kycBlocked();
    confirmBtn.title = confirmBtn.disabled && amount > 0 ? 'KYC þarf til að fylla á reikning' : '';
    return { amount, totalPay, daiRecv };
  }

  [amountInput, providerSel].forEach(el => el && el.addEventListener('input', calc));

  openBtn && openBtn.addEventListener('click', () => { modal.classList.remove('hidden'); calc(); });
  cancelBtn && cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  confirmBtn && confirmBtn.addEventListener('click', async () => {
    const { amount, totalPay, daiRecv } = calc();
    alert(`Fylling á reikning\nFylling: ${fmtISK(amount)}\nSamtals greitt: ${fmtISK(totalPay)}\nÁætlað DAI: ${daiRecv} DAI`);
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
    modal.classList.add('hidden');
  });

  // demo: tryggja tilvist reiknings
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
