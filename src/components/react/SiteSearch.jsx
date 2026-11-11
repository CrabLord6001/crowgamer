import { useEffect, useMemo, useRef, useState } from 'react';

const MAX = 8;

/** Prefix beats word-start beats contains, so "ang" puts Angarvunde above
 *  anything that merely contains those letters further in. */
function score(row, q) {
  const t = row.t.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(' ' + q) || t.includes("'" + q)) return 2;
  if (t.includes(q)) return 3;
  if ((row.d || '').toLowerCase().includes(q)) return 4;
  return -1;
}

export default function SiteSearch() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // The index is ~540 records; fetch it the first time the box is touched
  // rather than on every page load.
  const load = () => {
    if (rows || loading) return;
    setLoading(true);
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((d) => setRows(d.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !rows) return [];
    const out = [];
    for (const row of rows) {
      const s = score(row, q);
      if (s >= 0) out.push([s, row]);
    }
    out.sort((a, b) => a[0] - b[0] || a[1].t.length - b[1].t.length || a[1].t.localeCompare(b[1].t));
    return out.slice(0, MAX).map((x) => x[1]);
  }, [rows, query]);

  useEffect(() => setActive(0), [query]);

  // "/" focuses the box from anywhere, the way a tracker should behave.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  const go = (row) => {
    if (row) window.location.href = row.u;
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div className="ss" ref={boxRef}>
      <input
        ref={inputRef}
        type="search"
        className="ss-input"
        placeholder="Search games, tools, locations, ingredients, followers…"
        value={query}
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-label="Search the site"
        autoComplete="off"
      />

      {showPanel && (
        <div className="ss-panel" role="listbox">
          {!rows && loading && <p className="ss-note">Loading…</p>}
          {rows && results.length === 0 && <p className="ss-note">Nothing matches “{query.trim()}”.</p>}
          {results.map((r, i) => (
            <a
              key={`${r.k}-${r.t}-${i}`}
              href={r.u}
              role="option"
              aria-selected={i === active}
              className={`ss-hit${i === active ? ' on' : ''}`}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ss-t">{r.t}</span>
              <span className="ss-tags">
                {/* Games carry no game tag — the title already is one. Everything
                    else does, because two games can hold the same item name. */}
                {r.g && (
                  <span className="ss-g" style={r.c ? { '--game': r.c } : undefined}>
                    {r.g}
                  </span>
                )}
                <span className="ss-k">{r.k}</span>
              </span>
              {r.d && <span className="ss-d">{r.d}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
