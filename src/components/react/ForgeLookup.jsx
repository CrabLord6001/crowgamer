import { useMemo, useState } from 'react';

const gold = (n) => (n > 0 ? `+${n}` : `${n}`);

function Value({ r }) {
  if (r.varies) return <span className="fg-varies">varies</span>;
  if (r.valueGain === null) return <span className="fg-varies">—</span>;
  return <span className={r.valueGain < 0 ? 'fg-loss' : 'fg-gain'}>{gold(r.valueGain)}</span>;
}

export default function ForgeLookup({ recipes, contents }) {
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('Base');
  const [sigil, setSigil] = useState(true);
  const [profitable, setProfitable] = useState(false);
  const [sort, setSort] = useState({ field: 'priority', dir: 'asc' });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = recipes.filter((r) => {
      if (content !== 'all' && r.content !== content) return false;
      if (!sigil && r.needsSigil) return false;
      if (profitable && !(r.valueGain > 0)) return false;
      if (!q) return true;
      return r.output.toLowerCase().includes(q) || r.inputs.toLowerCase().includes(q);
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      if (sort.field === 'value') {
        const av = a.valueGain ?? -Infinity;
        const bv = b.valueGain ?? -Infinity;
        return (av - bv) * dir || a.output.localeCompare(b.output);
      }
      if (sort.field === 'output') return a.output.localeCompare(b.output) * dir;
      const ap = a.priority ?? Infinity;
      const bp = b.priority ?? Infinity;
      return (ap - bp) * dir || a.output.localeCompare(b.output);
    });
  }, [recipes, query, content, sigil, profitable, sort]);

  const SortHead = ({ label, field, align }) => {
    const on = sort.field === field;
    return (
      <th className={align === 'right' ? 'num' : undefined}>
        <button
          type="button"
          className={`sortbtn${on ? ' on' : ''}`}
          onClick={() => setSort({ field, dir: on && sort.dir === 'asc' ? 'desc' : 'asc' })}
        >
          {label}
          <span className="caret">{on ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="fg">
      <div className="flw-bar">
        <input
          type="search"
          className="alc-search flw-q"
          placeholder="Search item…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search recipes"
        />

        <select
          className="alc-dlc"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Filter by content"
        >
          <option value="all">All content</option>
          {contents.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flw-flags">
          <button
            type="button"
            aria-pressed={sigil}
            className={`flw-flag${sigil ? ' on' : ''}`}
            onClick={() => setSigil((s) => !s)}
            title="The Sigil Stone unlocks the Daedric recipes"
          >
            Sigil Stone
          </button>
          <button
            type="button"
            aria-pressed={profitable}
            className={`flw-flag${profitable ? ' on' : ''}`}
            onClick={() => setProfitable((p) => !p)}
            title="Hide recipes worth less than their ingredients"
          >
            Worth making
          </button>
        </div>
      </div>

      <p className="flw-count">{rows.length} of {recipes.length}</p>

      <div className="alc-scroll">
        <table className="alc-table fg-table">
          <colgroup>
            <col className="c-pri" />
            <col className="c-out" />
            <col className="c-in" />
            <col className="c-val" />
          </colgroup>
          <thead>
            <tr>
              <SortHead label="Pri" field="priority" align="right" />
              <SortHead label="You get" field="output" />
              <th>You put in</th>
              <SortHead label="Value" field="value" align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.output}>
                <td className="num">{r.priority ?? '—'}</td>
                <th scope="row">
                  {r.output}
                  {r.content !== 'Base' && <span className="dlc">{r.content}</span>}
                  {r.needsSigil && <span className="dlc">Sigil</span>}
                </th>
                <td className="src">{r.inputs}</td>
                <td className="num"><Value r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="alc-hint">No recipe matches those filters.</p>}
    </div>
  );
}
