#!/usr/bin/env python3
"""Pull home city / house / location for each follower from the UESP wiki API."""

import json, re, subprocess, urllib.parse, time

names = json.load(open('/tmp/names.json'))
API = "https://en.uesp.net/w/api.php"
KEYS = ['city', 'house', 'loc', 'location', 'store', 'home']


def strip_links(s):
    # A follower with several homes lists them separated by <br>; turn those into
    # a real delimiter before tags are stripped, or they run into one another.
    s = re.sub(r'<br\s*/?>', ' | ', s, flags=re.I)
    s = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'\[\[([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    s = re.sub(r"'''?|<[^>]+>|<!--.*?-->", '', s)
    s = ' '.join(s.split())
    parts = [p.strip(' ,;') for p in s.split('|')]
    return ' / '.join(p for p in parts if p)


def summary_block(wt):
    """Return the body of the first {{NPC Summary ...}} template, brace-matched."""
    m = re.search(r'\{\{\s*NPC Summary', wt, re.I)
    if not m:
        return ''
    i, depth = m.start(), 0
    while i < len(wt):
        if wt.startswith('{{', i):
            depth += 1
            i += 2
        elif wt.startswith('}}', i):
            depth -= 1
            i += 2
            if depth == 0:
                return wt[m.start():i]
        else:
            i += 1
    return wt[m.start():]


def split_params(block):
    """Split template params on top-level pipes — ignoring pipes inside [[ ]] and {{ }}."""
    out, buf, sq, cu = [], '', 0, 0
    for i, c in enumerate(block):
        if block.startswith('[[', i):
            sq += 1
        elif block.startswith(']]', i):
            sq = max(0, sq - 1)
        elif block.startswith('{{', i):
            cu += 1
        elif block.startswith('}}', i):
            cu = max(0, cu - 1)
        if c == '|' and sq == 0 and cu <= 1:
            out.append(buf)
            buf = ''
        else:
            buf += c
    out.append(buf)
    return out


def params_of(wt):
    block = summary_block(wt)
    found = {}
    for part in split_params(block):
        if '=' not in part:
            continue
        k, _, v = part.partition('=')
        k = k.strip().lower()
        if k in KEYS:
            v = strip_links(v)
            if v:
                found[k] = v
    return found


def fetch(batch):
    q = urllib.parse.urlencode({
        'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
        'rvslots': 'main', 'titles': '|'.join('Skyrim:' + n for n in batch),
        'format': 'json', 'formatversion': '2', 'redirects': '1',
    })
    out = subprocess.run(['curl', '-sS', '--max-time', '45', f'{API}?{q}'],
                         capture_output=True, text=True)
    return json.loads(out.stdout)


results, missing = {}, []

for i in range(0, len(names), 40):
    batch = names[i:i + 40]
    data = fetch(batch)
    q = data.get('query', {})

    alias = {'Skyrim:' + n: n for n in batch}
    for r in q.get('normalized', []) + q.get('redirects', []):
        if r['from'] in alias:
            alias[r['to']] = alias[r['from']]

    for page in q.get('pages', []):
        name = alias.get(page['title'])
        if not name:
            continue
        if 'missing' in page or not page.get('revisions'):
            missing.append(name)
            continue
        p = params_of(page['revisions'][0]['slots']['main']['content'])
        if p:
            results[name] = p
        else:
            missing.append(name)
    time.sleep(1)

json.dump(results, open('/tmp/locations.json', 'w'), indent=2)

print(f"located: {len(results)} / {len(names)}   no location field: {len(missing)}")
print("\nsamples:")
for n in list(results)[:8]:
    print(f"  {n:26} {results[n]}")
print("\nstill missing:", ', '.join(sorted(missing)))
