import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-public-release.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
checks = []
with tempfile.TemporaryDirectory(prefix='sahajiv-export-probe-') as temp:
    parent = Path(temp).resolve()
    source = parent / 'source'
    source.mkdir()
    subprocess.run(['git', 'init', '-q', str(source)], check=True)
    (source / 'source.txt').write_text('current bytes\n')
    (source / 'README.md').write_text('[Source](source.txt)\n')
    subprocess.run(['git', '-C', str(source), 'add', 'source.txt', 'README.md'], check=True)
    manifest = {'files': ['README.md', 'source.txt', 'RELEASE-REPORT.md'], 'explicitUntrackedOrIgnoredAllowed': ['RELEASE-REPORT.md'], 'linkCheckDocs': ['README.md']}
    _, issues = module.prepare(source, manifest)
    assert issues == [{'file': 'RELEASE-REPORT.md', 'kind': 'FileNotFoundError'}], issues
    checks.append('Missing explicitly required report blocks preflight')
    (source / 'RELEASE-REPORT.md').write_text('Final report\n')
    buffers, issues = module.prepare(source, manifest)
    assert not issues
    (source / 'source.txt').write_text('updated current bytes\n')
    buffers, issues = module.prepare(source, manifest)
    assert not issues and buffers['source.txt'][0] == b'updated current bytes\n'
    checks.append('Reads current working bytes, including explicitly allowed untracked report')
    target = module.export(source, parent, buffers, 'test-checkpoint')
    assert target != source and target.is_dir() and not (target / '.git').exists()
    assert (target / 'source.txt').read_text() == 'updated current bytes\n'
    assert all(p.is_file() and not p.is_symlink() for p in target.iterdir())
    assert len(json.loads((target / 'PUBLIC-SNAPSHOT.json').read_text())['files']) == 3
    target2 = module.export(source, parent, buffers, 'test-checkpoint')
    assert target2 != target
    checks.append('Copies to unique NEW external directories, regular files, relative paths, hashes, no .git')
    try:
        module.export(source, source, buffers, 'test')
        raise AssertionError('Accepted destination inside source')
    except ValueError:
        pass
    checks.append('Rejects output parent inside source')
    for name in ['../escape', '/absolute', '.work/private.md', '.git/config', 'GATE-HISTORY.md', 'dir/../escape']:
        try:
            module.validate_relative(name)
            raise AssertionError('Accepted forbidden path')
        except ValueError:
            pass
    checks.append('Rejects traversal, absolute, private and historical gate paths')
    (parent / 'outside.txt').write_text('outside')
    for name, destination in [('escape.txt', parent / 'outside.txt'), ('internal.txt', source / 'source.txt')]:
        (source / name).symlink_to(destination)
        try:
            module.read_regular(source, name)
            raise AssertionError('Accepted symlink')
        except ValueError:
            pass
    checks.append('Rejects both escaping and internal symlinks')
    untracked = {**manifest, 'files': [*manifest['files'], 'untracked.txt']}
    (source / 'untracked.txt').write_text('not approved')
    _, issues = module.prepare(source, untracked)
    assert issues == [{'file': 'untracked.txt', 'kind': 'Untracked file is not explicitly authorized'}]
    checks.append('Rejects arbitrary untracked additions')
    (source / 'README.md').write_text('[Private](.work/missing.md)\n')
    _, issues = module.prepare(source, manifest)
    assert issues == [{'file': 'README.md', 'line': 1, 'kind': 'link-target-outside-export'}]
    checks.append('Blocks public Markdown links to excluded targets')
    secret_probe = ('sk-' + 'q' * 40).encode()
    found = module.scan('probe.txt', secret_probe)
    assert found == [{'file': 'probe.txt', 'line': 1, 'kind': 'secret-key'}]
    assert secret_probe.decode() not in json.dumps(found)
    checks.append('Sensitive scanner reports location/category only, never matched value')
Path(__file__).with_name('public-release-export-tests.json').write_text(json.dumps({'passed': len(checks), 'checks': checks}, indent=2) + '\n')
print(json.dumps({'passed': len(checks), 'checks': checks}, indent=2))
