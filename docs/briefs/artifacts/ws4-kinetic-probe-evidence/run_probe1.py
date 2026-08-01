# WS-5/WS-4 kinetic probe 1 — Q4: top-level duration overridability (pkg s15 Q4, s14 behavioural)
# Template generic_kinetic_text_9x16_v1 (0bd871ae), saved duration 35s.
# A: control (no duration override)            -> expect ~35s; also proves suffixed .text key on video family
# B: modifications carry bare 'duration': 27   -> if output ~27s, Q4=YES via modification key
# C: top-level request param duration: 27      -> run only if B != 27
# Records wall-clock per render (row-19 reliability discipline). Key never printed.
import json, pathlib, time, urllib.request, urllib.error, hashlib, subprocess

KEY = (pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8] == 'bcde13d1', 'key pin mismatch - STOP'
TPL = '0bd871ae-79c1-431a-a7bd-9f631a6cf75a'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT = pathlib.Path(__file__).parent

def req(url, body=None, method='GET'):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
        headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'User-Agent': UA})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read())

def render(name, body):
    t0 = time.time()
    try:
        j = req('https://api.creatomate.com/v1/renders', body, 'POST')
    except urllib.error.HTTPError as e:
        return {'probe': name, 'http_error': e.code, 'body': e.read().decode()[:400]}
    rid = j[0]['id']
    s = {}
    for _ in range(100):
        s = req(f'https://api.creatomate.com/v1/renders/{rid}')
        if s['status'] in ('succeeded', 'failed'):
            break
        time.sleep(3)
    rec = {'probe': name, 'render_id': rid, 'status': s['status'],
           'wall_clock_s': round(time.time() - t0, 1), 'error': s.get('error_message')}
    if s['status'] == 'succeeded':
        mp4 = OUT / f'{name}.mp4'
        rq = urllib.request.Request(s['url'], headers={'User-Agent': UA})
        with urllib.request.urlopen(rq, timeout=180) as im:
            mp4.write_bytes(im.read())
        p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'json', str(mp4)], capture_output=True, text=True)
        rec['measured_duration_s'] = round(float(json.loads(p.stdout)['format']['duration']), 2)
        rec['bytes'] = mp4.stat().st_size
        rec['sha256'] = hashlib.sha256(mp4.read_bytes()).hexdigest()
    return rec

results = []
results.append(render('A_control', {
    'template_id': TPL, 'output_format': 'mp4',
    'modifications': {'HookHeadline.text': 'Probe A: control render, saved 35s timeline'}}))
results.append(render('B_bare_duration_mod', {
    'template_id': TPL, 'output_format': 'mp4',
    'modifications': {'HookHeadline.text': 'Probe B: duration 27 via modification key', 'duration': 27}}))
b = results[-1]
if b.get('measured_duration_s') is None or abs(b.get('measured_duration_s', 0) - 27) > 1.5:
    results.append(render('C_toplevel_duration', {
        'template_id': TPL, 'output_format': 'mp4', 'duration': 27,
        'modifications': {'HookHeadline.text': 'Probe C: duration 27 as top-level param'}}))

(OUT / 'probe1_results.json').write_text(json.dumps(results, indent=2))
for r in results:
    print(json.dumps(r))
print('done')
