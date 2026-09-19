import json,re,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
rows=[]
for path in (root/'data').glob('*-questions.md'):
    text=path.read_text(encoding='utf-8')
    for block in re.findall(r'```json\n(.*?)\n```',text,re.S): rows.append(json.loads(block))
(root/'data'/'questions.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Built {len(rows)} questions')
