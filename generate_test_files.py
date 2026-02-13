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

def gen_tlv_structure():
    """
    Generates a recursive ASN.1 BER/TLV structure.
    Root: Sequence (0x30)
      - Integer (0x02)
      - OctetString (0x04)
      - Sequence (0x30)
        - Integer (0x02)
        - OctetString (0x04)
        - Sequence (0x30) [Deep Nesting]
          - Integer
    """
    def make_tlv(tag, value):
        # Tag
        data = bytes([tag])
        # Length
        l = len(value)
        if l < 128:
            data += bytes([l])
        else:
            # Long form length
            # Simple implementation for < 65535
            if l < 256:
                data += bytes([0x81, l])
            else:
                data += bytes([0x82, (l >> 8) & 0xFF, l & 0xFF])
        # Value
        data += value
        return data

    # Leaf nodes
    int_val1 = make_tlv(0x02, b'\x01\x02\x03\x04') # Integer 4 bytes
    str_val1 = make_tlv(0x04, b'Hello TLV World') # OctetString

    # Deeply nested
    deep_int = make_tlv(0x02, b'\xFF' * 10)
    deep_seq = make_tlv(0x30, deep_int)
    
    # Mid level
    mid_seq_content = int_val1 + str_val1 + deep_seq
    mid_seq = make_tlv(0x30, mid_seq_content)

    # Root
    root_content = make_tlv(0x02, b'\x00') + mid_seq + make_tlv(0x04, b'Tail data')
    root = make_tlv(0x30, root_content)
    
    return root

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

    # 5. TLV Recursive Structure (The "Parser Engine" Test)
    # Tests: Recursive Parser, File Tree, Hex View selection
    tlv_data = gen_tlv_structure()
    write_file("test_tlv_strict.bin", tlv_data)

    print(f"\nDone. Files located in ./{OUTPUT_DIR}/")

if __name__ == "__main__":
    main()