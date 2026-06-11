// Qissalar SPA — vanilla JS reader for islom.uz maqola/2396
// Routes (hash-based):
//   #/                          → home
//   #/intro                     → introduction
//   #/c/:ci                     → chapter overview (auto-jumps if single story)
//   #/c/:ci/s/:si               → read full story on one page (all sections inline)

const app = document.getElementById('app');
const backBtn = document.getElementById('backBtn');
const topbar = document.getElementById('topbar');
const fontBtn = document.getElementById('fontBtn');
const scriptBtn = document.getElementById('scriptBtn');

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
let script = localStorage.getItem('qissalar.script') || 'cyr'; // 'cyr' | 'lat'
applyFont();
applyScript();

fontBtn.addEventListener('click', () => {
  fontStep = (fontStep + 1) % fontSteps.length;
  localStorage.setItem('qissalar.fontStep', String(fontStep));
  applyFont();
});

scriptBtn.addEventListener('click', () => {
  script = script === 'cyr' ? 'lat' : 'cyr';
  localStorage.setItem('qissalar.script', script);
  applyScript();
  render();
});

function applyFont() {
  fontSteps.forEach(c => c && document.body.classList.remove(c));
  if (fontSteps[fontStep]) document.body.classList.add(fontSteps[fontStep]);
}

function applyScript() {
  document.documentElement.lang = script === 'lat' ? 'uz-Latn' : 'uz';
  // Button shows the OTHER script (i.e. what tap will switch TO)
  scriptBtn.textContent = script === 'cyr' ? 'Lat' : 'Кир';
  // Update brand label and footer labels in HTML
  const brand = document.querySelector('.brand-text');
  if (brand) brand.textContent = tx('Қиссалар');
  const footerNote = document.querySelector('.footer small');
  if (footerNote) footerNote.innerHTML = tx('Манба') +
    `: <a href="https://islom.uz/maqola/2396" target="_blank" rel="noopener">islom.uz</a> · ` +
    tx('Муаллиф') + ': ' + tx('Шайх Муҳаммад Содиқ Муҳаммад Юсуф');
}

// ---------- Cyrillic → Latin transliteration (Uzbek) ----------
const CYR_LAT = {
  'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g','Д':'D','д':'d',
  'Ё':'Yo','ё':'yo','Ж':'J','ж':'j','З':'Z','з':'z','И':'I','и':'i','Й':'Y','й':'y',
  'К':'K','к':'k','Л':'L','л':'l','М':'M','м':'m','Н':'N','н':'n','О':'O','о':'o',
  'П':'P','п':'p','Р':'R','р':'r','С':'S','с':'s','Т':'T','т':'t','У':'U','у':'u',
  'Ф':'F','ф':'f','Х':'X','х':'x','Ц':'Ts','ц':'ts','Ч':'Ch','ч':'ch','Ш':'Sh','ш':'sh',
  'Щ':'Sch','щ':'sch','Ъ':'’','ъ':'’','Ы':'I','ы':'i','Ь':'','ь':'',
  'Э':'E','э':'e','Ю':'Yu','ю':'yu','Я':'Ya','я':'ya',
  'Ў':'Oʻ','ў':'oʻ','Ғ':'Gʻ','ғ':'gʻ','Ҳ':'H','ҳ':'h','Қ':'Q','қ':'q'
};
const isLetterRe = /\p{L}/u;

function toLat(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    // е/Е: 'Ye/ye' at word start, 'E/e' otherwise
    if (c === 'е' || c === 'Е') {
      const prev = i > 0 ? s[i - 1] : '';
      const atStart = !isLetterRe.test(prev);
      out += atStart ? (c === 'Е' ? 'Ye' : 'ye') : (c === 'Е' ? 'E' : 'e');
      continue;
    }
    out += (CYR_LAT[c] !== undefined ? CYR_LAT[c] : c);
  }
  return out;
}

function tx(s) {
  return script === 'lat' ? toLat(String(s)) : String(s);
}

// Convenience: transliterate + HTML-escape in one call
function T(s) { return escape(tx(s)); }

backBtn.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else go('#/');
});

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', load);

// ---------- Bookmark: where the reader stopped ----------
const BOOKMARK_KEY = 'qissalar.lastRead';

