# Builds public/fonts/lekh-digits.woff2 (see the Lekh Digits note in src/index.css).
# usage: python3 scripts/build-digit-font.py <NotoSansDevanagari.woff2> public/fonts/lekh-digits.woff2
# Needs fonttools + brotli. Bakes the NEP locl forms of the digits into the cmap.
import sys
from fontTools.ttLib import TTFont
from fontTools import subset
src, out = sys.argv[1], sys.argv[2]
f = TTFont(src)
g = f['GSUB'].table
digits = {c: f.getBestCmap()[c] for c in range(0x966, 0x970)}
names = set(digits.values())
lookups = set()
for sr in g.ScriptList.ScriptRecord:
    if sr.ScriptTag not in ('dev2', 'deva'): continue
    for l in sr.Script.LangSysRecord:
        if l.LangSysTag != 'NEP ': continue
        for fi in l.LangSys.FeatureIndex:
            fr = g.FeatureList.FeatureRecord[fi]
            if fr.FeatureTag == 'locl': lookups.update(fr.Feature.LookupListIndex)
subst = {}
for li in sorted(lookups):
    lk = g.LookupList.Lookup[li]
    for st in lk.SubTable:
        t = st.ExtSubTable if lk.LookupType == 7 else st
        if getattr(t, 'mapping', None):
            for a, b in t.mapping.items():
                if a in names: subst[a] = b
print('NEP locl digit substitutions:', subst)
# Bake: point the digit code points straight at the Nepali glyphs.
for table in f['cmap'].tables:
    for c in range(0x966, 0x970):
        if c in table.cmap and table.cmap[c] in subst:
            table.cmap[c] = subst[table.cmap[c]]
tmp = out + '.ttf'
f.flavor = None
f.save(tmp)
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.name_IDs = ['*']; opts.notdef_outline = True
s = subset.Subsetter(opts); s.populate(unicodes=range(0x966, 0x970))
ff = TTFont(tmp); s.subset(ff); ff.flavor = 'woff2'; ff.save(out)
chk = TTFont(out); print('cmap', {hex(k): v for k, v in chk.getBestCmap().items()}, 'axes', [(a.axisTag, a.minValue, a.maxValue) for a in chk['fvar'].axes])
