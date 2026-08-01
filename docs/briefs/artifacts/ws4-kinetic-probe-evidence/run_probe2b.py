# Probe 2b — re-run of the structural batch on the FIXED template (paths + percent opacities).
# Same s5a representative render; Windows-safe pixel reads (temp files); detector self-proof on
# BarTop (persistent teal) AND Point1Bar (teal at t=8) before trusting any "no leak".
import json, pathlib, time, urllib.request, urllib.error, hashlib, subprocess, tempfile

KEY = (pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8] == 'bcde13d1', 'key pin mismatch - STOP'
TPL = '0bd871ae-79c1-431a-a7bd-9f631a6cf75a'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT = pathlib.Path(__file__).parent
MODS = json.loads((OUT / 'probe2_mods.json').read_text()) if (OUT / 'probe2_mods.json').exists() else None
if MODS is None:
    import runpy
    MODS = {
      'duration': 27,
      'HookHeadline.text': 'Probe D2: two-point render, third slot collapsed',
      'HookHeadline.time': 0.4, 'HookHeadline.duration': 5.2,
      'HookSubtitle.time': 1.2, 'HookSubtitle.duration': 4.4,
      'Point1Counter.text': '1/2', 'Point1Counter.time': 6.15, 'Point1Counter.duration': 7.6,
      'Point1Bar.time': 6.3, 'Point1Bar.duration': 7.4,
      'Point1Headline.text': 'Point one headline renders normally', 'Point1Headline.time': 6.5, 'Point1Headline.duration': 7.2,
      'Point1Divider.time': 6.75, 'Point1Divider.duration': 7.0,
      'Point1Body.text': 'Supporting line under point one', 'Point1Body.time': 6.9, 'Point1Body.duration': 7.0,
      'Point2Counter.text': '2/2', 'Point2Counter.time': 14.15, 'Point2Counter.duration': 7.6,
      'Point2Bar.time': 14.3, 'Point2Bar.duration': 7.4,
      'Point2Headline.text': 'Point two headline also renders', 'Point2Headline.time': 14.5, 'Point2Headline.duration': 7.2,
      'Point2Divider.time': 14.75, 'Point2Divider.duration': 7.0,
      'Point2Body.text': 'Second supporting line here', 'Point2Body.time': 14.9, 'Point2Body.duration': 7.0,
      'Point3Counter.text': '', 'Point3Counter.time': 0, 'Point3Counter.duration': 0.01,
      'Point3Bar.time': 0, 'Point3Bar.duration': 0.01,
      'Point3Headline.text': '', 'Point3Headline.time': 0, 'Point3Headline.duration': 0.01,
      'Point3Divider.time': 0, 'Point3Divider.duration': 0.01,
      'Point3Body.text': '', 'Point3Body.time': 0, 'Point3Body.duration': 0.01,
      'CtaWatermark.time': 22, 'CtaWatermark.duration': 5,
      'CtaHeadline.text': 'Did the collapsed slot stay invisible?', 'CtaHeadline.time': 22.3, 'CtaHeadline.duration': 4.4,
      'CtaFooter.text': 'Follow Property Pulse for more', 'CtaFooter.time': 22.9, 'CtaFooter.duration': 3.9,
    }

def req(url, body=None, method='GET'):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
        headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'User-Agent': UA})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read())

t0 = time.time()
j = req('https://api.creatomate.com/v1/renders',
        {'template_id': TPL, 'output_format': 'mp4', 'modifications': MODS}, 'POST')
rid = j[0]['id']
s = {}
for _ in range(100):
    s = req(f'https://api.creatomate.com/v1/renders/{rid}')
    if s['status'] in ('succeeded', 'failed'):
        break
    time.sleep(3)
rec = {'probe': 'D2_two_point_collapsed_fixed', 'render_id': rid, 'status': s['status'],
       'wall_clock_s': round(time.time() - t0, 1), 'error': s.get('error_message')}
print(json.dumps(rec))
if s['status'] != 'succeeded':
    (OUT/'probe2b_results.json').write_text(json.dumps(rec, indent=2)); raise SystemExit('render failed')

mp4 = OUT/'D2_two_point_collapsed_fixed.mp4'
rq = urllib.request.Request(s['url'], headers={'User-Agent': UA})
with urllib.request.urlopen(rq, timeout=180) as im:
    mp4.write_bytes(im.read())
p = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(mp4)],
                   capture_output=True, text=True)
rec['measured_duration_s'] = round(float(json.loads(p.stdout)['format']['duration']), 2)
rec['sha256'] = hashlib.sha256(mp4.read_bytes()).hexdigest()
q = subprocess.run(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=codec_type','-of','json',str(mp4)],
                   capture_output=True, text=True)
rec['audio_streams'] = len(json.loads(q.stdout).get('streams', []))

tmp = pathlib.Path(tempfile.gettempdir()) / 'ws5px2.rgb'
def region_teal(t, x, y, w, h):
    if tmp.exists(): tmp.unlink()
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(mp4),'-frames:v','1',
                    '-vf',f'crop={w}:{h}:{x}:{y}','-f','rawvideo','-pix_fmt','rgb24',str(tmp)],
                   capture_output=True)
    b = tmp.read_bytes() if tmp.exists() else b''
    n = 0
    for i in range(0, len(b) - 2, 3):
        if abs(b[i]-0x1C) < 40 and abs(b[i+1]-0x8A) < 45 and abs(b[i+2]-0x8A) < 45:
            n += 1
    return {'teal': n, 'sampled': len(b)//3}

# self-proof FIRST: BarTop (full-opacity persistent) + Point1Bar (70% over navy) at t=8
sp = {'bartop_t8': region_teal(8, 0, 140, 1080, 8),
      'point1bar_t8': region_teal(8, 58, 500, 10, 300)}
rec['detector_selfproof'] = sp
det_ok = sp['bartop_t8']['teal'] > 1000 and sp['point1bar_t8']['teal'] > 100
rec['detector_selfproof_ok'] = det_ok

# leak scan: Point3Bar/Divider regions in the collapse window + margins (Point1/2 inactive then)
scan = {}
for t in (0.0, 0.033, 0.066, 0.1, 0.2, 0.5, 1.0):
    scan[f't{t}'] = {'bar': region_teal(t, 58, 500, 10, 300), 'divider': region_teal(t, 100, 869, 880, 4)}
rec['leak_scan'] = scan
rec['leak_detected'] = any(v['bar']['teal'] > 5 or v['divider']['teal'] > 5 for v in scan.values())
rec['q2_verdict'] = ('NO_LEAK' if (det_ok and not rec['leak_detected'])
                     else 'LEAK' if (det_ok and rec['leak_detected'])
                     else 'DETECTOR_INVALID')

for t, name in ((0.0,'D2_frame_t0'),(8.0,'D2_frame_t8_point1'),(16.0,'D2_frame_t16_point2'),(24.0,'D2_frame_t24_cta')):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(mp4),'-frames:v','1',str(OUT/f'{name}.png')])

(OUT/'probe2b_results.json').write_text(json.dumps(rec, indent=2))
print(json.dumps({k: v for k, v in rec.items() if k not in ('leak_scan',)}))
print('leak_scan:', json.dumps(scan))
print('done')
