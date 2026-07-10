import json,pathlib,time,urllib.request,hashlib
KEY=(pathlib.Path.home()/'Downloads'/'creatomate api key.txt').read_text(encoding='utf-8').strip()
assert hashlib.sha256(KEY.encode()).hexdigest()[:8]=='8ab5a356'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
OUT=pathlib.Path(__file__).parent; TPL='48cba556-0a53-4001-90f0-05420d10efc0'
API='https://api.creatomate.com/v2/renders'
GUARD={'Headline.height':'22%','Headline.font_size':None,'Headline.font_size_minimum':'30 px','Headline.font_size_maximum':'74 px'}
BASE={'CategoryBadge.text':'MARKET','Subtitle.text':'Buyers weigh yield against risk as listings tighten across inner suburbs.',
 'Location.text':'Perth, WA','Date.text':'10 Jul 2026','Footer.text':'Property Pulse'}
TOK='Supercalifragilisticexpialidociousandthensomemoreandmoreandmorewithoutanyspacesatall'
CASES={
 'E1x_control_noguard': ({}, TOK),                                   # is the overflow PRE-EXISTING?
 'E1y_guard_plus_width': ({**GUARD,'Headline.width':'88%'}, TOK),    # does a width bound close it?
}
def req(u,b=None,m='GET'):
    d=json.dumps(b).encode('utf-8') if b is not None else None
    r=urllib.request.Request(u,data=d,method=m,headers={'Authorization':f'Bearer {KEY}','Content-Type':'application/json','User-Agent':UA})
    with urllib.request.urlopen(r,timeout=180) as x: return json.loads(x.read())
res={}
for name,(g,h) in CASES.items():
    s=None
    j=req(API,{'template_id':TPL,'output_format':'jpg','modifications':{**g,**BASE,'Headline.text':h}},'POST')
    rid=(j[0] if isinstance(j,list) else j)['id']
    for _ in range(60):
        s=req(f'https://api.creatomate.com/v1/renders/{rid}')
        if s['status'] in ('succeeded','failed'): break
        time.sleep(3)
    print(f'{name:24s} -> {s["status"]}')
    res[name]={'id':rid,'status':s['status'],'guard_keys':sorted(g)}
    if s['status']=='succeeded':
        rq=urllib.request.Request(s['url'],headers={'User-Agent':UA})
        with urllib.request.urlopen(rq,timeout=180) as im:(OUT/f'{name}.jpg').write_bytes(im.read())
(OUT/'edge2_results.json').write_text(json.dumps(res,indent=2),encoding='utf-8')
