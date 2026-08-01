# WS-5/WS-4 probe 3 — text calibration batch (the 10 calibration_required items)
# R1: realistic text at each field's exact char gate (hook 60, point headline 55, body 100, cta 65,
#     subtitle 40, counter 5, footer 50). R2: wide-glyph worst case at the same counts.
# Template timings are the saved 35s baked layout -> text-only modifications, no timing keys.
# Frames extracted per scene; caption-band (y1300-1520) intrusion measured on point scenes.
import json, pathlib, time, urllib.request, urllib.error, hashlib, subprocess, tempfile

KEY = (pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8] == 'bcde13d1', 'key pin mismatch - STOP'
TPL = '0bd871ae-79c1-431a-a7bd-9f631a6cf75a'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT = pathlib.Path(__file__).parent

def wide(n):
    s = ('mmmmmm ' * (n // 6 + 2))[:n]
    return (s[:-1] + 'm') if s.endswith(' ') else s

R1 = {
  'HookHeadline.text': 'Perth listings fell faster than any month since early winter',        # 60
  'HookSubtitle.text': '↓ Keep watching for the full market wrap',                        # 40
  'Point1Counter.text': '10/10', 'Point2Counter.text': '10/10', 'Point3Counter.text': '10/10', # 5
  'Point1Headline.text': 'Median asking rents climbed nine percent over the years',            # 55
  'Point2Headline.text': 'Vacancy tightened again as new supply kept slipping far',            # 55
  'Point3Headline.text': 'Buyers keep competing hard for every single new listing',            # 55
  'Point1Body.text': 'Tenants are moving earlier and offering above asking to secure homes before the spring rush arrives.',   # 100
  'Point2Body.text': 'Investors returned to the market and first home buyers now face far more competition at every level.',   # 100
  'Point3Body.text': 'Agents report shorter campaigns and stronger clearance rates across nearly all of the inner suburbs.',   # 100
  'CtaHeadline.text': 'Wondering what these shifts mean for the value of your own homes?',     # 65
  'CtaFooter.text': 'Follow Care for Welfare Community Housing for more',                      # 50 (longest client name)
}
EXPECT = {'HookHeadline': 60, 'HookSubtitle': 40, 'Point1Counter': 5, 'Point2Counter': 5, 'Point3Counter': 5,
          'Point1Headline': 55, 'Point2Headline': 55, 'Point3Headline': 55,
          'Point1Body': 100, 'Point2Body': 100, 'Point3Body': 100, 'CtaHeadline': 65, 'CtaFooter': 50}
for k, v in R1.items():
    name = k.split('.')[0]
    assert len(v) == EXPECT[name], f'{k}: {len(v)} != {EXPECT[name]}'
R2 = {k: wide(EXPECT[k.split('.')[0]]) for k in R1}
for k, v in R2.items():
    assert len(v) == EXPECT[k.split('.')[0]]

def req(url, body=None, method='GET'):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
        headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'User-Agent': UA})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read())

tmp = pathlib.Path(tempfile.gettempdir()) / 'ws5cal.rgb'
def band_intrusion(mp4, t):
    # non-navy pixels in the caption band y1300-1520 (canvas #0A2A4A = 10,42,74)
    if tmp.exists(): tmp.unlink()
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(mp4),'-frames:v','1',
                    '-vf','crop=1080:220:0:1300','-f','rawvideo','-pix_fmt','rgb24',str(tmp)],
                   capture_output=True)
    b = tmp.read_bytes() if tmp.exists() else b''
    n = sum(1 for i in range(0, len(b) - 2, 3)
            if abs(b[i]-10) > 20 or abs(b[i+1]-42) > 20 or abs(b[i+2]-74) > 20)
    return {'nonnavy': n, 'sampled': len(b)//3}

results = []
for label, mods in (('R1_realistic', R1), ('R2_wideglyph', R2)):
    t0 = time.time()
    try:
        j = req('https://api.creatomate.com/v1/renders',
                {'template_id': TPL, 'output_format': 'mp4', 'modifications': mods}, 'POST')
    except urllib.error.HTTPError as e:
        results.append({'probe': label, 'http_error': e.code, 'body': e.read().decode()[:300]}); continue
    rid = j[0]['id']
    s = {}
    for _ in range(100):
        s = req(f'https://api.creatomate.com/v1/renders/{rid}')
        if s['status'] in ('succeeded', 'failed'): break
        time.sleep(3)
    rec = {'probe': label, 'render_id': rid, 'status': s['status'],
           'wall_clock_s': round(time.time() - t0, 1), 'error': s.get('error_message'), 'url': s.get('url')}
    if s['status'] == 'succeeded':
        mp4 = OUT / f'{label}.mp4'
        rq = urllib.request.Request(s['url'], headers={'User-Agent': UA})
        with urllib.request.urlopen(rq, timeout=180) as im:
            mp4.write_bytes(im.read())
        rec['sha256'] = hashlib.sha256(mp4.read_bytes()).hexdigest()
        p = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(mp4)],
                           capture_output=True, text=True)
        rec['measured_duration_s'] = round(float(json.loads(p.stdout)['format']['duration']), 2)
        for t, scene in ((3.0,'hook'), (10.0,'point1'), (18.0,'point2'), (26.0,'point3'), (33.0,'cta')):
            subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(mp4),'-frames:v','1',
                            str(OUT / f'{label}_{scene}.png')])
        rec['caption_band_intrusion'] = {sc: band_intrusion(mp4, t)
                                         for t, sc in ((10.0,'point1'), (18.0,'point2'), (26.0,'point3'))}
    results.append(rec)
    print(json.dumps(rec))

(OUT / 'calibration_results.json').write_text(json.dumps(results, indent=2))
print('done')
