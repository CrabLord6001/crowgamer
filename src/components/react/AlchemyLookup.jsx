import { useMemo, useState } from 'react';

const CONTENT_ORDER = ['Base', 'Dawnguard', 'Hearthfire', 'Dragonborn'];

function SortHeader({ label, field, sort, setSort, align }) {
  const active = sort.field === field;
  return (
    <th className={align === 'right' ? 'num' : undefined}>
      <button
        type="button"
        className={`sortbtn${active ? ' on' : ''}`}
        onClick={() =>
          setSort({ field, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })
        }
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <span className="caret">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

function ContentTag({ content }) {
  if (content === 'Base') return null;
  return <span className="dlc">{content}</span>;
}

export default function AlchemyLookup({ ingredients, effects }) {
  const [mode, setMode] = useState('effect');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [dlc, setDlc] = useState('all');
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });

  const byName = useMemo(
    () => new Map(ingredients.map((i) => [i.name, i])),
    [ingredients]
  );

  const allowed = (ing) => dlc === 'all' || ing.content === dlc;

  const presentContent = useMemo(() => {
    const seen = new Set(ingredients.map((i) => i.content));
    return CONTENT_ORDER.filter((c) => seen.has(c));
  }, [ingredients]);

  // The left-hand list: effects or ingredients, filtered by the search box.
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (mode === 'effect') {
      return effects
        .map((e) => ({
          key: e.name,
          label: e.name,
          count: e.ingredients.filter((n) => allowed(byName.get(n))).length,
        }))
        .filter((o) => o.count > 0 && (!q || o.label.toLowerCase().includes(q)));
    }

    return ingredients
      .filter(allowed)
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.effects.some((e) => e.toLowerCase().includes(q))
      )
      .map((i) => ({ key: i.name, label: i.name, count: null }));
  }, [mode, query, effects, ingredients, dlc, byName]);

  // Rows for the chosen effect: every ingredient carrying it, with its slot.
  const effectRows = useMemo(() => {
    if (mode !== 'effect' || !picked) return [];
    return ingredients
      .filter(allowed)
      .filter((i) => i.effects.includes(picked))
      .map((i) => ({ ...i, slot: i.effects.indexOf(picked) + 1 }));
  }, [mode, picked, ingredients, dlc]);

  // Partners for the chosen ingredient, ranked by how many effects they share.
  const partnerRows = useMemo(() => {
    if (mode !== 'ingredient' || !picked) return [];
    const base = byName.get(picked);
    if (!base) return [];
    return ingredients
      .filter(allowed)
      .filter((i) => i.name !== picked)
      .map((i) => ({ ...i, shared: i.effects.filter((e) => base.effects.includes(e)) }))
      .filter((i) => i.shared.length > 0);
  }, [mode, picked, ingredients, dlc, byName]);

  const sortRows = (rows) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sort.field) {
        case 'value':
          return (a.value - b.value) * dir;
        case 'weight':
          return (a.weight - b.weight) * dir;
        case 'slot':
          return (a.slot - b.slot) * dir || a.name.localeCompare(b.name);
        case 'shared':
          return (a.shared.length - b.shared.length) * dir || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  };

  const switchMode = (next) => {
    setMode(next);
    setPicked(null);
    setQuery('');
    setSort({ field: 'name', dir: 'asc' });
  };

  const base = mode === 'ingredient' && picked ? byName.get(picked) : null;

  return (
    <div className="alc">
      <div className="alc-controls">
        <div className="alc-modes" role="tablist" aria-label="Lookup mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'effect'}
            className={mode === 'effect' ? 'on' : ''}
            onClick={() => switchMode('effect')}
          >
            By effect
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'ingredient'}
            className={mode === 'ingredient' ? 'on' : ''}
            onClick={() => switchMode('ingredient')}
          >
            By ingredient
          </button>
        </div>

        <select
          className="alc-dlc"
          value={dlc}
          onChange={(e) => setDlc(e.target.value)}
          aria-label="Filter by content"
        >
          <option value="all">All content</option>
          {presentContent.map((c) => (
            <option key={c} value={c}>
              {c} only
            </option>
          ))}
        </select>
      </div>

      <div className="alc-body">
        <div className="alc-list">
          <input
            type="search"
            className="alc-search"
            placeholder={mode === 'effect' ? 'Search effects…' : 'Search ingredients or effects…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={mode === 'effect' ? 'Search effects' : 'Search ingredients'}
          />

          <div className="alc-options" role="listbox" aria-label="Results">
            {options.length === 0 && <p className="alc-empty">Nothing matches that.</p>}
            {options.map((o) => (
              <button
                type="button"
                key={o.key}
                role="option"
                aria-selected={picked === o.key}
                className={`alc-opt${picked === o.key ? ' on' : ''}`}
                onClick={() => setPicked(o.key)}
              >
                <span>{o.label}</span>
                {o.count !== null && <span className="alc-count">{o.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="alc-result">
          {!picked && (
            <p className="alc-hint">
              {mode === 'effect'
                ? 'Pick an effect to see every ingredient that carries it, and which of its four slots it sits in.'
                : 'Pick an ingredient to see its four effects and every ingredient it can be combined with.'}
            </p>
          )}

          {picked && mode === 'effect' && (
            <>
              <h3 className="alc-h">
                {picked}
                <span className="alc-sub">
                  {effectRows.length} ingredient{effectRows.length === 1 ? '' : 's'}
                </span>
              </h3>
              <div className="alc-scroll">
                <table className="alc-table">
                  <thead>
                    <tr>
                      <SortHeader label="Ingredient" field="name" sort={sort} setSort={setSort} />
                      <SortHeader label="Slot" field="slot" sort={sort} setSort={setSort} align="right" />
                      <SortHeader label="Value" field="value" sort={sort} setSort={setSort} align="right" />
                      <SortHeader label="Wt" field="weight" sort={sort} setSort={setSort} align="right" />
                      <th>Where to find</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortRows(effectRows).map((i) => (
                      <tr key={i.name}>
                        <th scope="row">
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => {
                              setMode('ingredient');
                              setQuery('');
                              setPicked(i.name);
                              setSort({ field: 'shared', dir: 'desc' });
                            }}
                          >
                            {i.name}
                          </button>
                          <ContentTag content={i.content} />
                        </th>
                        <td className="num">{i.slot}</td>
                        <td className="num">{i.value}</td>
                        <td className="num">{i.weight}</td>
                        <td className="src">{i.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {picked && mode === 'ingredient' && base && (
            <>
              <h3 className="alc-h">
                {base.name}
                <span className="alc-sub">
                  {base.value} gold · {base.weight} wt
                </span>
              </h3>

              <ul className="alc-effects">
                {base.effects.map((e, idx) => (
                  <li key={e}>
                    <span className="slot">{idx + 1}</span>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        setMode('effect');
                        setQuery('');
                        setPicked(e);
                        setSort({ field: 'name', dir: 'asc' });
                      }}
                    >
                      {e}
                    </button>
                  </li>
                ))}
              </ul>

              <p className="alc-src">{base.source}</p>

              <h4 className="alc-h4">
                Combines with
                <span className="alc-sub">{partnerRows.length} ingredients</span>
              </h4>
              <div className="alc-scroll">
                <table className="alc-table">
                  <thead>
                    <tr>
                      <SortHeader label="Ingredient" field="name" sort={sort} setSort={setSort} />
                      <SortHeader label="Shared" field="shared" sort={sort} setSort={setSort} align="right" />
                      <th>Effects in common</th>
                      <SortHeader label="Value" field="value" sort={sort} setSort={setSort} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortRows(partnerRows).map((i) => (
                      <tr key={i.name}>
                        <th scope="row">
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => {
                              setPicked(i.name);
                              setSort({ field: 'shared', dir: 'desc' });
                            }}
                          >
                            {i.name}
                          </button>
                          <ContentTag content={i.content} />
                        </th>
                        <td className="num">{i.shared.length}</td>
                        <td className="src">{i.shared.join(', ')}</td>
                        <td className="num">{i.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
