"""
Generate tray icon PNGs + ICO for Blackhole Widget.
Creates a dark circle with purple glow for system tray and app icon.
"""
import struct
import zlib

def create_png(width, height, pixels_rgba):
    """Create a valid PNG from raw RGBA pixel data."""

    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    # IDAT
    raw = b''
    for y in range(height):
        raw += b'\x00'
        row_start = y * width * 4
        raw += bytes(pixels_rgba[row_start:row_start + width * 4])

    compressed = zlib.compress(raw)
    idat = chunk(b'IDAT', compressed)

    # IEND
    iend = chunk(b'IEND', b'')

    return signature + ihdr + idat + iend


def create_ico_from_png(png_data):
    """Wrap a PNG file inside a Windows .ico container."""
    # ICO header: reserved(2) + type(2: 1=ICO) + count(2)
    header = struct.pack('<HHH', 0, 1, 1)

    # ICO entry: width(1) + height(1) + colors(1) + reserved(1)
    #           + planes(2) + bpp(2) + size(4) + offset(4)
    entry = struct.pack('<BBBBHHII', 32, 32, 0, 0, 1, 32,
                        len(png_data), 6 + 16)

    return header + entry + png_data


def generate_icon(size, filename, as_ico=False):
    """Generate a black circle with purple glow."""
    pixels = []
    cx = size / 2.0
    cy = size / 2.0
    radius = size / 2.0 - 2.0

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = (dx * dx + dy * dy) ** 0.5

            if dist <= radius:
                r, g, b, a = 10, 5, 20, 255
            elif dist <= radius + 2.0:
                t = (dist - radius) / 2.0
                alpha = int(255 * (1.0 - t))
                r, g, b, a = 80, 20, 150, max(0, min(255, alpha))
            else:
                r, g, b, a = 0, 0, 0, 0

            pixels.extend([r, g, b, a])

    png = create_png(size, size, pixels)

    if as_ico:
        ico = create_ico_from_png(png)
        with open(filename, 'wb') as f:
            f.write(ico)
    else:
        with open(filename, 'wb') as f:
            f.write(png)
    print(f"Generated {filename} ({size}x{size})")


if __name__ == '__main__':
    import os
    icons_dir = os.path.join(os.path.dirname(__file__), 'src-tauri', 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    generate_icon(32, os.path.join(icons_dir, '32x32.png'))
    generate_icon(128, os.path.join(icons_dir, '128x128.png'))
    generate_icon(128, os.path.join(icons_dir, 'icon.png'))
    generate_icon(32, os.path.join(icons_dir, 'tray-icon.png'))
    # Generate ICO (Windows icon) from the 32x32 PNG
    generate_icon(32, os.path.join(icons_dir, 'icon.ico'), as_ico=True)
    print("All icons generated.")