import hashlib, json, glob, os

inv = json.load(open('inventory.json', encoding='utf-8'))
claim = '620c77b43edc557a7f1790b15c27c4f2c993fd1588afb1322ee001c2073743cb'
h = hashlib.sha256(open('final/perth_cbd_day_hero.jpg', 'rb').read()).hexdigest()
print('best-pick final hash:', 'MATCH' if h == claim else 'MISMATCH!')

excl = {'8279d87d9464c2bb86cfaa6f198b2ae96a516ec56c14e7fae9f5e0166c0ce8d3',
        '2f5bf534bb12275c7fe0a5f74ccac5d2cf8ea49f40847b6fa87caa1b08be4777',
        '6008d5526e9df1b3b150d76654e4ea07a9a8b97a3bf83037525e8f08c2e99318'}
inv_map = {}
for k, v in inv.items():
    inv_map[k.replace(os.sep, '/')] = v if isinstance(v, str) else (v.get('sha256') if isinstance(v, dict) else None)

bad = mismatch = n = 0
for f in glob.glob('images/*.jpg') + glob.glob('final/*.jpg'):
    key = f.replace(os.sep, '/')
    h = hashlib.sha256(open(f, 'rb').read()).hexdigest()
    n += 1
    if h in excl:
        bad += 1
        print('FRESHNESS VIOLATION', f)
    rec = inv_map.get(key)
    if rec and rec != h:
        mismatch += 1
        print('INV MISMATCH', f)
print(f'{n} files: freshness violations={bad}, inventory mismatches={mismatch}')
m = json.load(open('harvester_manifest.json', encoding='utf-8'))
print('mm_d verdict:', m['rows'][1]['verdict'], '| best_pick:', m['rows'][1]['best_pick'], '| candidates:', m['rows'][1]['candidates_count'])
print('search_log.md bytes:', os.path.getsize('search_log.md'))
