// ==================== AUTH CONFIG ====================
const _0x4a = 'b94eda2bda7846b43cb86dfa6ad92a68ffda227a450ae8a2f17cadc913e73ed8'; // access control

// ==================== FIREBASE CONFIG ====================
// ⚠️ REPLACE WITH YOUR OWN FIREBASE CONFIG ⚠️
// Follow firebase_setup.md to create your project
const firebaseConfig = {
  apiKey: "AIzaSyDuEVVGXB3PWPBdpupuhMcBhSn1HDKWRuY",
  authDomain: "misagi-deudas.firebaseapp.com",
  databaseURL: "https://misagi-deudas-default-rtdb.firebaseio.com",
  projectId: "misagi-deudas",
  storageBucket: "misagi-deudas.firebasestorage.app",
  messagingSenderId: "142287980224",
  appId: "1:142287980224:web:09c148d2c46e2d5e740f25"
};


// ==================== STATE ====================
let debts = [];
let payments = [];
let debtChart = null, paymentChart = null;
let editingDebtId = null;
let db = null;
let isFirebaseReady = false;

// ==================== AUTH ====================
async function hashPassword(pw) {
    const enc = new TextEncoder().encode(pw);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function togglePasswordVisibility() {
    const inp = document.getElementById('loginPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function handleLogin(e) {
    e.preventDefault();
    const pw = document.getElementById('loginPassword').value;
    const hash = await hashPassword(pw);
    if (hash === _0x4a) {
        sessionStorage.setItem('_mauth', '1');
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainContent').style.display = '';
        initApp();
    } else {
        const err = document.getElementById('loginError');
        err.textContent = 'Contraseña incorrecta';
        const card = document.querySelector('.login-card');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
    }
}

function checkAuth() {
    if (sessionStorage.getItem('_mauth') === '1') {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainContent').style.display = '';
        initApp();
    }
}

// ==================== FIREBASE / STORAGE ====================
function initFirebase() {
    try {
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn('Firebase not configured. Using localStorage fallback.');
            isFirebaseReady = false;
            updateSyncStatus('Local (sin sync)');
            return;
        }
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        isFirebaseReady = true;
        updateSyncStatus('Conectado ✓');
        // Listen for real-time changes
        db.ref('debts').on('value', snap => {
            const data = snap.val();
            if (data) {
                debts = data;
                renderAll();
            }
        });
        db.ref('payments').on('value', snap => {
            const data = snap.val();
            payments = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            renderAll();
        });
    } catch (err) {
        console.warn('Firebase init failed, using localStorage:', err);
        isFirebaseReady = false;
        updateSyncStatus('Local (sin sync)');
    }
}

function updateSyncStatus(text) {
    const el = document.getElementById('syncStatus');
    if (el) el.textContent = text;
}

function loadState() {
    const saved = localStorage.getItem('misagi_debts_v2');
    debts = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_DEBTS));
    payments = JSON.parse(localStorage.getItem('misagi_payments_v2') || '[]');
}

function saveDebts() {
    localStorage.setItem('misagi_debts_v2', JSON.stringify(debts));
    if (isFirebaseReady && db) {
        db.ref('debts').set(debts).catch(err => console.warn('Firebase save debts error:', err));
    }
}

function savePayments() {
    localStorage.setItem('misagi_payments_v2', JSON.stringify(payments));
    if (isFirebaseReady && db) {
        db.ref('payments').set(payments).catch(err => console.warn('Firebase save payments error:', err));
    }
}

// ==================== HELPERS ====================
function fmt(n) { return '$' + Math.round(n).toLocaleString('es-PE'); }
function fmtDate(d) {
    if (!d) return '—';
    const [y, m] = d.split('-');
    return MONTH_NAMES[parseInt(m) - 1] + ' ' + y;
}
function getCurrentMonth() {
    const n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}
function computeEndDate(startDate, months) {
    const [y, m] = startDate.split('-').map(Number);
    const total = m + months - 1;
    const ey = y + Math.floor((total - 1) / 12);
    const em = ((total - 1) % 12) + 1;
    return ey + '-' + String(em).padStart(2, '0');
}
function getDebtById(id) { return debts.find(d => d.id === id || d.id === String(id)); }
function getColor(i) { return COLORS[i % COLORS.length]; }

