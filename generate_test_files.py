import os
import random
import struct
import string

OUTPUT_DIR = "test_files"

def ensure_dir():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def write_file(filename, data):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    print(f"Generated {filename} ({len(data)} bytes)")

# -------------------------------------------------------------------------
# GENERATORS
# -------------------------------------------------------------------------

def gen_high_entropy(size):
    """
    Generates random bytes.
    Target: Shannon Entropy > 7.5
    Visualization: BLACK (Encrypted/Compressed)
    """
    return os.urandom(size)

def gen_text(size):
    """
    Generates ASCII text.
    Target: High ASCII density
    Visualization: BLUE (Text/TIP)
    """
    chars = string.ascii_letters + string.digits + " \n\t.,;:"
    return "".join(random.choices(chars, k=size)).encode('utf-8')

def gen_periodic(header, period, total_size):
    """
    Generates data with a repeating header.
    Target: Autocorrelation spikes at 'period' lag.
    Visualization: PURPLE (Vendor/Periodic)
    """
    body_size = period - len(header)
    block = header + b'\x00' * body_size
    count = total_size // period
    return block * count

def gen_metadata_simulation(size):
    """
    Generates structured low-entropy non-text data.
    Target: Variable entropy, low variance.
    Visualization: RED (Metadata/H2)
    """
    # Simulating something like a bitmap or repetitive struct
    return b''.join(struct.pack('>I', x) for x in range(size // 4))

def gen_png_signature():
    """
    Valid PNG Header for Signature Detection.
    """
    # PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
    return b'\x89PNG\r\n\x1a\n' + b'\x00' * 100

# -------------------------------------------------------------------------
# MAIN EXECUTION
# -------------------------------------------------------------------------

def main():
    ensure_dir()
    print("--- Generating CIFAD Forensic Test Suite ---")

    # 1. H3: Encrypted / High Entropy
    # Tests: Entropy Engine, Black Color Mapping
    write_file("h3_encrypted.bin", gen_high_entropy(1024 * 1024)) # 1MB

    # 2. H1: Plain Text / TIP
    # Tests: ASCII Heuristic, Blue Color Mapping
    write_file("h1_text_logs.bin", gen_text(1024 * 1024)) # 1MB

    # 3. Vendor Periodic (Autocorrelation)
    # Tests: Autocorrelation Graph (Should spike at lag 64)
    # Header: 0xAABBCCDD (4 bytes), Period: 64 bytes
    header = b'\xAA\xBB\xCC\xDD'
    write_file("vendor_periodic_64.bin", gen_periodic(header, 64, 1024 * 512)) # 512KB

    # 4. Mixed Forensic Image (The "Twin-View" Test)
    # Tests: Hilbert Locality, Semantic Scrollbar transitions
    # Layout: [Header] [Text Block] [Encrypted Payload] [Metadata Tail]
    mixed_data = (
        gen_png_signature() +                # Signature
        gen_text(1024 * 200) +               # 200KB Text (Blue)
        gen_high_entropy(1024 * 400) +       # 400KB Encrypted (Black)
        gen_metadata_simulation(1024 * 100)  # 100KB Metadata (Red)
    )
    write_file("mixed_forensic_image.bin", mixed_data)

    print(f"\nDone. Files located in ./{OUTPUT_DIR}/")

if __name__ == "__main__":
    main()