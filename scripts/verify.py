import json,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[1]
q=json.loads((root/'data'/'questions.json').read_text(encoding='utf-8'))
ids=[x['id'] for x in q]; assert len(ids)==len(set(ids)),'duplicate ids'
counts=collections.Counter(x['subject'] for x in q)
required={'id','subject','topic','type','prompt','options','answer','rule','explanation','timeLimitSec'}

failures=collections.defaultdict(list)
for x in q:
    subj=x.get('subject','?')
    if not (required<=x.keys()):
        failures[subj].append(f"{x['id']}: missing field(s) {required-x.keys()}")
        continue
    opts=x['options']
    if len(opts)!=5:
        failures[subj].append(f"{x['id']}: expected 5 options, got {len(opts)}")
    if len(set(opts))!=len(opts):
        failures[subj].append(f"{x['id']}: options are not all distinct")
    if opts.count(x['answer'])!=1:
        failures[subj].append(f"{x['id']}: answer must appear exactly once among options, found {opts.count(x['answer'])}")
    if not ({'de','en','ar'}<=x['explanation'].keys()):
        failures[subj].append(f"{x['id']}: explanation missing de/en/ar")

if failures:
    total=sum(len(v) for v in failures.values())
    print(f'FAIL {total} problem(s) across {len(failures)} subject(s):', dict(counts))
    for subj in sorted(failures):
        print(f'-- {subj}: {len(failures[subj])} failing --')
        for line in failures[subj]:
            print(' ', line)
    raise SystemExit(1)

print('PASS', dict(counts), '5 distinct options each, valid answers')
