import struct
import zlib

def make_all_whites_and_lights_transparent(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = f.read()

    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    
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

    raw_decompressed = zlib.decompress(b''.join(idat_chunks))
    
    bpp = 4 if color_type == 6 else 3
    stride = width * bpp
    recon = bytearray(width * height * bpp)
    raw_pos = 0
    recon_pos = 0

    def paeth_predictor(a, b, c):
        p = a + b - c
        pa = abs(p - a)
        pb = abs(p - b)
        pc = abs(p - c)
        if pa <= pb and pa <= pc:
            return a
        elif pb <= pc:
            return b
        else:
            return c

    for y in range(height):
        filter_type = raw_decompressed[raw_pos]
        raw_pos += 1
        
        for x in range(stride):
            filt_val = raw_decompressed[raw_pos]
            raw_pos += 1
            
            left = recon[recon_pos - bpp] if x >= bpp else 0
            up = recon[recon_pos - stride] if y > 0 else 0
            up_left = recon[recon_pos - stride - bpp] if (y > 0 and x >= bpp) else 0

            if filter_type == 0:
                val = filt_val
            elif filter_type == 1:
                val = (filt_val + left) & 0xFF
            elif filter_type == 2:
                val = (filt_val + up) & 0xFF
            elif filter_type == 3:
                val = (filt_val + ((left + up) >> 1)) & 0xFF
            elif filter_type == 4:
                val = (filt_val + paeth_predictor(left, up, up_left)) & 0xFF
            else:
                val = filt_val

            recon[recon_pos] = val
            recon_pos += 1

    output_pixels = bytearray()
    recon_idx = 0

    for y in range(height):
        output_pixels.append(0)
        for x in range(width):
            if bpp == 4:
                r, g, b, _ = recon[recon_idx:recon_idx+4]
                recon_idx += 4
            else:
                r, g, b = recon[recon_idx:recon_idx+3]
                recon_idx += 3

            # Identify blue parts (tie, tablet, checkmark)
            is_blue = (b > 140 and (b - r > 30) and g > 80)
            
            # Calculate luminance
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            
            if is_blue:
                a = 255
            else:
                # If luminance > 165 and color is neutral / near-grey / white:
                max_diff = max(abs(r - g), abs(g - b), abs(r - b))
                if lum >= 200 and max_diff < 40:
                    a = 0
                elif lum > 140 and max_diff < 35:
                    # Feather transition to keep dark ink outlines crisp
                    t = (200 - lum) / 60.0 # 0 at 200, 1 at 140
                    a = int(max(0.0, min(1.0, t)) * 255)
                elif lum <= 140:
                    # Dark linework / black hair / pants / outlines
                    a = 255
                else:
                    a = 255

            output_pixels.extend([r, g, b, a])

    compressed_idat = zlib.compress(bytes(output_pixels), 9)

    def make_chunk(chunk_type, chunk_data):
        chunk_len = len(chunk_data)
        crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        return struct.pack('>I', chunk_len) + chunk_type + chunk_data + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    out_png = bytearray(b'\x89PNG\r\n\x1a\n')
    out_png.extend(make_chunk(b'IHDR', ihdr_data))
    out_png.extend(make_chunk(b'IDAT', compressed_idat))
    out_png.extend(make_chunk(b'IEND', b''))

    with open(output_path, 'wb') as f:
        f.write(out_png)

    print(f"Saved complete white transparency PNG: {output_path}")

if __name__ == '__main__':
    make_all_whites_and_lights_transparent('/Users/scappin/Src/ACE/CE_raw.png', '/Users/scappin/Src/ACE/CE.png')