function computeTotals() {
    let ti = 0, tc = 0, tp = 0, mm = 0;
    debts.forEach(d => { ti += d.initialAmount; tc += d.currentBalance; tp += d.totalPaid || 0; mm += d.monthlyPayment; });
    payments.forEach(p => { tp += p.amount; tc -= p.amount; });
    return { totalInitial: ti, totalCurrent: Math.max(0, tc), totalPaid: tp, minMonthly: mm };
}
function getLatestEnd() {
    let latest = '2026-01';
    debts.forEach(d => { if (d.endDate && d.endDate > latest) latest = d.endDate; });
    return latest;
}

// ==================== NAVIGATION ====================
let currentPage = 'overview';
function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    if (page === 'overview') renderOverview();
    else if (page === 'debts') renderDebtsPage();
    else if (page === 'schedule') renderSchedulePage();
    else if (page === 'payments') renderPaymentsPage();
    window.scrollTo(0, 0);
}
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ==================== MODALS ====================
function openModal(name) {
    document.getElementById('modal-' + name).classList.add('open');
    if (name === 'registerPayment') populatePaySelect();
    if (name === 'addDebt') document.getElementById('addDate').value = getCurrentMonth();
}
function closeModal(name) { document.getElementById('modal-' + name).classList.remove('open'); }
function closeModalOverlay(e) { if (e.target === e.currentTarget) e.target.classList.remove('open'); }

function openEditModal(id) {
    const d = getDebtById(id);
    if (!d) return;
    editingDebtId = id;
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = d.name;
    document.getElementById('editAmount').value = d.initialAmount;
    document.getElementById('editBalance').value = d.currentBalance;
    document.getElementById('editPayment').value = d.monthlyPayment;
    document.getElementById('editTotalPaid').value = d.totalPaid || 0;
    document.getElementById('editInterest').value = d.interestAnnual || 0;
    document.getElementById('editMonths').value = d.monthsRemaining || 0;
    document.getElementById('editStartDate').value = d.startDate || '';
    document.getElementById('editEndDate').value = d.endDate || '';
    document.getElementById('editPaymentDate').value = d.paymentDate || '';
    openModal('editDebt');
}

// ==================== HANDLERS ====================
function handleAddDebt(e) {
    e.preventDefault();
    const name = document.getElementById('addName').value.trim();
    const amount = parseFloat(document.getElementById('addAmount').value);
    const payment = parseFloat(document.getElementById('addPayment').value);
    const interest = parseFloat(document.getElementById('addInterest').value) || 0;
    const startDate = document.getElementById('addDate').value;
    const months = Math.ceil(amount / payment);
    const endDate = computeEndDate(startDate, months);
    debts.push({ id: 'new_' + Date.now(), name, initialAmount: amount, currentBalance: amount, monthlyPayment: payment, interestAnnual: interest, startDate, monthsRemaining: months, totalPaid: 0, endDate });
    saveDebts();
    closeModal('addDebt');
    e.target.reset();
    renderAll();
}

function handleEditDebt(e) {
    e.preventDefault();
    const d = getDebtById(editingDebtId);
    if (!d) return;
    d.name = document.getElementById('editName').value.trim();
    d.initialAmount = parseFloat(document.getElementById('editAmount').value);
    d.currentBalance = parseFloat(document.getElementById('editBalance').value);
    d.monthlyPayment = parseFloat(document.getElementById('editPayment').value);
    d.totalPaid = parseFloat(document.getElementById('editTotalPaid').value);
    d.interestAnnual = parseFloat(document.getElementById('editInterest').value) || 0;
    d.monthsRemaining = parseInt(document.getElementById('editMonths').value);
    d.startDate = document.getElementById('editStartDate').value;
    d.endDate = document.getElementById('editEndDate').value;
    d.paymentDate = document.getElementById('editPaymentDate').value || '';
    saveDebts();
    closeModal('editDebt');
    renderAll();
}

