import json,pathlib,time,urllib.request,hashlib
KEY=(pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8]=='8ab5a356'
TPL='48cba556-0a53-4001-90f0-05420d10efc0'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT=pathlib.Path(__file__).parent
# WORST CASE: the longest headline the 90-char sanity gate can admit (90 chars).
H='Investors are still buying across the inner suburbs, but they are being far more selective'
assert len(H)==90, len(H)  # exactly B1_HEADLINE_MAX_CHARS
BASE={'CategoryBadge.text':'MARKET','Headline.text':H,
 'Subtitle.text':'Buyers weigh yield against risk as listings tighten across inner suburbs, agents say.',
 'Location.text':'Perth, WA','Date.text':'10 Jul 2026','Footer.text':'Property Pulse'}
FINAL={**BASE,'Headline.height':'22%','Headline.font_size':None,
 'Headline.font_size_minimum':'30 px','Headline.font_size_maximum':'74 px','Subtitle.y':'60%'}
def req(url, body=None, method='GET'):
    data=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(url,data=data,method=method,
        headers={'Authorization':f'Bearer {KEY}','Content-Type':'application/json','User-Agent':UA})
    with urllib.request.urlopen(r,timeout=120) as resp: return json.loads(resp.read())
j=req('https://api.creatomate.com/v1/renders',{'template_id':TPL,'modifications':FINAL,'output_format':'png'},'POST')
rid=j[0]['id']
for _ in range(60):
    s=req(f'https://api.creatomate.com/v1/renders/{rid}')
    if s['status'] in ('succeeded','failed'): break
    time.sleep(3)
print('P1d_final_worstcase:',s['status'],s.get('error_message') or '')
if s['status']=='succeeded':
    rq=urllib.request.Request(s['url'],headers={'User-Agent':UA})
    with urllib.request.urlopen(rq,timeout=120) as im:
        (OUT/'P1d_final_worstcase.png').write_bytes(im.read())
    (OUT/'p1d_result.json').write_text(json.dumps({'id':rid,'status':s['status'],'headline_chars':len(H),'modifications':{k:v for k,v in FINAL.items() if not k.endswith('.text')}},indent=2))
