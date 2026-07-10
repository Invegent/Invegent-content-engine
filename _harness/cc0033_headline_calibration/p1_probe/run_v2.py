import json,pathlib,time,urllib.request,urllib.error,hashlib
KEY=(pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8]=='8ab5a356'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT=pathlib.Path(__file__).parent
TPL='48cba556-0a53-4001-90f0-05420d10efc0'
API='https://api.creatomate.com/v2/renders'   # <-- the PRODUCTION endpoint (index.ts:312)

# The real 4-line colliding headline. Guard values copied byte-for-byte from
# TMR_WINNER_LAYOUT_GUARD in the cc-0033a diff.
GUARD={'Headline.height':'22%','Headline.font_size':None,
       'Headline.font_size_minimum':'30 px','Headline.font_size_maximum':'74 px'}
TEXT={'CategoryBadge.text':'MARKET',
 'Headline.text':'Investors are still buying — they are just being a lot more selective',
 'Subtitle.text':'Buyers weigh yield against risk as listings tighten across inner suburbs.',
 'Location.text':'Perth, WA','Date.text':'10 Jul 2026','Footer.text':'Property Pulse'}

def req(url, body=None, method='GET'):
    data=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(url,data=data,method=method,
        headers={'Authorization':f'Bearer {KEY}','Content-Type':'application/json','User-Agent':UA})
    with urllib.request.urlopen(r,timeout=180) as resp: return json.loads(resp.read())

# EXACT production render-script shape: index.ts:689
script={'template_id':TPL,'modifications':{**GUARD,**TEXT},'output_format':'jpg'}
print('POST', API)
try:
    j=req(API, script, 'POST')
except urllib.error.HTTPError as e:
    print('HTTP',e.code, e.read().decode()[:500]); raise SystemExit(1)
print('accepted:', json.dumps(j)[:200])
rid = (j[0] if isinstance(j,list) else j)['id']
for _ in range(60):
    s=req(f'https://api.creatomate.com/v1/renders/{rid}')
    if s['status'] in ('succeeded','failed'): break
    time.sleep(3)
print('V2 probe:', s['status'], s.get('error_message') or '')
if s['status']=='succeeded':
    rq=urllib.request.Request(s['url'],headers={'User-Agent':UA})
    with urllib.request.urlopen(rq,timeout=180) as im: (OUT/'V2_guard_production_shape.jpg').write_bytes(im.read())
    (OUT/'v2_result.json').write_text(json.dumps({'id':rid,'endpoint':API,'status':s['status'],
        'output_format':'jpg','modifications_sent':{k:v for k,v in script['modifications'].items() if not k.endswith('.text')}},indent=2))
