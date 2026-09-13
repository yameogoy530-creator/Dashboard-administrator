/* =========================================================
   DATA
   ========================================================= */
const orders = [
  { name: "Casque Sans Fil Pro",      num: "#ORD-4821", status: "paid",    delivery: "Livré",      date: "22 août" },
  { name: "Clavier Mécanique RGB",    num: "#ORD-4822", status: "pending", delivery: "En transit", date: "23 août" },
  { name: "Souris Ergonomique",       num: "#ORD-4823", status: "failed",  delivery: "Annulé",     date: "23 août" },
  { name: "Écran 27\" 144Hz",         num: "#ORD-4824", status: "paid",    delivery: "Livré",      date: "24 août" },
  { name: "Webcam 4K",                num: "#ORD-4825", status: "pending", delivery: "Préparation",date: "25 août" },
  { name: "Support Ordinateur",       num: "#ORD-4826", status: "paid",    delivery: "Livré",      date: "25 août" },
  { name: "Micro USB Studio",         num: "#ORD-4827", status: "failed",  delivery: "Annulé",     date: "26 août" },
];

const updates = [
  { text: "Amina K. a passé une nouvelle commande.",      time: "il y a 4 min" },
  { text: "Stock faible sur « Casque Sans Fil Pro ».",     time: "il y a 22 min" },
  { text: "Paiement reçu pour la commande #ORD-4824.",     time: "il y a 1 h" },
  { text: "Nouveau client inscrit : Rasmané T.",           time: "il y a 2 h" },
];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeText(value, maxLength = 100) {
  return escapeHtml(String(value ?? '').trim()).slice(0, maxLength);
}

function normalizeDollarDisplays() {
  const amountPattern = /\$([\d, ]+(?:[.,]\d{2})?)/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => {
    node.nodeValue = node.nodeValue.replace(amountPattern, (_, amount) => {
      const numericAmount = Number(amount.replace(/ /g, '').replace(/,(?=\d{3})/g, '').replace(',', '.'));
      return `${Math.round(numericAmount * 1000).toLocaleString('fr-FR')} FCFA`;
    }).replace(/Prix \(USD\)/g, 'Prix (FCFA)');
  });
}

/* =========================================================
   SIDEBAR (mobile)
   ========================================================= */
const app = document.getElementById('app');
document.getElementById('openSidebar').addEventListener('click', () => app.classList.add('sidebar-open'));
document.getElementById('closeSidebar').addEventListener('click', () => app.classList.remove('sidebar-open'));
document.getElementById('overlay').addEventListener('click', () => app.classList.remove('sidebar-open'));

/* =========================================================
   VIEW ROUTER — hash navigation keeps the app refresh-friendly
   ========================================================= */
const pageLinks = document.querySelectorAll('.nav-link[data-page]');
const pageViews = document.querySelectorAll('.page-view');

function showPage(page = 'dashboard') {
  const allowedPage = [...pageLinks].some(link => link.dataset.page === page && !link.classList.contains('role-hidden')) ? page : 'dashboard';
  pageViews.forEach(view => view.classList.toggle('active', view.dataset.view === allowedPage));
  pageLinks.forEach(link => link.classList.toggle('active', link.dataset.page === allowedPage));
  app.classList.toggle('has-secondary-panel', allowedPage === 'dashboard');
  document.title = `${allowedPage[0].toUpperCase()}${allowedPage.slice(1)} — Panel`;
  app.classList.remove('sidebar-open');
}

pageLinks.forEach(link => link.addEventListener('click', () => showPage(link.dataset.page)));
window.addEventListener('hashchange', () => showPage(window.location.hash.slice(1)));
showPage(window.location.hash.slice(1) || 'dashboard');

/* =========================================================
   THEME TOGGLE (persisted in localStorage)
   ========================================================= */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
  localStorage.setItem('dashboard-theme', theme);
}

const savedTheme = localStorage.getItem('dashboard-theme') ||
  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(current);
});

/* =========================================================
   ORDERS TABLE — skeleton loading, render, search, filter, pagination
   ========================================================= */
