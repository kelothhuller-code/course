/**
 * Tiny, safe Markdown renderer for admin-written descriptions. It builds React elements
 * (never dangerouslySetInnerHTML), so HTML in the source is shown as text.
 * Supports: # / ## / ### headings, paragraphs, - or * bullet lists, 1. numbered lists,
 * **bold**, *italic*, `code` and [links](https://…) (http/https/mailto and site paths only).
 */
const SAFE_URL = /^(https?:\/\/|mailto:|\/(?!\/))/i;

function inline(text, keyBase) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3]}</em>);
    else if (m[4]) out.push(<code key={k}>{m[4]}</code>);
    else if (m[5]) {
      const href = m[6];
      if (SAFE_URL.test(href)) {
        const ext = /^https?:/i.test(href);
        out.push(<a key={k} href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[5]}</a>);
      } else out.push(m[5]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ source = '', className = 'wt-prose' }) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { blocks.push({ t: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (h) { flushPara(); flushList(); blocks.push({ t: `h${h[1].length}`, text: h[2] }); }
    else if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.t !== type) { flushList(); list = { t: type, items: [] }; }
      list.items.push((ul || ol)[1]);
    } else { flushList(); para.push(line); }
  });
  flushPara();
  flushList();

  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.t === 'ul' || b.t === 'ol') {
          const L = b.t;
          return <L key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</L>;
        }
        // Headings inside a description sit below the page's h1/h2, so shift them down
        if (b.t === 'h1' || b.t === 'h2') return <h3 key={i}>{inline(b.text, i)}</h3>;
        if (b.t === 'h3') return <h4 key={i}>{inline(b.text, i)}</h4>;
        return <p key={i}>{inline(b.text, i)}</p>;
      })}
    </div>
  );
}
