// auth.js – minimal demo: vistar "notanda" í localStorage
(function () {
  const $ = id => document.getElementById(id);
  const name = $('name'), pw = $('pw'), pw2 = $('pw2'), submit = $('submit');

  submit?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!name.value || !pw.value || pw.value !== pw2.value || pw.value.length < 8) return;

    // Demo: vista basic notanda – skiptu seinna út fyrir bakenda kall
    const user = { name: name.value.trim(), createdAt: Date.now(), tier: 'amatör' };
    localStorage.setItem('stealthpay_user', JSON.stringify(user));

    // Áfram á forsíðu/dash
    window.location.href = 'dashboard.html';
  });
})();
