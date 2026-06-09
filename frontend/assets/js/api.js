// ── Zahab Gold v2 — API Client ────────────────────────────────
const API = (() => {
  const BASE = '/api';
  let _token = localStorage.getItem('zahab_token') || '';

  function setToken(t) { _token = t; localStorage.setItem('zahab_token', t); }
  function clearToken()  { _token = ''; localStorage.removeItem('zahab_token'); localStorage.removeItem('zahab_user'); }

  async function req(method, path, body, isForm = false) {
    const headers = { 'Authorization': 'Bearer ' + _token };
    let fetchBody;
    if (isForm) { fetchBody = body; }
    else if (body) { headers['Content-Type'] = 'application/json'; fetchBody = JSON.stringify(body); }
    const resp = await fetch(BASE + path, { method, headers, body: fetchBody });
    const data = await resp.json();
    if (!resp.ok) {
      if (resp.status === 401) { clearToken(); window.location.href = '/login.html'; }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  return {
    setToken, clearToken,
    get:    (p)    => req('GET',    p),
    post:   (p, b) => req('POST',   p, b),
    put:    (p, b) => req('PUT',    p, b),
    del:    (p)    => req('DELETE', p),
    form:   (p, b) => req('POST',   p, b, true),
    formPut:(p, b) => req('PUT',    p, b, true),

    // Auth
    login:          (email, pass) => req('POST', '/auth/login', { email, password: pass }),
    me:             ()            => req('GET',  '/auth/me'),

    // Gold
    goldRate:    ()  => req('GET',  '/gold-rate'),
    setGoldRate: (v) => req('POST', '/gold-rate', { usd_per_oz: v, source: 'manual' }),
    goldHistory: ()  => req('GET',  '/gold-rate/history'),
    liveGoldRate:()  => req('GET',  '/gold-rate/live'),

    // Currencies
    currencies:     ()       => req('GET', '/currencies'),
    updateCurrency: (c, r)   => req('PUT', `/currencies/${c}`, { rate_to_usd: r }),

    // Branches
    branches:     ()       => req('GET',  '/branches'),
    addBranch:    (b)      => req('POST', '/branches', b),
    updateBranch: (id, b)  => req('PUT',  `/branches/${id}`, b),

    // Items
    items:      (q)     => req('GET', '/items' + (q ? '?' + new URLSearchParams(q) : '')),
    item:       (id)    => req('GET', `/items/${id}`),
    addItem:    (f)     => req('POST',   '/items', f, true),
    updateItem: (id, f) => req('PUT',    `/items/${id}`, f, true),
    deleteItem: (id)    => req('DELETE', `/items/${id}`),
    categories:         ()     => req('GET',  '/items/categories/all'),
    addCategory:        (d)    => req('POST', '/items/categories', d),
    updateCategory:     (id,d) => req('PUT',  `/items/categories/${id}`, d),
    deleteCategory:     (id)   => req('DELETE',`/items/categories/${id}`),
    lowStock:           (q)    => req('GET',  '/items/low-stock' + (q ? '?'+new URLSearchParams(q) : '')),

    // Invoices
    invoices:        (q)     => req('GET',  '/invoices' + (q ? '?' + new URLSearchParams(q) : '')),
    invoice:         (id)    => req('GET',  `/invoices/${id}`),
    createInvoice:   (d)     => req('POST', '/invoices', d),
    updateInvStatus: (id, s, n) => req('PUT', `/invoices/${id}/status`, { status: s, notes: n }),

    // Orders
    orders:           (q)       => req('GET',  '/orders' + (q ? '?' + new URLSearchParams(q) : '')),
    order:            (id)      => req('GET',  `/orders/${id}`),
    createOrder:      (f)       => req('POST', '/orders', f, true),
    updateOrderStatus:(id, s, n)=> req('PUT',  `/orders/${id}/status`, { status: s, notes: n }),

    // Customers
    customers:      (q)     => req('GET',  '/customers' + (q ? '?'+new URLSearchParams(q) : '')),
    customer:       (id)    => req('GET',  `/customers/${id}`),
    addCustomer:    (d)     => req('POST', '/customers', d),
    updateCustomer: (id, d) => req('PUT',  `/customers/${id}`, d),

    // Buybacks
    buybacks:      (q)    => req('GET',  '/buybacks' + (q ? '?'+new URLSearchParams(q) : '')),
    buyback:       (id)   => req('GET',  `/buybacks/${id}`),
    createBuyback: (d)    => req('POST', '/buybacks', d),
    calcBuyback:   (d)    => req('POST', '/buybacks/calculate', d),

    // Returns
    returns:          (q)       => req('GET',  '/returns' + (q ? '?'+new URLSearchParams(q) : '')),
    return_:          (id)      => req('GET',  `/returns/${id}`),
    createReturn:     (d)       => req('POST', '/returns', d),
    updateReturnStatus:(id,s,n) => req('PUT',  `/returns/${id}/status`, { status: s, notes: n }),

    // Purchase Orders
    purchases:       (q)    => req('GET',  '/purchases' + (q ? '?'+new URLSearchParams(q) : '')),
    purchase:        (id)   => req('GET',  `/purchases/${id}`),
    createPurchase:  (d)    => req('POST', '/purchases', d),
    updatePOStatus:  (id,s) => req('PUT',  `/purchases/${id}/status`, { status: s, received_date: new Date().toISOString().split('T')[0] }),

    // Installments
    installments:    (q)         => req('GET',  '/installments' + (q ? '?'+new URLSearchParams(q) : '')),
    installment:     (id)        => req('GET',  `/installments/${id}`),
    createInstallment:(d)        => req('POST', '/installments', d),
    payInstallment:  (pid, payId, d) => req('POST', `/installments/${pid}/pay/${payId}`, d),
    overdueInstallments: ()      => req('GET',  '/installments/overdue/list'),

    // Suppliers
    suppliers:      (q)     => req('GET',  '/suppliers' + (q ? '?'+new URLSearchParams(q) : '')),
    supplier:       (id)    => req('GET',  `/suppliers/${id}`),
    addSupplier:    (d)     => req('POST', '/suppliers', d),
    updateSupplier: (id, d) => req('PUT',  `/suppliers/${id}`, d),
    deleteSupplier: (id)    => req('DELETE',`/suppliers/${id}`),

    // Making charges
    makingCharges:  (bid) => req('GET', '/making-charges' + (bid ? '?branch_id='+bid : '')),
    updateMaking:   (d)   => req('PUT', '/making-charges', d),

    // Transfers
    transfers: ()  => req('GET',  '/transfers'),
    transfer:  (d) => req('POST', '/transfers', d),

    // Reports
    salesReport:   (q)  => req('GET', '/reports/sales-summary' + (q ? '?'+new URLSearchParams(q) : '')),
    invReport:     ()   => req('GET', '/reports/inventory'),
    dashboardStats:()   => req('GET', '/dashboard/stats'),

    // Settings
    settings:    (bid) => req('GET',  '/settings' + (bid ? '?branch_id='+bid : '')),
    saveSettings:(d)   => req('POST', '/settings', d),

    // Audit log
    auditLog: (q) => req('GET', '/audit-log' + (q ? '?'+new URLSearchParams(q) : '')),

    // Held sales
    heldSales:  ()     => req('GET',    '/held-sales'),
    holdSale:   (d)    => req('POST',   '/held-sales', d),
    deleteHold: (id)   => req('DELETE', `/held-sales/${id}`),
  };
})();

// ── Karat purity ─────────────────────────────────────────────
const KARAT_PURITY = { '24K':1, '22K':22/24, '21K':21/24, '18K':18/24, '14K':14/24, '9K':9/24 };

// ── Price calculator — VAT-aware ──────────────────────────────
function calcPrice(goldUSD, karat, weightG, makingPct, currencyRateToUSD) {
  const purity  = KARAT_PURITY[karat] || (21/24);
  const rate    = currencyRateToUSD || 1;
  const perGram = (goldUSD * rate) / 31.1035 * purity;
  return perGram * weightG * (1 + makingPct / 100);
}

function calcPriceWithVat(goldUSD, karat, weightG, makingPct, currencyRateToUSD, vatPct) {
  const base = calcPrice(goldUSD, karat, weightG, makingPct, currencyRateToUSD);
  return base * (1 + (vatPct || 0) / 100);
}

// ── Format currency ───────────────────────────────────────────
function fmtCurr(val, code) {
  const dec = ['KWD','BHD','OMR'].includes(code) ? 3 : 2;
  return (code || '') + ' ' + Number(val || 0).toFixed(dec);
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'toast toast-' + type;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ── Auth guard ────────────────────────────────────────────────
function requireAuth() {
  const token = localStorage.getItem('zahab_token');
  const user  = JSON.parse(localStorage.getItem('zahab_user') || 'null');
  if (!token || !user) { window.location.href = '/login.html'; return null; }
  return user;
}

// ── Session timeout (30 min idle auto-logout) ─────────────────
let _idleTimer;
function resetIdleTimer() {
  clearTimeout(_idleTimer);
  const mins = parseInt(localStorage.getItem('zahab_timeout') || '30');
  _idleTimer = setTimeout(() => {
    if (document.getElementById('user-av')) {
      API.clearToken();
      window.location.href = '/login.html?timeout=1';
    }
  }, mins * 60 * 1000);
}
['click','keydown','mousemove','scroll','touchstart'].forEach(e => document.addEventListener(e, resetIdleTimer, { passive: true }));

// ── Confirm dialog ────────────────────────────────────────────
function confirm2(msg, title) {
  return new Promise(resolve => {
    document.getElementById('conf-title').textContent = title || 'Confirm';
    document.getElementById('conf-msg').textContent   = msg;
    document.getElementById('conf-modal').classList.add('open');
    document.getElementById('conf-yes').onclick = () => { closeModal('conf-modal'); resolve(true); };
    document.getElementById('conf-no').onclick  = () => { closeModal('conf-modal'); resolve(false); };
  });
}

// ── WhatsApp link generator ────────────────────────────────────
function openWhatsApp(phone, message) {
  if (!phone) { toast('No phone number on record', 'error'); return; }
  const clean = phone.replace(/[^0-9]/g, '');
  const url   = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// ── CSV export ────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows || !rows.length) { toast('No data to export', 'error'); return; }
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Exported to ' + filename + '.csv');
}

window.API = API;
window.calcPrice = calcPrice;
window.calcPriceWithVat = calcPriceWithVat;
window.fmtCurr = fmtCurr;
window.toast = toast;
window.requireAuth = requireAuth;
window.KARAT_PURITY = KARAT_PURITY;
window.confirm2 = confirm2;
window.openWhatsApp = openWhatsApp;
window.exportCSV = exportCSV;
