#!/usr/bin/env python3
"""One fresh public clone/install/build receipt. No manual source edits or browser gate."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time

repo_url = 'https://github.com/luv-jeri/sahajiv-ui.git'
node_bin = Path('/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin')
output = Path(__file__).resolve().parent
workspace = Path(tempfile.mkdtemp(prefix='sahajiv-ui-fresh-source-', dir='/tmp')).resolve()
checkout = workspace / 'repo'
env = os.environ.copy()
env['PATH'] = str(node_bin) + os.pathsep + env.get('PATH', '')
receipt = {'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'repository': repo_url, 'checkout': str(checkout), 'steps': []}

def command(label, args, cwd):
    start = time.monotonic()
    process = subprocess.run(['rtk', 'proxy', *args], cwd=cwd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    elapsed = round(time.monotonic() - start, 3)
    log = output / f'fresh-public-clone-{label}.log'
    log.write_text(process.stdout)
    receipt['steps'].append({'label': label, 'command': args, 'seconds': elapsed, 'exitCode': process.returncode, 'log': log.name})
    (output / 'fresh-public-clone-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'step': label, 'seconds': elapsed, 'exitCode': process.returncode}), flush=True)
    if process.returncode:
        raise RuntimeError(f'{label} failed; inspect its local log')
    return process.stdout.strip()

try:
    command('clone', ['git', 'clone', '--branch', 'main', '--single-branch', repo_url, str(checkout)], workspace)
    receipt['remoteCommit'] = command('commit', ['git', 'rev-parse', 'HEAD'], checkout)
    receipt['gitTree'] = command('tree', ['git', 'rev-parse', 'HEAD^{tree}'], checkout)
    receipt['initialStatus'] = command('initial-status', ['git', 'status', '--porcelain=v1'], checkout)
    assert receipt['initialStatus'] == '', 'Fresh clone is not initially clean'
    receipt['nodeVersion'] = command('node-version', ['node', '--version'], checkout)
    receipt['npmVersion'] = command('npm-version', ['npm', '--version'], checkout)
    tracked = subprocess.check_output(['rtk', 'proxy', 'git', 'ls-files', '-z'], cwd=checkout, env=env).decode().split('\0')[:-1]
    entries = [{'path': name, 'sha256': hashlib.sha256((checkout / name).read_bytes()).hexdigest()} for name in sorted(tracked)]
    receipt['trackedFiles'] = len(entries)
    receipt['sourceFingerprintAlgorithm'] = 'SHA256 of sorted relative-path + NUL + per-file SHA256 + LF'
    receipt['sourceFingerprint'] = hashlib.sha256(''.join(x['path'] + '\0' + x['sha256'] + '\n' for x in entries).encode()).hexdigest()
    receipt['lockfileSha256'] = hashlib.sha256((checkout / 'package-lock.json').read_bytes()).hexdigest()
    command('npm-ci', ['npm', 'ci'], checkout)
    command('build', ['npm', 'run', 'build'], checkout)
    registry = json.loads((checkout / 'public/r/registry.json').read_text())
    items = registry['items']
    receipt['registryItems'] = len(items)
    receipt['uiItems'] = sum(x.get('type') == 'registry:ui' for x in items)
    assert (receipt['registryItems'], receipt['uiItems']) == (78, 77), 'Unexpected registry count'
    receipt['registrySha256'] = hashlib.sha256((checkout / 'public/r/registry.json').read_bytes()).hexdigest()
    receipt['builtRegistrySha256'] = hashlib.sha256((checkout / 'out/r/registry.json').read_bytes()).hexdigest()
    assert receipt['registrySha256'] == receipt['builtRegistrySha256'], 'Published registry differs from generated registry'
    findings = []
    scanned = 0
    pattern = re.compile(r'/Users/|/Volumes/|/private/var/|/home/|[A-Za-z]:\\(?:Users|Documents)\\|file://|/private/tmp/|/tmp/sahajiv-ui-fresh-source-')
    for name in ['public', 'out/r']:
        for file in sorted((checkout / name).rglob('*')):
            if not file.is_file():
                continue
            raw = file.read_bytes()
            if b'\0' in raw:
                continue
            scanned += 1
            text = raw.decode('utf8', errors='replace')
            for match in pattern.finditer(text):
                findings.append({'path': str(file.relative_to(checkout)), 'line': text.count('\n', 0, match.start()) + 1, 'kind': 'absolute-local-path'})
    receipt['publicTextFilesScanned'] = scanned
    receipt['absolutePathFindings'] = findings
    assert not findings, 'Generated public content contains absolute local paths'
    receipt['finalStatus'] = command('final-status', ['git', 'status', '--porcelain=v1'], checkout)
    receipt['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    receipt['verdict'] = 'PASS'
finally:
    if 'verdict' not in receipt:
        receipt['verdict'] = 'FAIL'
    (output / 'fresh-public-clone-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({k: v for k, v in receipt.items() if k != 'steps'}, indent=2), flush=True)
