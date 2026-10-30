"""Package only public website assets and apply the production origin."""
import argparse
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
args = parser.parse_args()
origin = args.url.rstrip('/')
if urlparse(origin).scheme != 'https' or not urlparse(origin).netloc:
    parser.error('--url must be an HTTPS website address')
root = Path(__file__).resolve().parent
out = root / 'dist'
out.mkdir(exist_ok=True)
files = ['index.html', 'product-evidence.html', 'privacy.html', 'product-facts.json',
         'llms.txt', 'robots.txt', 'sitemap.xml', 'site.css', 'site.js', 'ring3d.js',
         'favicon.svg', '404.html', '_headers']
for name in files:
    text = (root / name).read_text()
    if name.endswith(('.html', '.xml', '.txt', '.json')):
        for source_url in ['https://lessie-wang.github.io/zhiyu-ring-site', 'https://zhiyu-ring.netlify.app']:
            text = text.replace(source_url, origin)
    (out / name).write_text(text)
shutil.copytree(root / 'vendor', out / 'vendor', dirs_exist_ok=True)
(out / '.nojekyll').touch()
print(json.dumps({'public_directory': str(out), 'site_url': origin, 'files': len(files)}, ensure_ascii=False))
