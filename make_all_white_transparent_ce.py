import struct
import zlib

def make_all_white_transparent(input_path, output_path):
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
            print(f"IHDR: {width}x{height}, bit_depth={bit_depth}, color_type={color_type}")
        elif chunk_type == b'IDAT':
            idat_chunks.append(chunk_data)
        elif chunk_type == b'IEND':
            break

    raw_decompressed = zlib.decompress(b''.join(idat_chunks))
    
    if color_type == 6:
        bpp = 4
    elif color_type == 2:
        bpp = 3
    else:
        raise ValueError(f"Unsupported color type: {color_type}")

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

    # Extract RGBA pixels and convert all white/light-grey parts to transparent
    output_pixels = bytearray()
    recon_idx = 0

    for y in range(height):
        output_pixels.append(0) # Filter None
        for x in range(width):
            if bpp == 4:
                r, g, b, orig_a = recon[recon_idx:recon_idx+4]
                recon_idx += 4
            else:
                r, g, b = recon[recon_idx:recon_idx+3]
                orig_a = 255
                recon_idx += 3

            # Check if this pixel is blue / colored (tie, tablet, checkmark)
            # Blue has high blue and significantly lower red
            is_blue = (b > 160 and b - r > 40 and g > 100) or (g > 160 and g - r > 40 and b > 160)
            
            brightness = (r + g + b) / 3.0
            
            if is_blue:
                # Keep blue vibrant and fully opaque
                a = 255
            else:
                # White and neutral light tones become transparent
                if brightness >= 235:
                    a = 0
                elif brightness > 185:
                    # Smooth alpha edge gradient
                    t = (235 - brightness) / 50.0 # from 0 (at 235) to 1.0 (at 185)
                    a = int(t * 255)
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

    print(f"Successfully processed all white parts to transparent: {output_path} ({len(out_png)} bytes)")

if __name__ == '__main__':
    make_all_white_transparent('/Users/scappin/Src/ACE/CE_raw.png', '/Users/scappin/Src/ACE/CE.png')
