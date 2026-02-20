import os
import struct

OUTPUT_DIR = "test_files"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def gen_pcap_ground_truth():
    """Generates a PCAP with deterministic markers at exact offsets for UI verification."""
    print(f"Generating {OUTPUT_DIR}/test_network_truth.pcap...")
    
    # 24-byte Global PCAP Header
    magic = b"\xd4\xc3\xb2\xa1"
    version = b"\x02\x00\x04\x00"
    tz_sig = b"\x00\x00\x00\x00\x00\x00\x00\x00"
    snaplen = b"\xff\xff\x00\x00"
    network = b"\x01\x00\x00\x00"
    global_header = magic + version + tz_sig + snaplen + network

    # 16-byte Packet Header
    ts_sec = b"\x00\x00\x00\x00"
    ts_usec = b"\x00\x00\x00\x00"
    incl_len = struct.pack('<I', 64) # 64 bytes
    orig_len = struct.pack('<I', 64)
    pkt_header = ts_sec + ts_usec + incl_len + orig_len

    # Deterministic Payload (Exactly 64 bytes)
    # Analyst can hover over exactly 0x28 (40 bytes in) and see "[START_PAYLOAD]"
    payload = b"[START_PAYLOAD]" + (b"\xAA" * 34) + b"[END_PAYLOAD]"
    
    if len(payload) < 64:
        payload += b"\x00" * (64 - len(payload))

    with open(f"{OUTPUT_DIR}/test_network_truth.pcap", "wb") as f:
        f.write(global_header + pkt_header + payload)

if __name__ == "__main__":
    gen_pcap_ground_truth()
    print("Test Suite Generated. Ingest 'test_network_truth.pcap' into CIFAD.")
    print("-> VERIFY: In the Inspector, the text '[START_PAYLOAD]' must appear exactly at offset 0x28.")