# WS-5/WS-4 kinetic probe 2 (structural batch) — Q2 collapse-leak + shape timing overrides + audio silence
# One render: the WS-4 pkg s5a representative composition (hook + 2 active points + Point3 COLLAPSED + cta, 27s)
# rebuilt as template-mode modifications. Collapse uses guards 1+2 ONLY (near-zero duration + empty text) —
# guard 3 (off-canvas) is unreachable in template mode under the ratified 7-suffix key vocabulary (no .y).
# Leak detection: frame-level teal-pixel scan of the Point3Bar/Divider regions at t=0.0 (inside the 0.01s
# collapse window) and t=0.5 (control) — plus full early-frame sweep 0..0.2s.
import json, pathlib, time, urllib.request, urllib.error, hashlib, subprocess

KEY = (pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8] == 'bcde13d1', 'key pin mismatch - STOP'
TPL = '0bd871ae-79c1-431a-a7bd-9f631a6cf75a'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT = pathlib.Path(__file__).parent

MODS = {
  'duration': 27,
  'HookHeadline.text': 'Probe D: two-point render, third slot collapsed',
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
  # Point3 COLLAPSED: guards 1+2 (near-zero duration + empty text); shapes rely on guard 1 alone
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
rec = {'probe': 'D_two_point_collapsed', 'render_id': rid, 'status': s['status'],
       'wall_clock_s': round(time.time() - t0, 1), 'error': s.get('error_message')}
print(json.dumps(rec))
if s['status'] != 'succeeded':
    (OUT/'probe2_results.json').write_text(json.dumps(rec, indent=2)); raise SystemExit('render failed')

mp4 = OUT/'D_two_point_collapsed.mp4'
rq = urllib.request.Request(s['url'], headers={'User-Agent': UA})
with urllib.request.urlopen(rq, timeout=180) as im:
    mp4.write_bytes(im.read())
p = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(mp4)],
                   capture_output=True, text=True)
rec['measured_duration_s'] = round(float(json.loads(p.stdout)['format']['duration']), 2)
rec['sha256'] = hashlib.sha256(mp4.read_bytes()).hexdigest()

# audio-stream check on this render AND probe-1 control
def audio_streams(path):
    q = subprocess.run(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=codec_type','-of','json',str(path)],
                       capture_output=True, text=True)
    return len(json.loads(q.stdout).get('streams', []))
rec['audio_streams_D'] = audio_streams(mp4)
p1 = OUT.parent/'ws5_kinetic_probe1_duration'/'A_control.mp4'
rec['audio_streams_probe1_control'] = audio_streams(p1) if p1.exists() else 'n/a'

# leak scan: teal (#1C8A8A) pixels in Point3Bar region (x60,y480,5x340) and Divider region (x100,y870,880x2)
# at t in {0.0, 0.033, 0.066, 0.1, 0.2} (collapse window + margin) and control t=0.5 (should be clean too:
# hook scene has no bar) and t=8.0 (Point1 ACTIVE - bar MUST be present, proves the detector works).
TEAL = (0x1C, 0x8A, 0x8A)
def teal_count(t, x, y, w, h):
    q = subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',str(mp4),'-frames:v','1',
                        '-vf',f'crop={w}:{h}:{x}:{y}','-f','rawvideo','-pix_fmt','rgb24','-'],
                       capture_output=True)
    buf = q.stdout; n = 0
    for i in range(0, len(buf) - 2, 3):
        if abs(buf[i]-TEAL[0]) < 30 and abs(buf[i+1]-TEAL[1]) < 30 and abs(buf[i+2]-TEAL[2]) < 30:
            n += 1
    return n
scan = {}
for t in (0.0, 0.033, 0.066, 0.1, 0.2, 0.5):
    scan[f't{t}'] = {'bar_region': teal_count(t, 60, 480, 5, 340),
                     'divider_region': teal_count(t, 100, 870, 880, 2)}
scan['t8.0_point1_active_detector_proof'] = {'bar_region': teal_count(8.0, 60, 480, 5, 340),
                                             'divider_region': teal_count(8.0, 100, 870, 880, 2)}
rec['leak_scan_teal_px'] = scan
leak = any(v['bar_region'] > 0 or v['divider_region'] > 0
           for k, v in scan.items() if k != 't8.0_point1_active_detector_proof')
det_ok = scan['t8.0_point1_active_detector_proof']['bar_region'] > 0
rec['leak_detected'] = leak
rec['detector_selfproof_ok'] = det_ok

# PK eyeball frames
for t, name in ((0.0,'frame_t0'),(8.0,'frame_t8_point1'),(16.0,'frame_t16_point2'),(24.0,'frame_t24_cta')):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(mp4),'-frames:v','1',str(OUT/f'{name}.png')])

(OUT/'probe2_results.json').write_text(json.dumps(rec, indent=2))
print(json.dumps({k: v for k, v in rec.items() if k != 'leak_scan_teal_px'}))
print('leak_scan:', json.dumps(scan))
print('done')
