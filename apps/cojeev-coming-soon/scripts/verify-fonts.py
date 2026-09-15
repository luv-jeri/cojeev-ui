"""Verify the generated fonts retain variable glyph shapes and metrics."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

root = Path(__file__).resolve().parents[1] / 'src/fonts'
comparisons = 0
for slug in ['bricolage-grotesque', 'dm-sans']:
    full = TTFont(root / f'{slug}-full.woff2')
    common = TTFont(root / f'{slug}-common.woff2')
    axes = lambda font: [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in font['fvar'].axes]
    assert axes(full) == axes(common), f'{slug}: variable axes changed'
    a, b = full.getBestCmap(), common.getBestCmap()
    for weight in [340, 400, 500, 620, 700, 800]:
        sizes = [12, 18, 32, 64, 96] if slug.startswith('bricolage') else [9, 14, 26, 40]
        for size in sizes:
            location = {'wght': weight, 'opsz': size, 'wdth': 100}
            original = full.getGlyphSet(location=location)
            subset = common.getGlyphSet(location=location)
            for codepoint in b:
                left, right = DecomposingRecordingPen(original), DecomposingRecordingPen(subset)
                original[a[codepoint]].draw(left)
                subset[b[codepoint]].draw(right)
                assert len(left.value) == len(right.value), (slug, codepoint, 'contours')
                for (op_a, pts_a), (op_b, pts_b) in zip(left.value, right.value):
                    assert op_a == op_b and len(pts_a) == len(pts_b), (slug, codepoint, 'topology')
                    for point_a, point_b in zip(pts_a, pts_b):
                        if point_a is None:
                            assert point_b is None
                        else:
                            assert point_b is not None and all(abs(x-y) < 1e-6 for x,y in zip(point_a, point_b)), (slug, weight, size, codepoint, 'outline')
                assert abs(original[a[codepoint]].width - subset[b[codepoint]].width) < 1e-6, (slug, codepoint, 'advance')
                comparisons += 1
print(f'{comparisons} variable glyph outline and advance comparisons passed; all original axes retained.')
