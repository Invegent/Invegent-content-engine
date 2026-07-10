import json,pathlib,time,urllib.request,urllib.error,hashlib
KEY=(pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8]=='8ab5a356'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT=pathlib.Path(__file__).parent
TPL='48cba556-0a53-4001-90f0-05420d10efc0'
API='https://api.creatomate.com/v2/renders'
GUARD={'Headline.height':'22%','Headline.font_size':None,
       'Headline.font_size_minimum':'30 px','Headline.font_size_maximum':'74 px'}
BASE={'CategoryBadge.text':'MARKET',
 'Subtitle.text':'Buyers weigh yield against risk as listings tighten across inner suburbs.',
 'Location.text':'Perth, WA','Date.text':'10 Jul 2026','Footer.text':'Property Pulse'}

# All headlines are <= B1_HEADLINE_MAX_CHARS=90 (chars, post-trim) — i.e. ADMISSIBLE.
CASES={
 # E1: single unbreakable token, no spaces, at the admissible limit.
 'E1_unbreakable_token':'Supercalifragilisticexpialidociousandthensomemoreandmoreandmorewithoutanyspacesatall',
 # E2: CJK at the admissible limit. No spaces, no Latin word-break opportunities.
 'E2_cjk':'投资者仍在购买房产但他们变得更加挑剔市场收益率与风险并存内城区房源持续收紧买家需要谨慎评估每一笔交易的长期回报与潜在风险因素',
 # E3: real headline + one long unbreakable URL-ish token (the realistic hybrid).
 'E3_mixed_longtoken':'Investors weigh https://propertypulse.example.com/market-outlook-2026-q3 closely',
}
def req(url, body=None, method='GET'):
    data=json.dumps(body).encode('utf-8') if body is not None else None
    r=urllib.request.Request(url,data=data,method=method,
        headers={'Authorization':f'Bearer {KEY}','Content-Type':'application/json','User-Agent':UA})
    with urllib.request.urlopen(r,timeout=180) as resp: return json.loads(resp.read())

results={}
for name,headline in CASES.items():
    n=len(headline.strip())
    admissible = 0 < n <= 90
    script={'template_id':TPL,'output_format':'jpg',
            'modifications':{**GUARD,**BASE,'Headline.text':headline}}
    try:
        j=req(API,script,'POST')
    except urllib.error.HTTPError as e:
        print(name,'HTTP',e.code,e.read().decode()[:300]); results[name]={'status':'http_error'}; continue
    rid=(j[0] if isinstance(j,list) else j)['id']
    for _ in range(60):
        s=req(f'https://api.creatomate.com/v1/renders/{rid}')
        if s['status'] in ('succeeded','failed'): break
        time.sleep(3)
    print(f'{name:24s} chars={n:3d} admissible={admissible} -> {s["status"]} {s.get("error_message") or ""}')
    results[name]={'id':rid,'chars':n,'admissible':admissible,'status':s['status']}
    if s['status']=='succeeded':
        rq=urllib.request.Request(s['url'],headers={'User-Agent':UA})
        with urllib.request.urlopen(rq,timeout=180) as im:(OUT/f'{name}.jpg').write_bytes(im.read())
(OUT/'edge_results.json').write_text(json.dumps({'endpoint':API,'guard':{k:v for k,v in GUARD.items()},'cases':results},indent=2,ensure_ascii=False),encoding='utf-8')
