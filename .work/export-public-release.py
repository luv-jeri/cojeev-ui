#!/usr/bin/env python3
"""Export current allowlisted bytes to a newly created external temporary directory.

No Git history, network access, package execution, source writes or existing-target
writes. Use --check for a read-only preflight. Requires Python 3.9+ and Git.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit

DENIED = {'.git', '.work', '.worktrees', 'output', 'artifacts', 'node_modules', '.next', '.next-dev', 'out', '.env', 'AGENTS.md', 'CLAUDE.md', 'PHASE-0-DECISION.md'}
PATTERNS = {
    'private-absolute-path': r'(?:/Users/[^\s"\x27`<>]+|/home/[^\s"\x27`<>]+|[A-Z]:\\Users\\[^\s"\x27`<>]+|/private/var/folders/[^\s"\x27`<>]+)',
    'private-file-url': r'file://[^\s)]+',
    'secret-key': r'(?:AKIA[0-9A-Z]{16}|(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{24,})|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{35})',
    'private-key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'embedded-credential': r'(?:https?|postgres(?:ql)?|mysql|redis)://[^\s:/]+:[^\s@/]+@',
    'assigned-secret': r'(?i)(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["\x27]([^"\x27]{12,})["\x27]',
}


def contained(child, parent):
    return child == parent or parent in child.parents


def validate_relative(name):
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or any(p in ('', '.', '..') for p in path.parts) or '\\' in name or str(path) != name:
        raise ValueError('Non-normalized manifest path')
    if any(p in DENIED or p.startswith('.env') for p in path.parts) or path.name.startswith('GATE-'):
        raise ValueError('Denied manifest path')
    return path


def read_regular(root, name):
    relative = validate_relative(name)
    candidate = root.joinpath(*relative.parts)
    resolved = candidate.resolve(strict=True)
    if not contained(resolved, root):
        raise ValueError('Escaping symlink rejected')
    # Only regular files are exported. Even an internal symlink must be explicitly
    # replaced with a reviewed regular source file before release.
    cursor = root
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise ValueError('Symlink rejected')
    with candidate.open('rb') as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise ValueError('Non-regular file rejected')
        data = stream.read()
        end = os.fstat(stream.fileno())
    if (info.st_mtime_ns, info.st_size) != (end.st_mtime_ns, end.st_size):
        raise ValueError('File changed while reading; retry after writes finish')
    return data, info


def scan(name, data):
    if b'\0' in data:
        return []
    text = data.decode('utf-8', errors='replace')
    return [{'file': name, 'line': text.count('\n', 0, match.start()) + 1, 'kind': kind}
            for kind, pattern in PATTERNS.items() for match in re.finditer(pattern, text)]


def check_links(docs, buffers):
    issues = []
    for name in docs:
        if name not in buffers:
            continue
        text = buffers[name][0].decode('utf-8')
        for line, content in enumerate(text.splitlines(), 1):
            for match in re.finditer(r'\]\((<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)', content):
                raw = match.group(1).strip('<>')
                parsed = urlsplit(raw)
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                destination = unquote(parsed.path)
                target = PurePosixPath(name).parent / destination
                # Relative links may legitimately contain .. within the export.
                parts = []
                for part in target.parts:
                    if part == '..':
                        if parts:
                            parts.pop()
                        else:
                            parts = ['__outside_export__']
                            break
                    elif part not in ('.', ''):
                        parts.append(part)
                target = '/'.join(parts)
                if destination.startswith('/') or (target not in buffers and not any(x.startswith(target.rstrip('/') + '/') for x in buffers)):
                    issues.append({'file': name, 'line': line, 'kind': 'link-target-outside-export'})
    return issues


def prepare(root, manifest):
    names = manifest['files']
    if len(names) != len(set(names)):
        raise ValueError('Duplicate manifest entry')
    explicit = set(manifest['explicitUntrackedOrIgnoredAllowed'])
    tracked = set(subprocess.check_output(['git', '-C', str(root), 'ls-files', '-z']).decode().split('\0'))
    buffers, issues = {}, []
    for name in names:
        try:
            validate_relative(name)
            if name not in tracked and name not in explicit:
                raise ValueError('Untracked file is not explicitly authorized')
            buffers[name] = read_regular(root, name)
            issues.extend(scan(name, buffers[name][0]))
        except (OSError, ValueError) as error:
            # Error class/message intentionally excludes source contents or paths.
            kind = str(error) if isinstance(error, ValueError) else type(error).__name__
            issues.append({'file': name, 'kind': kind})
    issues.extend(check_links(manifest['linkCheckDocs'], buffers))
    return buffers, issues


def export(root, parent, buffers, revision):
    parent = parent.resolve(strict=True)
    if contained(parent, root):
        raise ValueError('Destination parent must be outside the source checkout')
    # A fresh random directory is the only destination accepted; no --destination
    # overwrite mode exists, even for a directory that currently looks empty.
    target = Path(tempfile.mkdtemp(prefix='sahajiv-ui-release-', dir=parent))
    receipt = {'schema': 1, 'sourceRevision': revision, 'files': []}
    for name, (data, info) in sorted(buffers.items()):
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('xb') as stream:
            stream.write(data)
        destination.chmod(0o755 if info.st_mode & 0o111 else 0o644)
        receipt['files'].append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    with (target / 'PUBLIC-SNAPSHOT.json').open('x', encoding='utf-8') as stream:
        json.dump(receipt, stream, indent=2)
        stream.write('\n')
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Main checkout to read at execution time')
    parser.add_argument('--parent', type=Path, default=Path(tempfile.gettempdir()), help='Existing external parent for a NEW temporary directory')
    parser.add_argument('--check', action='store_true', help='Read-only preflight; create no output directory')
    args = parser.parse_args()
    root = args.source.resolve(strict=True)
    manifest = json.loads(Path(__file__).with_name('public-release-manifest.json').read_text())
    buffers, issues = prepare(root, manifest)
    if issues:
        # Never print matched values, lines of source, credentials or user paths.
        print(json.dumps({'ready': False, 'findings': issues}, indent=2))
        return 1
    revision = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD']).decode().strip()
    if args.check:
        print(json.dumps({'ready': True, 'files': len(buffers), 'bytes': sum(len(v[0]) for v in buffers.values()), 'sourceRevision': revision}))
        return 0
    target = export(root, args.parent, buffers, revision)
    print(json.dumps({'ready': True, 'destination': str(target), 'files': len(buffers), 'receipt': 'PUBLIC-SNAPSHOT.json'}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
