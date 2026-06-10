// Qissalar SPA — vanilla JS reader for islom.uz maqola/2396
// Routes (hash-based):
//   #/                          → home
//   #/intro                     → introduction
//   #/c/:ci                     → chapter overview (auto-jumps if single story)
//   #/c/:ci/s/:si               → story sections list
//   #/c/:ci/s/:si/p/:pi         → read one section

const app = document.getElementById('app');
const backBtn = document.getElementById('backBtn');
const topbar = document.getElementById('topbar');
const fontBtn = document.getElementById('fontBtn');

// Per-chapter visual metadata (manually curated to fit the story themes)
const CHAPTER_META = [
  { color: 'c-sky',    emoji: '🚢', subtitle: 'Нуҳ алайҳис-салом ва кема' },
  { color: 'c-green',  emoji: '🌧️', subtitle: 'Ҳуд алайҳис-салом ва Од қавми' },
  { color: 'c-rose',   emoji: '🐪', subtitle: 'Солиҳ алайҳис-салом ва Самуд қавми' },
  { color: 'c-violet', emoji: '🗿', subtitle: 'Иброҳим, Юсуф, Мусо алайҳимус-салом' },
];

// Stories within chapter 4 (and chapter 2) get prophet labels too
function storyEmoji(chapterIdx, story) {
  const t = story.title;
  if (/Юсуф|гўзал қисса/i.test(t)) return '⭐';
  if (/Канъон|Мисрга/i.test(t)) return '🌾';
  if (/Фиръавн|Мусо/i.test(t)) return '🏛️';
  if (/Иброҳим|Санам/i.test(t)) return '🔥';
  if (/Нуҳ/i.test(t)) return '🌊';
  if (/Од|Ҳуд/i.test(t)) return '🌬️';
  return CHAPTER_META[chapterIdx]?.emoji || '📖';
}

// ---------------------------------------------------------------------------

let DATA = null;
const fontSteps = ['', 'fz-l', 'fz-xl', 'fz-xxl'];
let fontStep = parseInt(localStorage.getItem('qissalar.fontStep') || '0', 10);
applyFont();

fontBtn.addEventListener('click', () => {
  fontStep = (fontStep + 1) % fontSteps.length;
  localStorage.setItem('qissalar.fontStep', String(fontStep));
  applyFont();
});

function applyFont() {
  fontSteps.forEach(c => c && document.body.classList.remove(c));
  if (fontSteps[fontStep]) document.body.classList.add(fontSteps[fontStep]);
}

backBtn.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else go('#/');
});

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', load);

