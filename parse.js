#!/usr/bin/env node
// One-shot parser: islom.uz post 2396 body -> structured qissalar.json
const fs = require('fs');
const path = require('path');

const SRC = path.join(process.env.TEMP || '/tmp', 'post2396.json');
const OUT = path.join(__dirname, 'qissalar.json');

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
let body = raw.body;

// Normalize HTML entities and whitespace inside text segments only
function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&cent;/g, '¢')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(s) {
  return decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

// Split body into tokens by top-level block tags <h1>, <h2>, <h3>, <p ...>
const tokens = [];
const re = /<(h[123]|p)\b([^>]*)>([\s\S]*?)<\/\1>/g;
let m;
while ((m = re.exec(body)) !== null) {
  tokens.push({ tag: m[1], attrs: m[2], html: m[3] });
}

// Classify each token
function classify(tok) {
  const inner = tok.html.trim();
  const text = stripTags(inner);

  if (tok.tag === 'h1' || tok.tag === 'h2' || tok.tag === 'h3') {
    return { kind: 'chapter', text, level: parseInt(tok.tag[1], 10) };
  }

  if (!text) return { kind: 'empty' };

  // Quranic ayat or hadith — usually wrapped fully in «…»
  const isQuote = /^[«"][\s\S]*[»"]\.?$/.test(text);

  // Sub-section heading: <p><strong>N. Title</strong></p> — entire content is bold and starts with number+dot
  const strongOnly = /^<strong[^>]*>([\s\S]*)<\/strong>$/i.exec(inner);
  if (strongOnly) {
    const t = stripTags(strongOnly[1]);
    // Quranic ayat wrapped in « » (sometimes bolded) — treat as quote not heading
    if (/^[«"]/.test(t)) return { kind: 'quote', text: t.replace(/^[«"]|[»"]\.?$/g, '').trim(), raw: t };
    const nm = /^(\d+)\.\s*(.+)$/.exec(t);
    if (nm) return { kind: 'subheading', number: parseInt(nm[1], 10), text: nm[2] };
    // Just bold all-caps section like МУҚАДДИМА
    if (/^[А-ЯЎҒҲҚЁ\s\-–—]+$/.test(t) && t.length > 3) return { kind: 'subheading', number: null, text: t };
    // Otherwise just a bold paragraph — treat as emphasized para
    return { kind: 'para', text: t };
  }

  // Italic-only paragraph (greeting line)
  const emOnly = /^<em[^>]*>([\s\S]*)<\/em>$/i.exec(inner);
  if (emOnly) return { kind: 'italic', text: stripTags(emOnly[1]) };

  if (isQuote) return { kind: 'quote', text: text.replace(/^[«"]|[»"]\.?$/g, '').trim(), raw: text };

  return { kind: 'para', text };
}

// Build hierarchical structure: chapters -> stories (per-prophet) -> sections (numbered)
const qissalar = {
  title: raw.title,
  author: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
  source: 'islom.uz/maqola/' + raw.id,
  created: raw.created_at_human,
  intro: { title: 'МУҚАДДИМА', author: 'Абул Ҳасан Али Ҳасан ан-Надавий', blocks: [] },
  chapters: []
};

let currentChapter = null; // h1 chapter
let currentStory = null;   // prophet story within chapter (delimited by number reset to 1)
let currentSub = null;     // numbered sub-section within story
let inIntro = true;

function pushBlock(target, block) {
  if (!block || block.kind === 'empty') return;
  target.blocks.push(block);
}

function ensureStory(chapter, title) {
  const story = { title: title || chapter.title, sections: [] };
  chapter.stories.push(story);
  return story;
}

for (const tok of tokens) {
  const c = classify(tok);
  if (c.kind === 'empty') continue;

  if (c.kind === 'chapter' && c.level === 1) {
    if (!c.text) continue; // empty h1 separator
    inIntro = false;
    currentChapter = { title: c.text, stories: [] };
    qissalar.chapters.push(currentChapter);
    currentStory = null;
    currentSub = null;
    continue;
  }

  if (c.kind === 'chapter' && (c.level === 2 || c.level === 3)) {
    // h2/h3 inside chapter: treat as section heading within current story
    if (currentChapter) {
      if (!currentStory) currentStory = ensureStory(currentChapter);
      currentSub = { number: null, title: c.text, blocks: [] };
      currentStory.sections.push(currentSub);
    }
    continue;
  }

  if (c.kind === 'subheading') {
    if (inIntro) {
      if (c.text.toUpperCase().includes('МУҚАДДИМА')) continue;
      pushBlock(qissalar.intro, { kind: 'subheading', text: c.text });
      continue;
    }
    if (currentChapter) {
      // Number reset → new prophet story; first numbered section of any chapter also starts story 1
      if (c.number === 1 || !currentStory) {
        currentStory = ensureStory(currentChapter, c.text);
      }
      currentSub = { number: c.number, title: c.text, blocks: [] };
      currentStory.sections.push(currentSub);
    }
    continue;
  }

  // Regular content block
  let target = null;
  if (inIntro) {
    target = qissalar.intro;
  } else if (currentSub) {
    target = currentSub;
  } else if (currentChapter) {
    if (!currentStory) currentStory = ensureStory(currentChapter);
    if (!currentSub) {
      currentSub = { number: null, title: '', blocks: [] };
      currentStory.sections.push(currentSub);
    }
    target = currentSub;
  }
  if (!target) continue;
  pushBlock(target, { kind: c.kind, text: c.text });
}

// Stats
console.log('Chapters:', qissalar.chapters.length);
for (const ch of qissalar.chapters) {
  console.log(' -', ch.title);
  for (const st of ch.stories) {
    console.log('     • story:', st.title, '— sections:', st.sections.length);
  }
}
console.log('Intro blocks:', qissalar.intro.blocks.length);

fs.writeFileSync(OUT, JSON.stringify(qissalar, null, 2), 'utf8');
console.log('Wrote', OUT, fs.statSync(OUT).size, 'bytes');