function handleDeleteDebt() {
    if (!confirm('¿Eliminar esta deuda? No se puede deshacer.')) return;
    debts = debts.filter(d => d.id !== editingDebtId && String(d.id) !== String(editingDebtId));
    saveDebts();
    closeModal('editDebt');
    renderAll();
}

function populatePaySelect() {
    const sel = document.getElementById('payDebtSelect');
    sel.innerHTML = '<option value="">— Seleccionar —</option>';
    debts.filter(d => d.currentBalance > 0).forEach(d => {
        sel.innerHTML += `<option value="${d.id}">${d.name} (${fmt(d.currentBalance)})</option>`;
    });
    document.getElementById('payDate').value = getCurrentMonth();
}

function handleRegisterPayment(e) {
    e.preventDefault();
    const debtId = document.getElementById('payDebtSelect').value;
    const amount = parseFloat(document.getElementById('payAmount').value);
    const date = document.getElementById('payDate').value;
    if (!debtId) return;
    const d = getDebtById(debtId.includes('new_') ? debtId : parseInt(debtId));
    payments.push({ id: 'pay_' + Date.now(), debtId: d ? d.id : debtId, debtName: d ? d.name : '', amount, date, timestamp: Date.now() });
    if (d) {
        d.currentBalance = Math.max(0, d.currentBalance - amount);
        d.totalPaid = (d.totalPaid || 0) + amount;
        if (d.monthlyPayment > 0) d.monthsRemaining = Math.max(0, Math.ceil(d.currentBalance / d.monthlyPayment));
        saveDebts();
    }
    savePayments();
    closeModal('registerPayment');
    e.target.reset();
    renderAll();
}

function deletePayment(payId) {
    if (!confirm('¿Eliminar este pago?')) return;
    const p = payments.find(x => x.id === payId);
    if (p) {
        const d = getDebtById(p.debtId);
        if (d) {
            d.currentBalance += p.amount;
            d.totalPaid = Math.max(0, (d.totalPaid || 0) - p.amount);
            if (d.monthlyPayment > 0) d.monthsRemaining = Math.ceil(d.currentBalance / d.monthlyPayment);
            saveDebts();
        }
    }
    payments = payments.filter(x => x.id !== payId);
    savePayments();
    renderAll();
}

// ==================== RENDER: OVERVIEW ====================
function renderOverview() {
    const t = computeTotals();
    document.getElementById('kpiInitial').textContent = fmt(t.totalInitial);
    document.getElementById('kpiCurrent').textContent = fmt(t.totalCurrent);
    document.getElementById('kpiPaid').textContent = fmt(t.totalPaid);
    document.getElementById('kpiMonthly').textContent = fmt(t.minMonthly);
    document.getElementById('kpiInitialSub').textContent = debts.length + ' deudas registradas';
    document.getElementById('kpiCurrentSub').textContent = debts.filter(d => d.currentBalance > 0).length + ' deudas activas';
    document.getElementById('kpiPaidSub').textContent = t.totalInitial > 0 ? (t.totalPaid / t.totalInitial * 100).toFixed(1) + '% del total' : '0%';
    document.getElementById('kpiMonthlySub').textContent = 'Pago combinado de todas';
    const pct = t.totalInitial > 0 ? (t.totalPaid / t.totalInitial * 100) : 0;
    document.getElementById('progressPct').textContent = pct.toFixed(1) + '%';
    document.getElementById('progressFill').style.width = Math.min(pct, 100) + '%';
    document.getElementById('progressPaid').textContent = fmt(t.totalPaid) + ' pagado';
    document.getElementById('progressRemaining').textContent = fmt(t.totalCurrent) + ' restante';
    document.getElementById('pillFreeDate').innerHTML = '🎯 Libre: <strong>' + fmtDate(getLatestEnd()) + '</strong>';
    renderDebtEvolutionChart();
    renderPaymentChart();
    renderTimeline();
    renderMiniGrid();
}

