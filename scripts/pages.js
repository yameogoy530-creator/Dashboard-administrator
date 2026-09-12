const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('openSidebar')?.addEventListener('click', () => app.classList.add('sidebar-open'));
document.getElementById('closeSidebar')?.addEventListener('click', () => app.classList.remove('sidebar-open'));
overlay?.addEventListener('click', () => app.classList.remove('sidebar-open'));

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeIcon) themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
  localStorage.setItem('dashboard-theme', theme);
}
const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
applyTheme(savedTheme);
themeToggle?.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

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

normalizeDollarDisplays();

const currentPage = location.pathname.split('/').pop().replace('.html', '') || 'index';
document.querySelectorAll('.nav-link[data-page]').forEach(link => {
  link.classList.toggle('active', link.dataset.page === (currentPage === 'index' ? 'dashboard' : currentPage));
  link.addEventListener('click', () => app.classList.remove('sidebar-open'));
});

document.querySelectorAll('.chip:not(.chip-outline)').forEach(chip => chip.addEventListener('click', () => {
  chip.parentElement.querySelector('.chip.active')?.classList.remove('active');
  chip.classList.add('active');
}));
