const EVENT_AT = new Date('2026-12-04T18:00:00-03:00');
const EVENT_DAY = '2026-12-04';

function saoPauloDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function countdown() {
  const today = saoPauloDay();
  if (today === EVENT_DAY) return { label: 'É hoje!', days: 0, today: true };
  const diff = EVENT_AT.getTime() - Date.now();
  if (diff <= 0) return { label: 'O Chá do Oliver já aconteceu', days: 0, past: true };
  const days = Math.ceil(diff / 86400000);
  return { label: `Faltam ${days} dias`, days };
}

function reminderText(name) {
  const c = countdown();
  const opening = c.today ? 'É hoje! 💛' : `${c.label} para o Chá do Oliver! 💛`;
  return `Olá, ${name}! 💛\n\n${opening}\n\nPassando para lembrar do nosso encontro especial para celebrar a chegada do Oliver.\n\n📅 04 de dezembro de 2026\n🕕 Das 18h às 22h\n📍 Salão Terra Mágica\n\nConvite e confirmação de presença:\nhttps://cha-oliver-mvp.vercel.app/\n\nEstamos esperando vocês com muito carinho! 🦁🐼🦒🐓`;
}

function addStyles() {
  if (document.getElementById('admin-countdown-style')) return;
  const style = document.createElement('style');
  style.id = 'admin-countdown-style';
  style.textContent = `
    .countdownCard{background:#667641;color:#fffaf0;border-radius:22px;padding:20px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .countdownCard small{display:block;font-size:.68rem;letter-spacing:.14em;font-weight:700;color:#e9dfbc;margin-bottom:5px}.countdownCard strong{display:block;font-size:1.65rem}.countdownCard span{font-size:.82rem;color:#e9e5d4}.reminderAction{border-top:1px solid #ded2ad;margin-top:14px;padding-top:12px;display:flex;align-items:center;justify-content:flex-end;gap:12px}.reminderAction .reminderInfo{margin-right:auto;font-size:.76rem;color:#747762}.reminderAction button{min-height:42px;border:1px solid #667641;background:#667641;color:#fff;border-radius:12px;padding:0 15px;font:700 .82rem 'DM Sans',sans-serif;cursor:pointer}.reminderAction button:hover{filter:brightness(.96)}
    @media(max-width:700px){.countdownCard{align-items:flex-start;flex-direction:column}.reminderAction{align-items:stretch;flex-direction:column}.reminderAction .reminderInfo{margin-right:0}.reminderAction button{width:100%}}
  `;
  document.head.appendChild(style);
}

function mountCountdown() {
  const dashboard = document.querySelector('.dashboard');
  if (!dashboard || document.querySelector('.countdownCard')) return;
  const c = countdown();
  const card = document.createElement('section');
  card.className = 'countdownCard';
  card.innerHTML = `<div><small>CONTAGEM REGRESSIVA</small><strong>${c.label}</strong><span>Chá do Oliver · 04/12/2026 às 18h</span></div><div>💛 🦁 🐼 🦒 🐓</div>`;
  dashboard.insertAdjacentElement('afterend', card);
}

function mountReminder(row) {
  if (row.querySelector('.reminderAction')) return;
  const title = row.querySelector('.guestTitle h3');
  const actions = row.querySelector('.guestActions');
  if (!title || !actions) return;
  const name = title.textContent.trim();
  const c = countdown();
  const bar = document.createElement('div');
  bar.className = 'reminderAction';
  bar.innerHTML = `<span class="reminderInfo">Lembrete · ${c.label}</span><button type="button">⧉ Copiar lembrete</button>`;
  bar.querySelector('button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(reminderText(name));
      const btn = bar.querySelector('button');
      const original = btn.textContent;
      btn.textContent = '✓ Lembrete copiado';
      setTimeout(() => btn.textContent = original, 1800);
    } catch {
      alert('Não foi possível copiar o lembrete.');
    }
  });
  actions.insertAdjacentElement('afterend', bar);
}

function enhance() {
  addStyles();
  mountCountdown();
  document.querySelectorAll('.guestRow').forEach(mountReminder);
}

const observer = new MutationObserver(enhance);
observer.observe(document.documentElement, { childList: true, subtree: true });
enhance();
setInterval(() => { document.querySelector('.countdownCard')?.remove(); enhance(); }, 60000);
