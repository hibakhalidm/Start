import os
import random
import struct

OUTPUT_DIR = "test_files"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_tlv(tag, value):
    """Encodes a Tag-Length-Value structure (ASN.1 BER/DER)."""
    header = bytes([tag])
    length = len(value)
    
    if length < 128:
        header += bytes([length])
    elif length < 256:
        header += bytes([0x81, length])
    else:
        header += bytes([0x82, (length >> 8) & 0xFF, length & 0xFF])
        
    return header + value

def gen_etsi_standard_file():
    """
    Generates a file mimicking ETSI TS 101 671 Lawful Interception.
    Structure: Root Sequence (0x30) -> [ Integer (0x02), Context Specific (0xA1) ... ]
    """
    print(f"Generating {OUTPUT_DIR}/test_etsi_strict.bin...")
    
    # 1. Payload: Target Identifier (Context 0x81)
    target_id = create_tlv(0x81, b"Target_User_007")
    
    # 2. Payload: Location Data (Sequence 0x30 nested)
    lat = create_tlv(0x02, b"\x01\x02\x03\x04") # Fake Lat
    lon = create_tlv(0x02, b"\x05\x06\x07\x08") # Fake Lon
    location = create_tlv(0x30, lat + lon)
    
    # 3. Container: Construct (0xA1 - Context Constructed)
    iri_content = create_tlv(0xA1, target_id + location)
    
    # 4. Root: Sequence (0x30)
    version = create_tlv(0x02, b"\x01") # Version 1
    root = create_tlv(0x30, version + iri_content)
    
    with open(f"{OUTPUT_DIR}/test_etsi_strict.bin", "wb") as f:
        f.write(root)

def gen_mixed_entropy_file():
    """
    Generates a file with distinct entropy zones to test the Heatmap colors.
    [ Low Entropy (Text) ] -> [ High Entropy (Random/Encrypted) ] -> [ Null Padding ]
    """
    print(f"Generating {OUTPUT_DIR}/test_heatmap_gradient.bin...")
    
    # Zone 1: Text (Low Entropy ~4.0 bits) - Blue in UI
    header = b"HEADER_INFO_SECTION_START" * 50
    
    # Zone 2: Encrypted (High Entropy ~8.0 bits) - White/Cyan in UI
    payload = os.urandom(4096)
    
    # Zone 3: Padding (Zero Entropy ~0.0 bits) - Black in UI
    padding = b"\x00" * 1024
    
    data = header + payload + padding
    with open(f"{OUTPUT_DIR}/test_heatmap_gradient.bin", "wb") as f:
        f.write(data)

def gen_periodic_file():
    """
    Generates a file with a strong repeating 16-byte pattern.
    Tests the Autocorrelation Graph and Hilbert Radar "Tracks".
    """
    print(f"Generating {OUTPUT_DIR}/test_periodic_signal.bin...")
    
    pattern = b"\xAA\xBB\xCC\xDD\x00\x11\x22\x33\xFF\xEE\xDD\xCC\x44\x55\x66\x77"
    data = pattern * 512 # Repeating 16-byte pattern
    
    with open(f"{OUTPUT_DIR}/test_periodic_signal.bin", "wb") as f:
        f.write(data)

if __name__ == "__main__":
    gen_etsi_standard_file()
    gen_mixed_entropy_file()
    gen_periodic_file()
    print("Done! Drag these files into CIFAD to validate the engine.")