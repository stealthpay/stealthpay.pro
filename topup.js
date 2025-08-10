// topup.js – full virkni fyrir Top‑up gluggann (opna/loka/útreikning/jöfnun)
(function () {
  const $ = (id) => document.getElementById(id);

  // Elements
  const openBtn = $('openTopup');
  const modal = $('topupModal');
  const overlay = $('overlay');
  const cancelBtn = $('cancelTopup');
  const quickBox = $('quickBtns');
  const amountInput = $('amountInput');
  const receiverInput = $('receiverInput');
  const scanQrBtn = $('scanQr');
  const payBtn = $('payCard');

  const fillLine = $('fillLine');
  const pA = $('pA');
  const pB = $('pB');
  const pC = $('pC');
  const sumPaid = $('sumPaid');
  const sumToAcct = $('sumToAcct');
  const estDai = $('estDai');

  const ENV = window.__ENV || {};
  const fmt = (n) => new Intl.NumberFormat('is-IS').format(Math.max(0, Math.round(n || 0)));

  // === Modal open/close helpers ===
  function openModal() {
    overlay.classList.add('open');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    amountInput.focus();
    calc(); // uppfæra við opnun
  }

  function clearFields() {
    amountInput.value = '';
    receiverInput.value = '';
    fillLine.textContent = 'Fylling0 kr';
    pA.textContent = 'Aðili A0 kr';
    pB.textContent = 'Aðili B0 kr';
    pC.textContent = 'Aðili C0 kr';
    sumPaid.textContent = 'Samtals greitt0 kr';
    sumToAcct.textContent = 'Fæst á reikning0 kr';
    estDai.textContent = 'Áætlað DAI0.00 DAI';
  }

  function closeModal() {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    clearFields();
  }

  // === Events for open/close ===
  openBtn?.addEventListener('click', openModal);
  cancelBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // === Quick amount buttons ===
  quickBox?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-amt]');
    if (!btn) return;
    const raw = Number(btn.getAttribute('data-amt'));
    amountInput.value = fmt(raw);
    calc();
  });

  // === Format input (thousands dots) & recalc ===
  function unfmt(val) {
    return Number(String(val).replace(/[^\d]/g, '')) || 0;
  }
  amountInput?.addEventListener('input', () => {
    const raw = unfmt(amountInput.value);
    amountInput.value = raw ? fmt(raw) : '';
    calc();
  });

  // === Main calculation from ENV fees ===
  function calc() {
    const raw = unfmt(amountInput.value);
    const aPct = Number(ENV.PROVIDER_A_PCT || 0) / 100;
    const bPct = Number(ENV.PROVIDER_B_PCT || 0) / 100;
    const cPct = Number(ENV.PROVIDER_C_PCT || 0) / 100;

    const aFix = Number(ENV.PROVIDER_A_FIXED || 0);
    const bFix = Number(ENV.PROVIDER_B_FIXED || 0);
    const cFix = Number(ENV.PROVIDER_C_FIXED || 0);

    const feeA = Math.round(raw * aPct + aFix);
    const feeB = Math.round(raw * bPct + bFix);
    const feeC = Math.round(raw * cPct + cFix);
    const total = raw + feeA + feeB + feeC;

    const daiRate = Number(ENV.DAI_ISK_RATE || 140);
    const est = raw > 0 ? (raw / daiRate) : 0;

    fillLine.textContent = `Fylling${fmt(raw)} kr`;
    pA.textContent = `${ENV.PROVIDER_A_NAME || 'Aðili A'}${fmt(feeA)} kr`;
    pB.textContent = `${ENV.PROVIDER_B_NAME || 'Aðili B'}${fmt(feeB)} kr`;
    pC.textContent = `${ENV.PROVIDER_C_NAME || 'Aðili C'}${fmt(feeC)} kr`;
    sumPaid.textContent = `Samtals greitt${fmt(total)} kr`;
    sumToAcct.textContent = `Fæst á reikning${fmt(raw)} kr`;
    estDai.textContent = `Áætlað DAI${est.toFixed(2)} DAI`;
  }

  // run once on load to show 0 lines
  calc();

  // === QR button (placeholder) ===
  scanQrBtn?.addEventListener('click', () => {
    alert('QR skanni kemur næst (camera permission + decode).');
  });

  // === Pay with card (demo call to backend) ===
  payBtn?.addEventListener('click', async () => {
    const amt = unfmt(amountInput.value);
    const recv = (receiverInput.value || '').trim();
    if (!amt || !recv) { alert('Vantar upphæð og móttakanda'); return; }

    try {
      const u = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
      const r = await fetch('/api/topup', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ amountISK: amt, receiver: recv, walletId: u.wallet_id || 'burner_local' })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Villa í top-up');
      alert('Færsla stofnuð (demo): ' + (j.route || ''));
      closeModal();
    } catch (err) {
      alert('Tókst ekki: ' + (err?.message || err));
    }
  });

  // === Header welcome data (demo) ===
  const user = JSON.parse(localStorage.getItem('stealthpay_user') || '{}');
  if (user?.name) $('welcome').textContent = `Velkominn aftur, ${user.name}`;
  $('acctLine').textContent = `Hvað er staðan á reikningnum þínum í dag?\nReikningur: 0x12…89AB`;
  $('totalBalance').textContent = fmt(1487950) + ' kr';
})();