const ordersBody = document.getElementById('ordersBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('orderSearch');
const paginationEl = document.getElementById('pagination');
const PAGE_SIZE = 4;
let activeFilter = 'all';
let currentPage = 1;
let ordersLoaded = false;

function renderSkeleton(rows = 4) {
  ordersBody.innerHTML = Array.from({ length: rows }).map(() => `
    <tr class="skeleton-row">
      <td><span class="skeleton skeleton-line" style="width:80%"></span></td>
      <td><span class="skeleton skeleton-line" style="width:60%"></span></td>
      <td><span class="skeleton skeleton-line" style="width:50%"></span></td>
      <td><span class="skeleton skeleton-line" style="width:55%"></span></td>
      <td><span class="skeleton skeleton-line" style="width:24px"></span></td>
    </tr>
  `).join('');
}

function statusLabel(status) {
  return { paid: 'Payé', pending: 'En attente', failed: 'Échoué' }[status] || status;
}

function renderOrders() {
  const query = sanitizeText(searchInput.value, 80).toLowerCase();
  const filtered = orders.filter(o => {
    const safeName = sanitizeText(o.name, 80).toLowerCase();
    const safeNum = sanitizeText(o.num, 80).toLowerCase();
    const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
    const matchesQuery = safeName.includes(query) || safeNum.includes(query);
    return matchesFilter && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  ordersBody.innerHTML = pageItems.map(o => `
    <tr>
      <td>${sanitizeText(o.name, 80)}</td>
      <td class="prod-num">${sanitizeText(o.num, 30)}</td>
      <td><span class="badge ${sanitizeText(o.status, 20)}">${sanitizeText(statusLabel(o.status), 20)}</span></td>
      <td>${sanitizeText(o.delivery, 30)}</td>
      <td><button class="details-btn" aria-label="Voir les détails"><span class="material-icons-sharp">chevron_right</span></button></td>
    </tr>
  `).join('');

  emptyState.hidden = filtered.length !== 0;
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
  let html = `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  paginationEl.innerHTML = html;
}

paginationEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.page-btn');
  if (!btn || btn.disabled) return;
  if (btn.dataset.page === 'prev') currentPage--;
  else if (btn.dataset.page === 'next') currentPage++;
  else currentPage = Number(btn.dataset.page);
  renderOrders();
});

searchInput.addEventListener('input', () => { currentPage = 1; renderOrders(); });

document.querySelectorAll('.filters .chip[data-filter]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelector('.filters .chip[data-filter].active')?.classList.remove('active');
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    currentPage = 1;
    renderOrders();
  });
});

// Simulate a short fetch so the skeleton loader is visible on first load
renderSkeleton();
setTimeout(() => { ordersLoaded = true; renderOrders(); }, 600);

/* =========================================================
   CSV EXPORT
   ========================================================= */
document.getElementById('exportCsv').addEventListener('click', () => {
  const header = ['Nom du produit', 'Numéro du produit', 'Statut du paiement', 'Livraison'];
  const rows = orders.map(o => [o.name, o.num, statusLabel(o.status), o.delivery]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'commandes-recentes.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export CSV téléchargé');
});

/* =========================================================
   RECENT UPDATES — render
   ========================================================= */
document.getElementById('updatesList').innerHTML = updates.map(u => `
  <li class="update-item">
    <span class="update-dot"></span>
    <div>
      <p>${sanitizeText(u.text, 120)}</p>
      <span>${sanitizeText(u.time, 40)}</span>
    </div>
  </li>
`).join('');

/* =========================================================
   KPI RINGS — animate stroke on load
   ========================================================= */
const CIRCUMFERENCE = 2 * Math.PI * 34; // r = 34

document.querySelectorAll('.kpi-ring').forEach(ring => {
  const value = Number(ring.dataset.value);
  const fill = ring.querySelector('.ring-fill');
  fill.style.strokeDasharray = CIRCUMFERENCE;
  fill.style.strokeDashoffset = CIRCUMFERENCE;
  requestAnimationFrame(() => {
    const offset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;
    fill.style.strokeDashoffset = offset;
  });
});

/* =========================================================
   LIVE CLOCK
   ========================================================= */
const clockEl = document.getElementById('clock');
function tickClock() {
  clockEl.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
tickClock();
setInterval(tickClock, 1000);

/* =========================================================
   TOAST
   ========================================================= */
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => { toastEl.hidden = true; }, 250);
  }, 2500);
}

/* =========================================================
   ADD PRODUCT MODAL
   ========================================================= */
const modalOverlay = document.getElementById('modalOverlay');
const productForm = document.getElementById('productForm');

function openModal() {
  modalOverlay.hidden = false;
  productForm.querySelector('input[name="name"]').focus();
}
function closeModal() {
  modalOverlay.hidden = true;
  productForm.reset();
}

document.getElementById('addProductBtn').addEventListener('click', openModal);
document.getElementById('productsPageAdd')?.addEventListener('click', openModal);
document.getElementById('navAddProduct').addEventListener('click', (e) => { e.preventDefault(); openModal(); });
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalOverlay.hidden) closeModal(); });

productForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(productForm);
  const rawName = String(data.get('name') ?? '').trim();
  const price = Number(data.get('price'));
  const stock = Number(data.get('stock'));

  if (!rawName || rawName.length > 60 || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
    showToast('Données du produit invalides');
    return;
  }

  const safeName = sanitizeText(rawName, 60);
  orders.unshift({
    name: safeName,
    num: `#ORD-${Math.floor(Math.random() * 9000 + 1000)}`,
    status: 'pending',
    delivery: 'Préparation',
    date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  });

  closeModal();
  renderOrders();
  showToast(`« ${safeName} » ajouté au catalogue`);
});

