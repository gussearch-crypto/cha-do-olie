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
  if (c.today) {
    return `Olá, ${name}! 💛\n\nÉ hoje! 🎉\n\nChegou o dia do Chá do Oliver! Estamos muito felizes e esperando vocês para celebrar esse momento tão especial com a gente.\n\n🕕 Das 18h às 22h\n📍 Salão Terra Mágica\n\nConvite e informações:\nhttps://cha-oliver-mvp.vercel.app/\n\nAté daqui a pouco! 💛🦁🐼🦒🐓`;
  }
  return `Olá, ${name}! 💛\n\n${c.label} para o Chá do Oliver! 🎉\n\nPassando para lembrar do nosso encontro especial para celebrar a chegada do Oliver.\n\n📅 04 de dezembro de 2026\n🕕 Das 18h às 22h\n📍 Salão Terra Mágica\n\nConvite e confirmação de presença:\nhttps://cha-oliver-mvp.vercel.app/\n\nEstamos esperando vocês com muito carinho! 💛🦁🐼🦒🐓`;
}

function addStyles() {
  if (document.getElementById('admin-countdown-style')) return;
  const style = document.createElement('style');
  style.id = 'admin-countdown-style';
  style.textContent = `
    .countdownCard{background:#667641;color:#fffaf0;border-radius:22px;padding:20px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .countdownCard small{display:block;font-size:.68rem;letter-spacing:.14em;font-weight:700;color:#e9dfbc;margin-bottom:5px}.countdownCard strong{display:block;font-size:1.65rem}.countdownCard span{font-size:.82rem;color:#e9e5d4}
    .guestRow.hasReminder{grid-template-columns:72px 1fr auto;align-items:center}
    .guestRow.hasReminder .reminderAction{grid-column:3;justify-self:stretch;width:100%;box-sizing:border-box;border-top:1px solid #ded2ad;margin-top:0;padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .reminderAction .reminderInfo{font-size:.76rem;color:#747762;white-space:nowrap}.reminderAction button{min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #cfc5a7;background:#fffaf0;color:#45532d;border-radius:12px;padding:0 16px;font:600 .88rem 'DM Sans',sans-serif;cursor:pointer;white-space:nowrap}.reminderAction button:hover{background:#f5f0e4}.reminderAction button svg{width:16px;height:16px}
    @media(max-width:1050px){.guestRow.hasReminder .reminderAction{grid-column:1/-1}.reminderAction .reminderInfo{white-space:normal}}
    @media(max-width:700px){.countdownCard{align-items:flex-start;flex-direction:column}.guestRow.hasReminder .reminderAction{align-items:stretch;flex-direction:column}.reminderAction button{width:100%}}
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
  row.classList.add('hasReminder');
  const bar = document.createElement('div');
  bar.className = 'reminderAction';
  bar.innerHTML = `<span class="reminderInfo">${c.today ? 'Lembrete · É hoje!' : `Lembrete · ${c.label}`}</span><button type="button" aria-label="Copiar lembrete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg> Copiar lembrete</button>`;
  bar.querySelector('button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(reminderText(name));
      const btn = bar.querySelector('button');
      const original = btn.innerHTML;
      btn.innerHTML = '✓ Lembrete copiado';
      setTimeout(() => btn.innerHTML = original, 1800);
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
