import { Fragment, useMemo, useState } from 'react';

import { uespUrl } from '../../lib/uesp';

const MARKER_NOTE = {
  counts: 'Clearing this advances Dungeons Cleared.',
  'no-credit': 'Shows a cleared marker but gives no credit toward Dungeons Cleared.',
  none: 'Never marks cleared, so it cannot count toward Dungeons Cleared.',
};

function SortHeader({ label, field, sort, setSort, className }) {
  const active = sort.field === field;
  return (
    <th className={className}>
      <button
        type="button"
        className={`sortbtn${active ? ' on' : ''}`}
        onClick={() => setSort({ field, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
      >
        {label}
        <span className="caret">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

export default function DungeonIndex({ dungeons, holds, types, contents, totals }) {
  const [query, setQuery] = useState('');
  const [hold, setHold] = useState('all');
  const [type, setType] = useState('all');
  const [content, setContent] = useState('all');
  /** '' | 'cleared' | 'todo' — mutually exclusive, so one value rather than flags. */
  const [state, setState] = useState('');
  const [countsOnly, setCountsOnly] = useState(false);
  const [wordWall, setWordWall] = useState(false);
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });
  const [open, setOpen] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const out = dungeons.filter((d) => {
      if (hold !== 'all' && d.hold !== hold) return false;
      if (type !== 'all' && d.type !== type) return false;
      if (content !== 'all' && d.content !== content) return false;
      if (state === 'cleared' && !d.cleared) return false;
      if (state === 'todo' && d.cleared) return false;
      if (countsOnly && d.marker !== 'counts') return false;
      if (wordWall && !d.wordWall) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.hold.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.enemies.toLowerCase().includes(q) ||
        d.quests.toLowerCase().includes(q) ||
        d.notes.toLowerCase().includes(q)
      );
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    return out.sort((a, b) => {
      if (sort.field === 'hold') {
        return a.hold.localeCompare(b.hold) * dir || a.name.localeCompare(b.name);
      }
      if (sort.field === 'type') {
        return a.type.localeCompare(b.type) * dir || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name) * dir;
    });
  }, [dungeons, query, hold, type, content, state, countsOnly, wordWall, sort]);

  const reset = () => {
    setQuery('');
    setHold('all');
    setType('all');
    setContent('all');
    setState('');
    setCountsOnly(false);
    setWordWall(false);
  };

  const filtered = rows.length !== dungeons.length;
  const shownCleared = rows.filter((d) => d.cleared).length;
  const shownCounts = rows.filter((d) => d.marker === 'counts').length;

  return (
    <div className="dgn">
      <div className="flw-bar">
        <input
          type="search"
          className="alc-search flw-q"
          placeholder="Search name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search locations"
        />

        <select
          className="alc-dlc"
          value={hold}
          onChange={(e) => setHold(e.target.value)}
          aria-label="Filter by hold"
        >
          <option value="all">All holds</option>
          {holds.map((h) => (
            <option key={h.name} value={h.name}>
              {h.name} ({h.total})
            </option>
          ))}
        </select>

        <select
          className="alc-dlc"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="alc-dlc"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Filter by content"
        >
          <option value="all">All content</option>
          {contents.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flw-flags" role="group" aria-label="Filter by clear state">
          <button
            type="button"
            aria-pressed={state === 'todo'}
            className={`flw-flag${state === 'todo' ? ' on' : ''}`}
            onClick={() => setState(state === 'todo' ? '' : 'todo')}
          >
            Not cleared
          </button>
          <button
            type="button"
            aria-pressed={state === 'cleared'}
            className={`flw-flag${state === 'cleared' ? ' on' : ''}`}
            onClick={() => setState(state === 'cleared' ? '' : 'cleared')}
          >
            Cleared
          </button>
        </div>

        <div className="flw-flags">
          <button
            type="button"
            aria-pressed={countsOnly}
            className={`flw-flag${countsOnly ? ' on' : ''}`}
            onClick={() => setCountsOnly((v) => !v)}
          >
            Counts
          </button>
          <button
            type="button"
            aria-pressed={wordWall}
            className={`flw-flag${wordWall ? ' on' : ''}`}
            onClick={() => setWordWall((v) => !v)}
          >
            Word wall
          </button>
        </div>
      </div>

      <p className="flw-count">
        {rows.length} of {totals.all} · {shownCounts} count · {shownCleared} cleared
        {filtered && (
          <button type="button" className="linkish flw-reset" onClick={reset}>
            clear filters
          </button>
        )}
      </p>

      <div className="alc-scroll">
        <table className="alc-table dgn-table">
          <colgroup>
            <col className="c-name" />
            <col className="c-hold" />
            <col className="c-type" />
            <col className="c-where" />
            <col className="c-marks" />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="Location" field="name" sort={sort} setSort={setSort} />
              <SortHeader label="Hold" field="hold" sort={sort} setSort={setSort} />
              <SortHeader
                label="Type"
                field="type"
                sort={sort}
                setSort={setSort}
                className="c-drop"
              />
              <th className="c-drop">Where</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <Fragment key={d.name}>
                <tr
                  className={`flw-row dgn-row${open === d.name ? ' open' : ''}${
                    d.cleared ? ' done' : ''
                  }`}
                  onClick={() => setOpen(open === d.name ? null : d.name)}
                >
                  <th scope="row">
                    {d.cleared && (
                      <span className="tick" aria-label="Cleared">
                        ✓
                      </span>
                    )}
                    <span className="linkish">{d.name}</span>
                    {d.content !== 'Base' && <span className="dlc">{d.content}</span>}
                  </th>
                  <td className="src">{d.hold}</td>
                  <td className="src c-drop">{d.type}</td>
                  <td className={`c-drop ${d.location ? 'src' : 'src none'}`}>
                    {d.location || '—'}
                  </td>
                  <td className="src nowrap">
                    {d.wordWall && <span className="pip">Word wall</span>}
                    {d.marker === 'no-credit' && <span className="pip warn">No credit</span>}
                    {d.marker === 'none' && <span className="pip off">No marker</span>}
                  </td>
                </tr>

                {open === d.name && (
                  <tr className="flw-detail">
                    <td colSpan={5}>
                      <p className="muted">
                        {[d.type, d.hold, d.content !== 'Base' ? d.content : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {d.location && (
                        <p>
                          <strong>Where:</strong> {d.location}
                        </p>
                      )}
                      {d.enemies && (
                        <p>
                          <strong>Enemies:</strong> {d.enemies}
                        </p>
                      )}
                      {d.quests && (
                        <p>
                          <strong>Quests:</strong> {d.quests}
                        </p>
                      )}
                      {d.notes && <p>{d.notes}</p>}
                      <p className="muted">{MARKER_NOTE[d.marker]}</p>
                      <p>
                        <a
                          className="dgn-out"
                          href={uespUrl(d.name, d.content)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          UESP
                        </a>
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="alc-hint">No location matches those filters.</p>}
    </div>
  );
}
