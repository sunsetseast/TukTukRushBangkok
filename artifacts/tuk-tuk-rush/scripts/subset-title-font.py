"""Optional reproducible asset authoring; runtime requires no Python or font download."""
import hashlib, io, pathlib, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
source = 'https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/lilitaone/LilitaOne-Regular.ttf'
data = urllib.request.urlopen(source, timeout=30).read()
assert hashlib.sha256(data).hexdigest() == 'f5b641c45c69d772ee4eda687bc9fda411d5cad6b0b45371491da4580cbc8d59'
font = TTFont(io.BytesIO(data))
sub = subset.Subsetter(options=subset.Options()); sub.populate(unicodes=range(32, 127)); sub.subset(font)
font.flavor = 'woff'
font.save(pathlib.Path(__file__).resolve().parents[1] / 'public/assets/fonts/lilita-one.woff')
