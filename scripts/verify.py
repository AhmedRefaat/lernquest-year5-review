import json,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[1]
q=json.loads((root/'data'/'questions.json').read_text(encoding='utf-8'))
assert len(q)==900, len(q)
ids=[x['id'] for x in q]; assert len(ids)==len(set(ids))
counts=collections.Counter(x['subject'] for x in q); assert counts=={'German':300,'English':300,'Math':300},counts
required={'id','subject','topic','type','prompt','options','answer','rule','explanation','timeLimitSec'}
for x in q:
    assert required<=x.keys(),x['id']; assert x['answer'] in x['options'],x['id']; assert {'de','en','ar'}<=x['explanation'].keys(),x['id']
print('PASS',dict(counts),'unique IDs and valid answers')
