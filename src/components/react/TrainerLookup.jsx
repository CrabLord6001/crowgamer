import { useMemo, useState } from 'react';

const TIER = { Common: 0, Expert: 1, Master: 2 };
const CAP = { Common: 50, Expert: 75, Master: 90 };

export default function TrainerLookup({ trainers, skills, levels, contents }) {
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('all');
  const [content, setContent] = useState('all');
  const [level, setLevel] = useState('all');
  const [followerOnly, setFollowerOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = trainers.filter((t) => {
      if (skill !== 'all' && t.skill !== skill) return false;
      if (content !== 'all' && t.content !== content) return false;
      if (level !== 'all' && t.level !== level) return false;
      if (followerOnly && !t.isFollower) return false;
      if (openOnly && t.requirement) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.skill.toLowerCase().includes(q) ||
        t.where.toLowerCase().includes(q)
      );
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      if (sort.field === 'name') return a.name.localeCompare(b.name) * dir;
      if (sort.field === 'where') return a.where.localeCompare(b.where) * dir || a.name.localeCompare(b.name);
      if (sort.field === 'level') {
        return ((TIER[a.level] ?? 9) - (TIER[b.level] ?? 9)) * dir || a.skill.localeCompare(b.skill);
      }
      if (sort.field === 'skill') {
        return (
          a.skill.localeCompare(b.skill) * dir ||
          (TIER[a.level] ?? 9) - (TIER[b.level] ?? 9)
        );
      }
      return a.name.localeCompare(b.name) * dir;
    });
  }, [trainers, query, skill, content, level, followerOnly, openOnly, sort]);

  const reset = () => {
    setQuery(''); setSkill('all'); setContent('all');
    setLevel('all'); setFollowerOnly(false); setOpenOnly(false);
  };
  const filtered = rows.length !== trainers.length;

  const SortHead = ({ label, field }) => {
    const on = sort.field === field;
    return (
      <th>
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
    <div className="flw">
      <div className="flw-bar">
        <input
          type="search"
          className="alc-search flw-q"
          placeholder="Search trainer, skill or place…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search trainers"
        />

        <select className="alc-dlc" value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Filter by skill">
          <option value="all">All skills</option>
          {skills.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select className="alc-dlc" value={content} onChange={(e) => setContent(e.target.value)} aria-label="Filter by content">
          <option value="all">All content</option>
          {contents.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flw-flags" role="group" aria-label="Filter by tier">
          {levels.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              className={`flw-flag${level === l ? ' on' : ''}`}
              onClick={() => setLevel(level === l ? 'all' : l)}
              title={`Trains up to ${CAP[l]}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flw-flags">
          <button
            type="button"
            aria-pressed={followerOnly}
            className={`flw-flag${followerOnly ? ' on' : ''}`}
            onClick={() => setFollowerOnly((v) => !v)}
            title="Recruit them and the fee can be looted back"
          >
            Also a follower
          </button>
          <button
            type="button"
            aria-pressed={openOnly}
            className={`flw-flag${openOnly ? ' on' : ''}`}
            onClick={() => setOpenOnly((v) => !v)}
            title="Hide trainers gated behind a faction or quest"
          >
            No requirement
          </button>
        </div>
      </div>

      <p className="flw-count">
        {rows.length} of {trainers.length}
        {filtered && (
          <button type="button" className="linkish flw-reset" onClick={reset}>
            clear filters
          </button>
        )}
      </p>

      <div className="alc-scroll">
        <table className="alc-table tr-table">
          <colgroup>
            <col className="c-who" />
            <col className="c-skill" />
            <col className="c-tier" />
            <col className="c-where" />
            <col className="c-req" />
          </colgroup>
          <thead>
            <tr>
              <SortHead label="Trainer" field="name" />
              <SortHead label="Skill" field="skill" />
              <SortHead label="Tier" field="level" />
              <SortHead label="Where" field="where" />
              <th>Requirement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={`${t.skill}-${t.name}`}>
                <th scope="row">
                  {t.name}
                  {t.isFollower && <span className="pip">Follower</span>}
                  {t.content !== 'Base' && <span className="dlc">{t.content}</span>}
                </th>
                <td className="src">{t.skill}</td>
                <td className="src nowrap">
                  {t.level}
                  <span className="tr-cap">to {CAP[t.level] ?? '—'}</span>
                </td>
                <td className="src">{t.where}</td>
                <td className="src">{t.requirement || <span className="none">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="alc-hint">No trainer matches those filters.</p>}
    </div>
  );
}
