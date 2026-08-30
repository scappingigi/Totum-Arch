import struct, zlib

def inspect_shirt():
    with open('/Users/scappin/Src/ACE/CE_raw.png', 'rb') as f:
        data = f.read()
    pos = 8
    idats = []
    while pos < len(data):
        l = struct.unpack('>I', data[pos:pos+4])[0]
        t = data[pos+4:pos+8]
        d = data[pos+8:pos+8+l]
        pos += 8 + l + 4
        if t == b'IHDR':
            w, h, bd, ct, _, _, _ = struct.unpack('>IIBBBBB', d)
        elif t == b'IDAT':
            idats.append(d)
        elif t == b'IEND':
            break
    raw = zlib.decompress(b''.join(idats))
    bpp = 3
    stride = w * bpp
    recon = bytearray(w * h * bpp)
    raw_pos = 0
    recon_pos = 0
    for y in range(h):
        ft = raw[raw_pos]; raw_pos += 1
        for x in range(stride):
            fv = raw[raw_pos]; raw_pos += 1
            left = recon[recon_pos - bpp] if x >= bpp else 0
            up = recon[recon_pos - stride] if y > 0 else 0
            up_left = recon[recon_pos - stride - bpp] if (y > 0 and x >= bpp) else 0
            if ft == 0: val = fv
            elif ft == 1: val = (fv + left) & 0xFF
            elif ft == 2: val = (fv + up) & 0xFF
            elif ft == 3: val = (fv + ((left + up) >> 1)) & 0xFF
            elif ft == 4:
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                val = (fv + (left if pa <= pb and pa <= pc else up if pb <= pc else up_left)) & 0xFF
            recon[recon_pos] = val
            recon_pos += 1
    
    # Check pixels at character's chest / shirt (around center x = 360..380, y = 200..250)
    samples = []
    for y in range(180, 240, 5):
        for x in range(350, 400, 5):
            idx = (y * w + x) * 3
            r, g, b = recon[idx:idx+3]
            samples.append((x, y, r, g, b))
    print("Shirt samples:", samples[:15])

if __name__ == '__main__':
    inspect_shirt()