function saveBookmark() {
  if (!DATA) return;
  const p = parseRoute();
  if (p[0] !== 'c' || p[2] !== 's') return; // only inside a story
  const ci = +p[1], si = +p[3];
  const ch = DATA.chapters[ci];
  const st = ch?.stories?.[si];
  if (!st) return;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const scrollY = window.scrollY;
  const progress = maxScroll > 0 ? Math.min(100, Math.round((scrollY / maxScroll) * 100)) : 0;
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify({
      ci, si, scrollY, progress,
      storyTitle: st.title,
      chapterTitle: ch.title,
      time: Date.now()
    }));
  } catch (_) {}
}

function getBookmark() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    // Validate against current data structure
    if (!DATA?.chapters[b.ci]?.stories?.[b.si]) return null;
    return b;
  } catch { return null; }
}

let scrollSaveTimer = null;
window.addEventListener('scroll', () => {
  clearTimeout(scrollSaveTimer);
  scrollSaveTimer = setTimeout(saveBookmark, 600);
}, { passive: true });
window.addEventListener('pagehide', saveBookmark);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveBookmark(); });

// ---------- In-story TOC clicks → smooth-scroll without hash change ----------
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-toc]');
  if (!a) return;
  e.preventDefault();
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: 'smooth' });
    const details = a.closest('details');
    if (details) details.open = false;
  }
});

// ---------- Service Worker registration (PWA) ----------
// Strategy: network-first SW (see sw.js). updateViaCache:'none' so SW file
// itself is never cached → updates land within one reload when online.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => {
        // Re-check for updates whenever the page becomes visible
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });

  // When a new SW takes control, the next navigation already serves fresh
  // content. No prompt needed thanks to skipWaiting + clients.claim in sw.js.
}

