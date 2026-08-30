import struct, zlib

def make_gdrive_transparent(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = f.read()

    pos = 8
    width = 0
    height = 0
    idat_chunks = []

    while pos < len(data):
        chunk_len = struct.unpack('>I', data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8]
        chunk_data = data[pos+8:pos+8+chunk_len]
        pos += 8 + chunk_len + 4

        if chunk_type == b'IHDR':
            width, height, bit_depth, color_type, comp, filt, inter = struct.unpack('>IIBBBBB', chunk_data)
        elif chunk_type == b'IDAT':
            idat_chunks.append(chunk_data)
        elif chunk_type == b'IEND':
            break

    raw = zlib.decompress(b''.join(idat_chunks))
    bpp = 4 if color_type == 6 else 3
    stride = width * bpp
    recon = bytearray(width * height * bpp)
    raw_pos = 0
    recon_pos = 0

    def paeth_predictor(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        if pa <= pb and pa <= pc: return a
        elif pb <= pc: return b
        else: return c

    for y in range(height):
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
            elif ft == 4: val = (fv + paeth_predictor(left, up, up_left)) & 0xFF
            else: val = fv

            recon[recon_pos] = val
            recon_pos += 1

    out_raw = bytearray()
    idx = 0

    for y in range(height):
        out_raw.append(0)
        for x in range(width):
            if bpp == 4:
                r, g, b, _ = recon[idx:idx+4]
                idx += 4
            else:
                r, g, b = recon[idx:idx+3]
                idx += 3

            lum = 0.299 * r + 0.587 * g + 0.114 * b
            max_diff = max(abs(r - g), abs(g - b), abs(r - b))

            # If pixel is white / light neutral
            if lum >= 240 and max_diff < 25:
                a = 0
            elif lum > 190 and max_diff < 25:
                t = (240 - lum) / 50.0
                a = int(max(0.0, min(1.0, t)) * 255)
            else:
                a = 255

            out_raw.extend([r, g, b, a])

    compressed = zlib.compress(bytes(out_raw), 9)

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    res = bytearray(b'\x89PNG\r\n\x1a\n') + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

    with open(output_path, 'wb') as f:
        f.write(res)

    print(f"Saved transparent gdrive PNG: {output_path} ({len(res)} bytes)")

if __name__ == '__main__':
    make_gdrive_transparent('/Users/scappin/Src/ACE/gdrive_raw.png', '/Users/scappin/Src/ACE/gdrive.png')
