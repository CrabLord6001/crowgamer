import { Fragment, useMemo, useState } from 'react';

const FLAGS = [
  { key: 'canMarry', label: 'Marriable' },
  { key: 'canSteward', label: 'Steward' },
  { key: 'canBlades', label: 'Blades' },
];

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
      >
        {label}
        <span className="caret">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

export default function FollowerLookup({ followers, types, contents, genders = [] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [content, setContent] = useState('all');
  const [gender, setGender] = useState('all');
  const [flags, setFlags] = useState([]);
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });
  const [open, setOpen] = useState(null);

  const toggleFlag = (key) =>
    setFlags((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = followers.filter((f) => {
      if (type !== 'all' && f.type !== type) return false;
      if (content !== 'all' && f.content !== content) return false;
      if (gender !== 'all' && f.gender !== gender) return false;
      if (flags.some((k) => !f[k])) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.skills.join(' ').toLowerCase().includes(q) ||
        f.recruit.toLowerCase().includes(q)
      );
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    return out.sort((a, b) => {
      if (sort.field === 'maxLevel') {
        // Followers with no cap sort last whichever way the column is pointing.
        const av = a.maxLevel ?? -1;
        const bv = b.maxLevel ?? -1;
        if (av === -1 || bv === -1) return av === bv ? 0 : av === -1 ? 1 : -1;
        return (av - bv) * dir || a.name.localeCompare(b.name);
      }
      if (sort.field === 'location') {
        const av = a.location || '￿';
        const bv = b.location || '￿';
        return av.localeCompare(bv) * dir || a.name.localeCompare(b.name);
      }
      if (sort.field === 'type') {
        return a.type.localeCompare(b.type) * dir || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name) * dir;
    });
  }, [followers, query, type, content, gender, flags, sort]);

  const reset = () => {
    setQuery('');
    setType('all');
    setContent('all');
    setGender('all');
    setFlags([]);
  };

  const filtered = rows.length !== followers.length;

  return (
    <div className="flw">
      <div className="flw-bar">
        <input
          type="search"
          className="alc-search flw-q"
          placeholder="Search name, location, skill or quest…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search followers"
        />

        <select className="alc-dlc" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="alc-dlc" value={content} onChange={(e) => setContent(e.target.value)} aria-label="Filter by content">
          <option value="all">All content</option>
          {contents.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {genders.length > 1 && (
          <div className="flw-flags" role="group" aria-label="Filter by gender">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gender === g}
                className={`flw-flag${gender === g ? ' on' : ''}`}
                onClick={() => setGender(gender === g ? 'all' : g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        <div className="flw-flags">
          {FLAGS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={flags.includes(f.key)}
              className={`flw-flag${flags.includes(f.key) ? ' on' : ''}`}
              onClick={() => toggleFlag(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="flw-count">
        {rows.length} of {followers.length}
        {filtered && (
          <button type="button" className="linkish flw-reset" onClick={reset}>
            clear filters
          </button>
        )}
      </p>

      <div className="alc-scroll">
        <table className="alc-table flw-table">
          <colgroup>
            <col className="c-name" />
            <col className="c-home" />
            <col className="c-type" />
            <col className="c-cap" />
            <col className="c-skills" />
            <col className="c-can" />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="Follower" field="name" sort={sort} setSort={setSort} />
              <SortHeader label="Returns to when dismissed" field="location" sort={sort} setSort={setSort} />
              <SortHeader label="Type" field="type" sort={sort} setSort={setSort} />
              <SortHeader label="Cap" field="maxLevel" sort={sort} setSort={setSort} align="right" />
              <th>Skills</th>
              <th>Can</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <Fragment key={f.name}>
                <tr
                  className={`flw-row${open === f.name ? ' open' : ''}`}
                  onClick={() => setOpen(open === f.name ? null : f.name)}
                >
                  <th scope="row">
                    <span className="linkish">{f.name}</span>
                    {f.content !== 'Base' && <span className="dlc">{f.content}</span>}
                  </th>
                  <td className={f.location ? 'src' : 'src none'}>
                    {f.location || 'No fixed home'}
                  </td>
                  <td className="src">{f.type}</td>
                  <td className="num">{f.maxLevel ?? '—'}</td>
                  <td className="src">{f.skills.join(', ') || '—'}</td>
                  <td className="src nowrap">
                    {f.canMarry && <span className="pip">Marry</span>}
                    {f.canSteward && <span className="pip">Steward</span>}
                    {f.canBlades && <span className="pip">Blades</span>}
                  </td>
                </tr>

                {open === f.name && (
                  <tr className="flw-detail">
                    <td colSpan={6}>
                      {(f.gender || f.marriage?.race) && (
                        <p className="muted">
                          {[f.gender, f.marriage?.race].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {f.description && <p>{f.description}</p>}
                      {f.recruit && (
                        <p>
                          <strong>Prerequisite:</strong> {f.recruit}
                        </p>
                      )}
                      {f.notes && <p className="muted">{f.notes}</p>}
                      {f.marriage && (
                        <p>
                          <strong>Marriage:</strong> {f.marriage.gender} {f.marriage.race}
                          {f.marriage.location && ` · found in ${f.marriage.location}`}
                          {f.marriage.property && ` · home after marrying: ${f.marriage.property}`}
                          {f.marriage.unlock && ` · unlock: ${f.marriage.unlock}`}
                          {f.marriage.trainer && ` · trains ${f.marriage.trainer}`}
                        </p>
                      )}
                      {!f.location && (
                        <p className="muted">
                          No fixed home — an animal, a summon, or a generic NPC, so there is
                          nowhere to collect them from once dismissed.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="alc-hint">No follower matches those filters.</p>}
    </div>
  );
}
