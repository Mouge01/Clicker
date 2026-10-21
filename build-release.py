"""Yalnızca kurulum için gereken dosyalardan V1.3 alpha ZIP'i oluşturur."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
FILES = ('manifest.json', 'core.js', 'resume.js', 'content.js', 'background.js', 'visibility.js', 'README.md', 'KURULUM.md', 'CHANGELOG.md', 'preview.png')
manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['version'] == '1.3.0'
assert manifest['version_name'] == 'V1.3 alpha'
for name in FILES:
    if not (ROOT / name).is_file():
        raise FileNotFoundError(name)
target = ROOT / 'uses-slayt-yardimcisi-v1.3-alpha.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in FILES:
        archive.write(ROOT / name, name)
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(FILES)
    for declaration in manifest['content_scripts']:
        for script in declaration['js']:
            assert script in archive.namelist()
    assert manifest['background']['service_worker'] in archive.namelist()
print(f'{target.name}: {target.stat().st_size} bytes, {len(FILES)} dosya')
