import struct
import zlib
from collections import deque

def process_png(input_path, output_path):
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
        pos += 8 + chunk_len + 4 # skip crc

        if chunk_type == b'IHDR':
            width, height, bit_depth, color_type, comp, filt, inter = struct.unpack('>IIBBBBB', chunk_data)
            print(f"IHDR: {width}x{height}, bit_depth={bit_depth}, color_type={color_type}")
        elif chunk_type == b'IDAT':
            idat_chunks.append(chunk_data)
        elif chunk_type == b'IEND':
            break

    raw_decompressed = zlib.decompress(b''.join(idat_chunks))
    
    # Check bytes per pixel
    if color_type == 6: # RGBA
        bpp = 4
    elif color_type == 2: # RGB
        bpp = 3
    else:
        raise ValueError(f"Unsupported color type: {color_type}")

    # Unfilter PNG scanlines
    stride = width * bpp
    img_data = bytearray(width * height * 4) # We will output RGBA
    
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

    # Extract RGB / RGBA into 2D array of (r, g, b, a)
    pixels = []
    recon_idx = 0
    for y in range(height):
        row = []
        for x in range(width):
            if bpp == 4:
                r, g, b, a = recon[recon_idx:recon_idx+4]
                recon_idx += 4
            else:
                r, g, b = recon[recon_idx:recon_idx+3]
                a = 255
                recon_idx += 3
            row.append([r, g, b, a])
        pixels.append(row)

    # Flood fill outer background from border pixels
    # Condition for outer background: r > 235, g > 235, b > 235
    is_outer_bg = [[False]*width for _ in range(height)]
    q = deque()

    # Seed border pixels
    for x in range(width):
        for y in (0, height - 1):
            r, g, b, a = pixels[y][x]
            if r > 230 and g > 230 and b > 230:
                is_outer_bg[y][x] = True
                q.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if not is_outer_bg[y][x]:
                r, g, b, a = pixels[y][x]
                if r > 230 and g > 230 and b > 230:
                    is_outer_bg[y][x] = True
                    q.append((x, y))

    # BFS
    while q:
        cx, cy = q.popleft()
        for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
            if 0 <= nx < width and 0 <= ny < height:
                if not is_outer_bg[ny][nx]:
                    nr, ng, nb, na = pixels[ny][nx]
                    # If high brightness or near-white background
                    if nr > 230 and ng > 230 and nb > 230:
                        is_outer_bg[ny][nx] = True
                        q.append((nx, ny))

    # Apply alpha: outer bg is 0, feather outer edges smoothly
    for y in range(height):
        for x in range(width):
            if is_outer_bg[y][x]:
                pixels[y][x][3] = 0
            else:
                # Check if neighboring an outer bg pixel for edge anti-aliasing
                r, g, b, _ = pixels[y][x]
                has_outer_neighbor = False
                for ox, oy in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= ox < width and 0 <= oy < height and is_outer_bg[oy][ox]:
                        has_outer_neighbor = True
                        break
                if has_outer_neighbor:
                    brightness = (r + g + b) / 3.0
                    if brightness > 220:
                        alpha_factor = max(0.0, min(1.0, (255 - brightness) / 35.0))
                        pixels[y][x][3] = int(alpha_factor * 255)

    # Encode new PNG (RGBA)
    output_raw = bytearray()
    for y in range(height):
        output_raw.append(0) # Filter type 0 (None)
        for x in range(width):
            output_raw.extend(bytes(pixels[y][x]))

    compressed_idat = zlib.compress(bytes(output_raw), 9)

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

    print(f"Saved transparent PNG: {output_path} ({len(out_png)} bytes)")

if __name__ == '__main__':
    process_png('/Users/scappin/Src/ACE/CE_raw.png', '/Users/scappin/Src/ACE/CE.png')