function renderDebtEvolutionChart() {
    const labels = [], values = [];
    SCHEDULE_MONTHS.forEach((m, i) => {
        let total = 0;
        for (let dId = 0; dId <= 13; dId++) total += (SCHEDULE_BALANCES[dId] && SCHEDULE_BALANCES[dId][i]) || 0;
        labels.push(fmtDate(m.date));
        values.push(total);
    });
    const ctx = document.getElementById('debtChart').getContext('2d');
    if (debtChart) debtChart.destroy();
    debtChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Balance Total', data: values, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.06)', fill: true, tension: .3, pointRadius: 2.5, pointBackgroundColor: '#3b82f6', borderWidth: 2.5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#12151f', titleColor: '#e8eaf0', bodyColor: '#9ca3b8', borderColor: '#1e2235', borderWidth: 1, cornerRadius: 8, callbacks: { label: c => fmt(c.parsed.y) } } }, scales: { x: { ticks: { color: '#6b7280', font: { size: 9 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { ticks: { color: '#6b7280', font: { size: 9 }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.03)' } } }, interaction: { intersect: false, mode: 'index' } }
    });
}

function renderPaymentChart() {
    const labels = [], values = [];
    SCHEDULE_MONTHS.forEach((m, i) => {
        if (i === 0) return;
        let total = 0;
        for (let dId = 0; dId <= 13; dId++) total += (SCHEDULE_PAYMENTS[dId] && SCHEDULE_PAYMENTS[dId][i]) || 0;
        labels.push(fmtDate(m.date));
        values.push(total);
    });
    const ctx = document.getElementById('paymentChart').getContext('2d');
    if (paymentChart) paymentChart.destroy();
    const cur = getCurrentMonth();
    const curIdx = SCHEDULE_MONTHS.findIndex(m => m.date >= cur) - 1;
    const bg = values.map((_, i) => i < curIdx ? 'rgba(16,185,129,0.55)' : 'rgba(99,102,241,0.45)');
    paymentChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Pago Total', data: values, backgroundColor: bg, borderRadius: 4, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#12151f', titleColor: '#e8eaf0', bodyColor: '#9ca3b8', borderColor: '#1e2235', borderWidth: 1, cornerRadius: 8, callbacks: { label: c => fmt(c.parsed.y) } } }, scales: { x: { ticks: { color: '#6b7280', font: { size: 9 }, maxRotation: 45 }, grid: { display: false } }, y: { ticks: { color: '#6b7280', font: { size: 9 }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.03)' } } } }
    });
}

function renderTimeline() {
    const sorted = [...debts].filter(d => d.endDate).sort((a, b) => a.endDate.localeCompare(b.endDate));
    const cur = getCurrentMonth();
    document.getElementById('timeline').innerHTML = sorted.map(d => {
        const status = d.currentBalance <= 0 ? 'done' : (d.endDate <= cur ? 'done' : 'active');
        return `<div class="timeline-item"><div class="timeline-label">${d.name}</div><div class="timeline-date">${fmtDate(d.endDate)}</div><div class="timeline-dot ${status}"></div><div class="timeline-amount">${fmt(d.initialAmount)}</div></div>`;
    }).join('');
}

function renderMiniGrid() {
    document.getElementById('miniDebtGrid').innerHTML = debts.map((d, i) => {
        const pct = d.initialAmount > 0 ? ((d.totalPaid || 0) / d.initialAmount * 100) : 0;
        const c = getColor(i);
        return `<div class="mini-card" style="--mc-color:${c}" onclick="navigateTo('debts')"><div class="mini-card-name">${d.name}</div><div class="mini-card-amt">${fmt(d.currentBalance)}</div><div class="mini-card-bar"><div class="mini-card-bar-fill" style="width:${Math.min(pct, 100)}%;background:${c}"></div></div><div class="mini-card-pct">${pct.toFixed(1)}% pagado</div></div>`;
    }).join('');
}