async function load() {
  app.innerHTML = `<div class="loading"><div class="spinner"></div>${tx('Юкланмоқда')}…</div>`;
  try {
    const res = await fetch('qissalar.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
    render();
  } catch (e) {
    app.innerHTML = `<div class="loading" style="color:#b00">${tx('Хатолик')}: ${escape(e.message)}<br><br>qissalar.json ${tx('юкланмади')}.</div>`;
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
  const bookmark = getBookmark();
  const resumeHtml = bookmark ? `
    <a class="resume-card" href="#/c/${bookmark.ci}/s/${bookmark.si}">
      <span class="ico">▶︎</span>
      <div class="lbl-wrap">
        <div class="lbl">${tx('Давом этиш')}</div>
        <div class="desc">${T(bookmark.storyTitle)}</div>
      </div>
      <div class="prog">
        <div class="prog-ring"><span style="--p:${bookmark.progress}">${bookmark.progress}%</span></div>
      </div>
    </a>
  ` : '';
  app.innerHTML = `
    <section class="hero">
      <h1>${T(DATA.title)}</h1>
      <p class="subtitle">${tx('Болалар учун ёзилган пайғамбарлар тарихи')}</p>
      <p class="author">— ${T(DATA.author)}</p>
    </section>

    ${resumeHtml}

    <a class="intro-card" href="#/intro">
      <span class="ico">✨</span>
      <div>
        <div class="lbl">${tx('Муқаддима')}</div>
        <div class="desc">${tx('Муаллифдан болаларга мурожаат')}</div>
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
                <div class="ttl">${T(ch.title)}</div>
                <div class="meta">${T(sub)}</div>
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
        <div class="crumb">${tx('Бошланиш')}</div>
        <h1>${T(DATA.intro.title)}</h1>
      </div>
      ${renderBlocks(DATA.intro.blocks)}
      <p style="text-align:right; font-style:italic; color:var(--ink-soft); margin-top:18px;">— ${T(DATA.intro.author)}</p>
      <div class="reader-nav">
        <a class="home" href="#/">🏠 ${tx('Бош саҳифа')}</a>
        <a href="#/c/0">${tx('Биринчи қисса')} ›</a>
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
      <div class="crumb">${tx('Боб')} ${ci + 1}</div>
      <h1>${meta.emoji} ${T(ch.title)}</h1>
      <p class="lead">${tx(`Ушбу бобда ${ch.stories.length} қисса жамланган.`)}</p>
    </div>

    <ul class="story-list">
      ${ch.stories.map((st, si) => `
        <li>
          <a class="story-card" href="#/c/${ci}/s/${si}">
            <div class="ico">${storyEmoji(ci, st)}</div>
            <div>
              <div class="ttl">${T(st.title)}</div>
              <div class="meta">${st.sections.length} ${tx('бўлим')}</div>
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
  const ch = DATA.chapters[ci];
  const st = ch.stories[si];
  const crumb = ch.stories.length > 1 ? `${T(ch.title)} ›` : `${tx('Боб')} ${ci + 1}`;

  // Continuous flow: render every section's blocks inline with the section title as a heading.
  // The first numbered section repeats the story title (parsing artifact) — skip that header
  // so the page <h1> isn't echoed right below itself.
  const norm = t => String(t || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const body = st.sections.map((s, pi) => {
    const isEcho = norm(s.title) === norm(st.title);
    const hdr = s.title && !isEcho
      ? `<h2 class="sec-head" id="s${pi}">
           ${s.number != null ? `<span class="sec-num">${s.number}</span>` : '<span class="sec-dot">◆</span>'}
           <span>${T(s.title)}</span>
         </h2>`
      : '';
    return hdr + renderBlocks(s.blocks);
  }).join('');

  // Next/prev story navigation (skip the per-section paging entirely)
  let prevHref = null, prevLabel = '';
  if (si > 0) { prevHref = `#/c/${ci}/s/${si - 1}`; prevLabel = ch.stories[si - 1].title; }
  else if (ci > 0) {
    const pc = DATA.chapters[ci - 1];
    prevHref = `#/c/${ci - 1}/s/${pc.stories.length - 1}`;
    prevLabel = pc.title;
  }

  let nextHref = null, nextLabel = '';
  if (ch.stories[si + 1]) { nextHref = `#/c/${ci}/s/${si + 1}`; nextLabel = ch.stories[si + 1].title; }
  else if (DATA.chapters[ci + 1]) {
    nextHref = `#/c/${ci + 1}/s/0`;
    nextLabel = DATA.chapters[ci + 1].title;
  }

  // Mundarija (table of contents) — collapsed by default; tap to expand
  const tocHtml = st.sections.length >= 4 ? `
    <details class="toc">
      <summary>
        <span class="toc-label">${tx('Мундарижа')}</span>
        <span class="toc-count">${st.sections.length} ${tx('бўлим')}</span>
        <span class="toc-chev">›</span>
      </summary>
      <ol class="toc-list">
        ${st.sections.map((s, i) => {
          const label = s.number != null
            ? `${s.number}. ${s.title || ''}`
            : (s.title || '◆');
          return `<li><a href="#s${i}" data-toc>${T(label)}</a></li>`;
        }).join('')}
      </ol>
    </details>
  ` : '';

  app.innerHTML = `
    <article class="reader">
      <div class="reader-head">
        <div class="crumb">${crumb}</div>
        <h1>${storyEmoji(ci, st)} ${T(st.title)}</h1>
        <p class="lead">${st.sections.length} ${tx('бўлим')}</p>
      </div>

      ${tocHtml}

      ${body}

      <div class="reader-nav reader-nav-wide">
        ${prevHref
          ? `<a class="navlink prev" href="${prevHref}"><span class="dir">‹ ${tx('Олдинги')}</span><span class="ttl">${T(prevLabel)}</span></a>`
          : '<span class="navlink disabled"></span>'}
        <a class="navlink home" href="#/" title="${tx('Бош саҳифа')}">🏠</a>
        ${nextHref
          ? `<a class="navlink next" href="${nextHref}"><span class="dir">${tx('Кейинги')} ›</span><span class="ttl">${T(nextLabel)}</span></a>`
          : '<span class="navlink disabled"></span>'}
      </div>
    </article>
  `;

  // Scroll restore: if returning to a bookmarked story, jump to last scroll position
  const bookmark = getBookmark();
  if (bookmark && bookmark.ci === ci && bookmark.si === si && bookmark.scrollY > 0) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo(0, bookmark.scrollY);
    }));
  } else {
    scrollTop();
  }
}

// ---------------------------------------------------------------------------
// Block renderer

function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    switch (b.kind) {
      case 'quote':
        return `<div class="quote">${T(b.text)}</div>`;
      case 'italic':
        return `<p class="italic">${T(b.text)}</p>`;
      case 'subheading':
        return `<h2 class="subhead">${T(b.text)}</h2>`;
      case 'para':
      default:
        return `<p>${T(b.text)}</p>`;
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
