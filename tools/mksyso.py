#!/usr/bin/env python3
"""Gera rsrc_windows_amd64.syso (icone, manifesto requireAdministrator, versao) sem depender de go-winres."""
import struct, io, sys, math
from PIL import Image, ImageDraw

OUT = sys.argv[1]
VER = (2, 3, 2, 0)

# ---------- icone: floco de neve em violeta/ciano ----------
def make_icon(size):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = S * 0.46
    d.rounded_rectangle([S*0.02, S*0.02, S*0.98, S*0.98], radius=S*0.22, fill=(20, 14, 42, 255), outline=(70, 52, 130, 255), width=max(1, int(S*0.02)))
    cx = cy = S / 2
    ice = (143, 224, 255, 255)
    w = max(2, int(S * 0.045))
    R = S * 0.33
    for k in range(6):
        a = math.radians(60 * k - 90)
        ex, ey = cx + R * math.cos(a), cy + R * math.sin(a)
        d.line([cx, cy, ex, ey], fill=ice, width=w)
        for t in (0.55, 0.78):
            bx, by = cx + R * t * math.cos(a), cy + R * t * math.sin(a)
            for s in (-1, 1):
                a2 = a + s * math.radians(40)
                L = R * 0.2
                d.line([bx, by, bx + L * math.cos(a2), by + L * math.sin(a2)], fill=ice, width=max(1, int(w * 0.8)))
    d.ellipse([cx - w, cy - w, cx + w, cy + w], fill=(255, 255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)

SIZES = [16, 24, 32, 48, 64, 128, 256]
pngs = []
for s in SIZES:
    b = io.BytesIO(); make_icon(s).save(b, 'PNG'); pngs.append(b.getvalue())
make_icon(256).save(sys.argv[2], format='ICO', sizes=[(s, s) for s in SIZES]) if len(sys.argv) > 2 else None

grp = struct.pack('<HHH', 0, 1, len(SIZES))
for i, s in enumerate(SIZES):
    grp += struct.pack('<BBBBHHIH', 0 if s >= 256 else s, 0 if s >= 256 else s, 0, 0, 1, 32, len(pngs[i]), i + 1)

manifest = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity type="win32" name="SnowToolkit" version="2.3.2.0" processorArchitecture="amd64"/>
  <description>SnowToolkit - Central de ferramentas de T.I.</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security><requestedPrivileges><requestedExecutionLevel level="requireAdministrator" uiAccess="false"/></requestedPrivileges></security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
      <supportedOS Id="{4a2f28e3-53b9-4441-ba9c-d69d4a4a6e38}"/>
    </application>
  </compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3"><windowsSettings>
    <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
    <longPathAware xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">true</longPathAware>
  </windowsSettings></application>
</assembly>
'''.encode('utf-8')

# ---------- VS_VERSION_INFO ----------
def u16(s): return s.encode('utf-16-le') + b'\x00\x00'
def pad4(b): return b + b'\x00' * ((4 - len(b) % 4) % 4)
def vs_string(key, val):
    k = u16(key); v = u16(val)
    hdr_len = 6 + len(k)
    body = pad4(b'\x00' * hdr_len)[hdr_len:]  # padding after key
    total = hdr_len + len(body) + len(v)
    return pad4(struct.pack('<HHH', total, len(v) // 2, 1) + k + body + v)
def vs_block(key, children, typ=1):
    k = u16(key); hdr_len = 6 + len(k)
    pre = pad4(b'\x00' * hdr_len)[hdr_len:]
    inner = b''.join(children)
    total = hdr_len + len(pre) + len(inner)
    return pad4(struct.pack('<HHH', total, 0, typ) + k + pre + inner)
fv = VER; verstr = '.'.join(map(str, VER))
ffi = struct.pack('<IIIIIIIIIIIII', 0xFEEF04BD, 0x00010000,
                  (fv[0] << 16) | fv[1], (fv[2] << 16) | fv[3], (fv[0] << 16) | fv[1], (fv[2] << 16) | fv[3],
                  0x3F, 0, 0x00040004, 1, 0, 0, 0)
strings = [vs_string('CompanyName', 'Guilherme Souto'), vs_string('FileDescription', 'SnowToolkit - Central de ferramentas de T.I.'),
           vs_string('FileVersion', verstr), vs_string('InternalName', 'SnowToolkit'), vs_string('LegalCopyright', 'Criado por Guilherme Souto'),
           vs_string('OriginalFilename', 'SnowToolkit.exe'), vs_string('ProductName', 'SnowToolkit'), vs_string('ProductVersion', verstr)]
sfi = vs_block('StringFileInfo', [vs_block('041604B0', strings)])
vfi = vs_block('VarFileInfo', [pad4(struct.pack('<HHH', 6 + len(u16('Translation')) + 4 + 2, 4, 0) + u16('Translation') + b'\x00\x00' + struct.pack('<HH', 0x0416, 0x04B0))])
k = u16('VS_VERSION_INFO'); hl = 6 + len(k); pre = pad4(b'\x00' * hl)[hl:]
vinfo_body = pre + ffi
vinfo_body = pad4(vinfo_body)
vinfo = struct.pack('<HHH', hl + len(vinfo_body) + len(sfi) + len(vfi), len(ffi), 0) + k + vinfo_body + sfi + vfi

# ---------- arvore de recursos ----------
# (tipo, [(id, dados)])
RT_ICON, RT_GROUP_ICON, RT_VERSION, RT_MANIFEST = 3, 14, 16, 24
resources = [
    (RT_ICON, [(i + 1, pngs[i]) for i in range(len(SIZES))]),
    (RT_GROUP_ICON, [(1, grp)]),
    (RT_VERSION, [(1, vinfo)]),
    (RT_MANIFEST, [(1, manifest)]),
]
LANG = 0x0409

def dir_table(entries):  # entries: list of (id, offset, is_dir)
    b = struct.pack('<IIHHHH', 0, 0, 0, 0, 0, len(entries))
    for ident, off, isdir in sorted(entries, key=lambda e: e[0]):
        b += struct.pack('<II', ident, off | (0x80000000 if isdir else 0))
    return b

# calcula layout
type_count = len(resources)
root_size = 16 + 8 * type_count
off = root_size
type_dirs = []
for t, names in resources:
    type_dirs.append(off); off += 16 + 8 * len(names)
name_dirs = {}
for t, names in resources:
    for nid, _ in names:
        name_dirs[(t, nid)] = off; off += 16 + 8
data_entries = {}
for t, names in resources:
    for nid, _ in names:
        data_entries[(t, nid)] = off; off += 16
raw_off = off
raw_pos = {}
raw = b''
for t, names in resources:
    for nid, data in names:
        raw_pos[(t, nid)] = raw_off + len(raw)
        raw += pad4(data)

sec = dir_table([(t, type_dirs[i], True) for i, (t, _) in enumerate(resources)])
for i, (t, names) in enumerate(resources):
    sec += dir_table([(nid, name_dirs[(t, nid)], True) for nid, _ in names])
for t, names in resources:
    for nid, _ in names:
        sec += dir_table([(LANG, data_entries[(t, nid)], False)])
relocs = []
for t, names in resources:
    for nid, data in names:
        relocs.append(len(sec))
        sec += struct.pack('<IIII', raw_pos[(t, nid)], len(data), 1252, 0)
sec += raw

# COFF
nreloc = len(relocs)
hdr_size = 20 + 40
ptr_raw = hdr_size
ptr_reloc = ptr_raw + len(sec)
ptr_sym = ptr_reloc + 10 * nreloc
coff = struct.pack('<HHIIIHH', 0x8664, 1, 0, ptr_sym, 1, 0, 0)
coff += struct.pack('<8sIIIIIIHHI', b'.rsrc\0\0\0', 0, 0, len(sec), ptr_raw, ptr_reloc, 0, nreloc, 0, 0x40000040)
coff += sec
for r in relocs:
    coff += struct.pack('<IIH', r, 0, 3)  # IMAGE_REL_AMD64_ADDR32NB -> simbolo 0
coff += struct.pack('<8sIhHBB', b'.rsrc\0\0\0', 0, 1, 0, 3, 0)
coff += struct.pack('<I', 4)
open(OUT, 'wb').write(coff)
print('ok', OUT, len(coff), 'bytes;', nreloc, 'relocs')