// ==================== RENDER: DEBTS PAGE ====================
function renderDebtsPage() {
    document.getElementById('debtFullGrid').innerHTML = debts.map((d, i) => {
        const pct = d.initialAmount > 0 ? ((d.totalPaid || 0) / d.initialAmount * 100) : 0;
        const isPaid = d.currentBalance <= 0;
        const c = getColor(i);
        const idStr = typeof d.id === 'string' ? `'${d.id}'` : d.id;
        return `<div class="debt-full-card" style="--dc-color:${c};animation-delay:${i * .04}s">
            <div class="dfc-header"><span class="dfc-name">${d.name}</span><div class="dfc-actions"><button class="dfc-btn edit" onclick="openEditModal(${idStr})" title="Editar">✏️</button><button class="dfc-btn delete" onclick="editingDebtId=${idStr};handleDeleteDebt()" title="Eliminar">🗑</button></div></div>
            <span class="dfc-badge ${isPaid ? 'paid' : 'active'}">${isPaid ? '✓ Pagada' : '● Activa'}</span>
            <div class="dfc-row"><span>Deuda Inicial</span><span>${fmt(d.initialAmount)}</span></div>
            <div class="dfc-row"><span>Saldo Actual</span><span>${fmt(d.currentBalance)}</span></div>
            <div class="dfc-row"><span>Pago Mensual</span><span>${fmt(d.monthlyPayment)}</span></div>
            <div class="dfc-row"><span>Total Pagado</span><span>${fmt(d.totalPaid || 0)}</span></div>
            <div class="dfc-row"><span>Meses Restantes</span><span>${d.monthsRemaining}</span></div>
            <div class="dfc-row"><span>Interés Anual</span><span>${(d.interestAnnual || 0).toFixed(2)}%</span></div>
            <div class="dfc-progress"><div class="dfc-progress-header"><span>Progreso</span><span>${pct.toFixed(1)}%</span></div><div class="dfc-progress-track"><div class="dfc-progress-fill" style="width:${Math.min(pct, 100)}%;background:${c}"></div></div></div>
            <div class="dfc-footer">Inicio: <strong>${fmtDate(d.startDate)}</strong> → Fin: <strong>${fmtDate(d.endDate)}</strong>${d.paymentDate ? ' &nbsp;·&nbsp; 📅 Pago: <strong>' + new Date(d.paymentDate + 'T12:00:00').toLocaleDateString('es-PE', {day:'2-digit',month:'short',year:'numeric'}) + '</strong>' : ''}</div>
        </div>`;
    }).join('');
}

// ==================== RENDER: SCHEDULE ====================
function renderSchedulePage() {
    const sel = document.getElementById('scheduleSelect');
    const curVal = sel.value;
    sel.innerHTML = debts.map(d => `<option value="${d.id}" ${String(d.id) === curVal ? 'selected' : ''}>${d.name}</option>`).join('');
    renderScheduleTable();
}

