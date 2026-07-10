import json,os,pathlib,time,urllib.request,hashlib
KEY=(pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8]=='8ab5a356', 'wrong key'
TPL='48cba556-0a53-4001-90f0-05420d10efc0'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT=pathlib.Path(__file__).parent

# Real colliding headline: 69 chars, renders 4 lines (CALIBRATION_FINDINGS.md:64)
H='Investors are still buying — they are just being a lot more selective'
BASE={'CategoryBadge.text':'MARKET','Headline.text':H,
 'Subtitle.text':'Buyers weigh yield against risk as listings tighten across inner suburbs.',
 'Location.text':'Perth, WA','Date.text':'10 Jul 2026','Footer.text':'Property Pulse'}

PROBES={
 'P1a_control':      dict(BASE),
 'P1b_subtitle_y':   dict(BASE, **{'Subtitle.y':'60%'}),
 'P1c_autoshrink':   dict(BASE, **{'Headline.height':'24%','Headline.font_size':None,
                                   'Headline.font_size_minimum':'30 px','Headline.font_size_maximum':'74 px'}),
}

def req(url, body=None, method='GET'):
    data=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(url,data=data,method=method,
        headers={'Authorization':f'Bearer {KEY}','Content-Type':'application/json','User-Agent':UA})
    with urllib.request.urlopen(r,timeout=120) as resp: return json.loads(resp.read())

results={}
for name,mods in PROBES.items():
    try:
        j=req('https://api.creatomate.com/v1/renders',{'template_id':TPL,'modifications':mods,'output_format':'png'},'POST')
    except urllib.error.HTTPError as e:
        body=e.read().decode()[:400]
        results[name]={'http_error':e.code,'body':body}
        print(f'{name}: HTTP {e.code} {body}')
        continue
    rid=j[0]['id']
    for _ in range(60):
        s=req(f'https://api.creatomate.com/v1/renders/{rid}')
        if s['status'] in ('succeeded','failed'): break
        time.sleep(3)
    results[name]={'id':rid,'status':s['status'],'url':s.get('url'),'error':s.get('error_message')}
    print(f"{name}: {s['status']} {s.get('error_message') or ''}")
    if s['status']=='succeeded':
        rq=urllib.request.Request(s['url'],headers={'User-Agent':UA})
        with urllib.request.urlopen(rq,timeout=120) as im:
            (OUT/f'{name}.png').write_bytes(im.read())

(OUT/'p1_results.json').write_text(json.dumps(results,indent=2))
print('done')
