#!/usr/bin/env python3
"""Copy one verified independent Shizilin build into this static portal; no engine sharing."""
import argparse,hashlib,json,shutil,tempfile,os
from pathlib import Path

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--dist',required=True,type=Path)
parser.add_argument('--build-receipt',type=Path)
args=parser.parse_args()
source=args.dist.resolve()
if not (source/'index.html').is_file() or not (source/'assets').is_dir():raise SystemExit('Build Shizilin first.')
files={p.relative_to(source).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
if not files or any(any(part.startswith('.') or part=='node_modules' for part in Path(name).parts) for name in files):raise SystemExit('Unexpected private source artifact.')
receipt=None
if args.build_receipt:
 receipt=json.loads(args.build_receipt.read_text())
 if receipt.get('build_exit_code')!=0:raise SystemExit('Build did not pass.')
 expected={f['path'].removeprefix('dist/'):f['sha256'] for f in receipt['outputs']}
 if files!=expected:raise SystemExit('Shizilin build bytes changed after successful validation.')
(root/'.sites-runtime').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=root/'.sites-runtime',prefix='stage-shizilin-') as tmp:
 staged=Path(tmp)/'shizilin';shutil.copytree(source,staged)
 target=root/'dist/shizilin'
 if target.exists():shutil.rmtree(target)
 os.replace(staged,target)
ledger={'garden':'shizilin','source':'Independent garden production build; copied unchanged, no source/runtime imports','files':files,'build_inputs':receipt['inputs'] if receipt else None,'build_exit_code':receipt['build_exit_code'] if receipt else None}
folder=root/'docs/reviews/seam-1';folder.mkdir(parents=True,exist_ok=True)
(folder/'garden-build.json').write_text(json.dumps(ledger,indent=2)+'\n')
print(json.dumps({'staged_files':len(files),'target':str(root/'dist/shizilin')}))