async function load() {
  app.innerHTML = `<div class="loading"><div class="spinner"></div>Юкланмоқда…</div>`;
  try {
    const res = await fetch('qissalar.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
    render();
  } catch (e) {
    app.innerHTML = `<div class="loading" style="color:#b00">Хатолик: ${escape(e.message)}<br><br>qissalar.json юкланмади.</div>`;
  }
}

function go(hash) {
  if (location.hash !== hash) location.hash = hash;
  else render();
}

function parseRoute() {
  const h = (location.hash || '#/').slice(1);
  const parts = h.split('/').filter(Boolean);
  return parts; // e.g. ['c','0','s','1','p','3']
}

function render() {
  if (!DATA) return;
  const p = parseRoute();

  if (p.length === 0) return renderHome();
  if (p[0] === 'intro') return renderIntro();

  if (p[0] === 'c') {
    const ci = +p[1];
    const chapter = DATA.chapters[ci];
    if (!chapter) return renderHome();

    if (p[2] === 's') {
      const si = +p[3];
      const story = chapter.stories[si];
      if (!story) return renderChapter(ci);

      if (p[4] === 'p') {
        const pi = +p[5];
        return renderRead(ci, si, pi);
      }
      return renderStory(ci, si);
    }
    return renderChapter(ci);
  }
  renderHome();
}

// ---------------------------------------------------------------------------
// Pages

function renderHome() {
  topbar.classList.add('no-back');
  scrollTop();
  app.innerHTML = `
    <section class="hero">
      <h1>${escape(DATA.title)}</h1>
      <p class="subtitle">Болалар учун ёзилган пайғамбарлар тарихи</p>
      <p class="author">— ${escape(DATA.author)}</p>
    </section>

    <a class="intro-card" href="#/intro">
      <span class="ico">✨</span>
      <div>
        <div class="lbl">Муқаддима</div>
        <div class="desc">Муаллифдан болаларга мурожаат</div>
      </div>
    </a>

    <ul class="chapter-list">
      ${DATA.chapters.map((ch, i) => {
        const meta = CHAPTER_META[i] || { color: 'c-gold', emoji: '📖', subtitle: '' };
        const storyCount = ch.stories.length;
        const sectionCount = ch.stories.reduce((s, st) => s + st.sections.length, 0);
        const sub = meta.subtitle || (storyCount > 1 ? `${storyCount} қисса` : `${sectionCount} бўлим`);
        return `
          <li>
            <a class="chapter-card ${meta.color}" href="#/c/${i}">
              <div class="num">${meta.emoji}</div>
              <div>
                <div class="ttl">${escape(ch.title)}</div>
                <div class="meta">${escape(sub)}</div>
              </div>
              <div class="arrow">›</div>
            </a>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

function renderIntro() {
  topbar.classList.remove('no-back');
  scrollTop();
  app.innerHTML = `
    <article class="reader">
      <div class="reader-head">
        <div class="crumb">Бошланиш</div>
        <h1>${escape(DATA.intro.title)}</h1>
      </div>
      ${renderBlocks(DATA.intro.blocks)}
      <p style="text-align:right; font-style:italic; color:var(--ink-soft); margin-top:18px;">— ${escape(DATA.intro.author)}</p>
      <div class="reader-nav">
        <a class="home" href="#/">🏠 Бош саҳифа</a>
        <a href="#/c/0">Биринчи қисса ›</a>
      </div>
    </article>
  `;
}

function renderChapter(ci) {
  const ch = DATA.chapters[ci];
  // If single story, jump straight in
  if (ch.stories.length === 1) {
    return renderStory(ci, 0);
  }
  topbar.classList.remove('no-back');
  scrollTop();
  const meta = CHAPTER_META[ci] || { color: 'c-gold', emoji: '📖' };
  app.innerHTML = `
    <div class="page-head">
      <div class="crumb">Боб ${ci + 1}</div>
      <h1>${meta.emoji} ${escape(ch.title)}</h1>
      <p class="lead">Ушбу бобда ${ch.stories.length} қисса жамланган.</p>
    </div>

    <ul class="story-list">
      ${ch.stories.map((st, si) => `
        <li>
          <a class="story-card" href="#/c/${ci}/s/${si}">
            <div class="ico">${storyEmoji(ci, st)}</div>
            <div>
              <div class="ttl">${escape(st.title)}</div>
              <div class="meta">${st.sections.length} бўлим</div>
            </div>
            <div class="arrow">›</div>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderStory(ci, si) {
  topbar.classList.remove('no-back');
  scrollTop();
  const ch = DATA.chapters[ci];
  const st = ch.stories[si];
  const meta = CHAPTER_META[ci] || {};
  const crumb = ch.stories.length > 1 ? `${escape(ch.title)} ›` : `Боб ${ci + 1}`;
  app.innerHTML = `
    <div class="page-head">
      <div class="crumb">${crumb}</div>
      <h1>${storyEmoji(ci, st)} ${escape(st.title)}</h1>
      <p class="lead">${st.sections.length} бўлим · Тегиб кўрсатилган бўлимни ўқинг</p>
    </div>

    <ul class="section-list">
      ${st.sections.map((s, pi) => `
        <li>
          <a class="section-item" href="#/c/${ci}/s/${si}/p/${pi}">
            <div class="n ${s.number == null ? 'no-num' : ''}">${s.number == null ? '◆' : s.number}</div>
            <div class="t">${escape(s.title || 'Бўлим')}</div>
            <div class="a">›</div>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderRead(ci, si, pi) {
  topbar.classList.remove('no-back');
  scrollTop();
  const ch = DATA.chapters[ci];
  const st = ch.stories[si];
  const section = st.sections[pi];
  if (!section) return renderStory(ci, si);

  const total = st.sections.length;
  const progress = Math.round(((pi + 1) / total) * 100);

  const prevHref = pi > 0 ? `#/c/${ci}/s/${si}/p/${pi - 1}` : null;
  let nextHref = null;
  if (pi < total - 1) {
    nextHref = `#/c/${ci}/s/${si}/p/${pi + 1}`;
  } else {
    // jump to next story / next chapter if available
    if (ch.stories[si + 1]) nextHref = `#/c/${ci}/s/${si + 1}/p/0`;
    else if (DATA.chapters[ci + 1]) nextHref = `#/c/${ci + 1}`;
  }

  app.innerHTML = `
    <article class="reader">
      <div class="reader-head">
        <div class="crumb">${escape(st.title)} · ${pi + 1} / ${total}</div>
        <h1>
          ${section.number != null ? `<span class="num">${section.number}</span>` : ''}
          <span>${escape(section.title || '')}</span>
        </h1>
        <div class="progress-bar"><span style="width:${progress}%"></span></div>
      </div>

      ${renderBlocks(section.blocks)}

      <div class="reader-nav">
        <a class="${prevHref ? '' : 'disabled'}" href="${prevHref || '#'}">‹ Олдинги</a>
        <a class="home" href="#/c/${ci}/s/${si}">☰</a>
        <a class="${nextHref ? '' : 'disabled'}" href="${nextHref || '#'}">Кейинги ›</a>
      </div>
    </article>
  `;
}

// ---------------------------------------------------------------------------
// Block renderer

function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    switch (b.kind) {
      case 'quote':
        return `<div class="quote">${escape(b.text)}</div>`;
      case 'italic':
        return `<p class="italic">${escape(b.text)}</p>`;
      case 'subheading':
        return `<h2 class="subhead">${escape(b.text)}</h2>`;
      case 'para':
      default:
        return `<p>${escape(b.text)}</p>`;
    }
  }).join('');
}

function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