/* =========================================================
   ROLE SWITCH — hides admin-only nav links for "vendeur"
   ========================================================= */
const roleSelect = document.getElementById('roleSelect');
function applyRole(role) {
  document.querySelectorAll('.nav-link[data-role]').forEach(link => {
    link.classList.toggle('role-hidden', link.dataset.role !== role && role !== 'admin');
  });
}
roleSelect.addEventListener('change', () => applyRole(roleSelect.value));
applyRole(roleSelect.value);

/* =========================================================
   SALES TREND CHART (Chart.js)
   ========================================================= */
const salesData = {
  7:  { labels: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
        values: [3200, 4100, 3800, 5200, 4700, 6100, 5400] },
  30: { labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
        values: Array.from({ length: 30 }, () => Math.round(2800 + Math.random() * 4200)) },
};

function renderChart(range) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim();
  const gridColor = styles.getPropertyValue('--border').trim();
  const textColor = styles.getPropertyValue('--text-secondary').trim();
  const { labels, values } = salesData[range];

  const width = ctx.clientWidth || 600;
  const height = ctx.clientHeight || 220;
  const ratio = window.devicePixelRatio || 1;
  const context = ctx.getContext('2d');
  const padding = { top: 12, right: 12, bottom: 28, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maximum = Math.ceil(Math.max(...values) / 1000) * 1000;

  ctx.width = width * ratio;
  ctx.height = height * ratio;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  context.font = '10px JetBrains Mono, monospace';
  context.fillStyle = textColor;
  context.strokeStyle = gridColor;
  context.lineWidth = 1;

  for (let step = 0; step <= 4; step++) {
    const y = padding.top + (plotHeight / 4) * step;
    const value = maximum - (maximum / 4) * step;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(`${Math.round(value / 1000)}k FCFA`, 4, y + 3);
  }

  const points = values.map((value, index) => ({
    x: padding.left + (plotWidth * index) / Math.max(values.length - 1, 1),
    y: padding.top + plotHeight - (value / maximum) * plotHeight,
  }));

  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.lineTo(points[points.length - 1].x, height - padding.bottom);
  context.lineTo(points[0].x, height - padding.bottom);
  context.closePath();
  context.fillStyle = `${accent}26`;
  context.fill();

  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = textColor;
  context.font = '11px Inter, sans-serif';
  const labelStep = Math.max(1, Math.ceil(labels.length / 7));
  labels.forEach((label, index) => {
    if (index % labelStep !== 0 && index !== labels.length - 1) return;
    context.fillText(label, points[index].x - 8, height - 8);
  });
}

document.querySelectorAll('.chip[data-range]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelector('.chip[data-range].active')?.classList.remove('active');
    chip.classList.add('active');
    renderChart(Number(chip.dataset.range));
  });
});

window.addEventListener('load', () => renderChart(7));
window.addEventListener('load', normalizeDollarDisplays);
// Re-render chart with correct colors whenever the theme changes
themeToggle.addEventListener('click', () => {
  const range = document.querySelector('.chip[data-range].active')?.dataset.range || 7;
  setTimeout(() => renderChart(Number(range)), 50);
});

// Re-render chart on resize / rotation so it stays sized to its container
// (fixes horizontal overflow caused by devicePixelRatio on mobile screens)
let chartResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(chartResizeTimer);
  chartResizeTimer = setTimeout(() => {
    const range = document.querySelector('.chip[data-range].active')?.dataset.range || 7;
    renderChart(Number(range));
  }, 150);
});