function renderScheduleTable() {
    const selVal = document.getElementById('scheduleSelect').value;
    const id = selVal.includes('new_') ? selVal : parseInt(selVal);
    const d = getDebtById(id);
    if (!d) return;
    const pct = d.initialAmount > 0 ? ((d.totalPaid || 0) / d.initialAmount * 100) : 0;
    document.getElementById('scheduleSummary').innerHTML = `
        <div class="ss-card"><div class="ss-card-label">Deuda Inicial</div><div class="ss-card-value">${fmt(d.initialAmount)}</div></div>
        <div class="ss-card"><div class="ss-card-label">Saldo Actual</div><div class="ss-card-value">${fmt(d.currentBalance)}</div></div>
        <div class="ss-card"><div class="ss-card-label">Total Pagado</div><div class="ss-card-value" style="color:var(--green)">${fmt(d.totalPaid || 0)}</div></div>
        <div class="ss-card"><div class="ss-card-label">Progreso</div><div class="ss-card-value" style="color:var(--amber)">${pct.toFixed(1)}%</div></div>
        <div class="ss-card"><div class="ss-card-label">Pago Mensual</div><div class="ss-card-value">${fmt(d.monthlyPayment)}</div></div>
        <div class="ss-card"><div class="ss-card-label">Libre en</div><div class="ss-card-value" style="font-size:14px">${fmtDate(d.endDate)}</div></div>`;
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';
    const cur = getCurrentMonth();
    const numId = typeof id === 'number' ? id : -1;
    const balances = SCHEDULE_BALANCES[numId];
    const pmts = SCHEDULE_PAYMENTS[numId];
    const actual = SCHEDULE_ACTUAL[numId];
    if (!balances) {
        let bal = d.initialAmount, month = 0;
        while (bal > 0 && month < 60) {
            const pay = Math.min(d.monthlyPayment, bal);
            const [sy, sm] = d.startDate.split('-').map(Number);
            const cm = sm + month - 1;
            const cy = sy + Math.floor(cm / 12);
            const mm = (cm % 12) + 1;
            const ds = cy + '-' + String(mm).padStart(2, '0');
            const isPast = ds < cur, isCur = ds === cur;
            tbody.innerHTML += `<tr class="${isPast ? 'paid-row' : ''}"><td>Mes ${month + 1}</td><td>${fmtDate(ds)}</td><td>${fmt(bal)}</td><td>${fmt(0)}</td><td>${fmt(pay)}</td><td>—</td><td>${isCur ? '<span class="status-dot s-current"></span>Actual' : (isPast ? '<span class="status-dot s-paid"></span>Pagado' : '<span class="status-dot s-pending"></span>Pendiente')}</td></tr>`;
            bal -= pay; month++;
        }
        return;
    }
    SCHEDULE_MONTHS.forEach((m, i) => {
        const balance = balances[i] || 0, payment = pmts[i] || 0, actualPay = actual[i] || 0;
        if (balance === 0 && payment === 0 && i > 2) return;
        const hasPaid = actualPay > 0, isCurrent = m.date === cur;
        let sc = '', sd = '<span class="status-dot s-pending"></span>Pendiente';
        if (hasPaid) { sc = 'paid-row'; sd = '<span class="status-dot s-paid"></span>Pagado'; }
        else if (isCurrent) sd = '<span class="status-dot s-current"></span>Actual';
        tbody.innerHTML += `<tr class="${sc}"><td>${m.label}</td><td>${fmtDate(m.date)}</td><td>${fmt(balance)}</td><td>${fmt(0)}</td><td>${fmt(payment)}</td><td>${hasPaid ? fmt(actualPay) : '—'}</td><td>${sd}</td></tr>`;
    });
}

// ==================== RENDER: PAYMENTS ====================
function renderPaymentsPage() {
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const thisMonth = payments.filter(p => p.date === getCurrentMonth());
    document.getElementById('paymentsStats').innerHTML = `
        <div class="ss-card"><div class="ss-card-label">Pagos Registrados</div><div class="ss-card-value">${payments.length}</div></div>
        <div class="ss-card"><div class="ss-card-label">Total Pagado (extra)</div><div class="ss-card-value" style="color:var(--green)">${fmt(totalPaid)}</div></div>
        <div class="ss-card"><div class="ss-card-label">Este Mes</div><div class="ss-card-value">${fmt(thisMonth.reduce((s, p) => s + p.amount, 0))}</div></div>`;
    const tbody = document.getElementById('paymentsBody');
    const empty = document.getElementById('paymentsEmpty');
    if (payments.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = [...payments].reverse().map((p, i) => `<tr><td>${payments.length - i}</td><td>${p.debtName || p.debtId}</td><td style="color:var(--green);font-weight:600">${fmt(p.amount)}</td><td>${fmtDate(p.date)}</td><td style="color:var(--text3);font-size:11px">${new Date(p.timestamp).toLocaleString('es-PE')}</td><td><button class="btn btn-danger btn-sm btn-icon" onclick="deletePayment('${p.id}')" title="Eliminar">🗑</button></td></tr>`).join('');
}

// ==================== INIT ====================
function renderAll() {
    if (currentPage === 'overview') renderOverview();
    else if (currentPage === 'debts') renderDebtsPage();
    else if (currentPage === 'schedule') renderSchedulePage();
    else if (currentPage === 'payments') renderPaymentsPage();
}

function initApp() {
    loadState();
    initFirebase();
    navigateTo('overview');
}

document.addEventListener('DOMContentLoaded', checkAuth);
