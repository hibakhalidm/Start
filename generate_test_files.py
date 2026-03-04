import os
import struct

OUTPUT_DIR = "demo_files"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_tlv(tag, value):
    """Helper to build ASN.1/TLV nodes."""
    length = len(value)
    if length < 128:
        header = bytes([tag, length])
    else:
        header = bytes([tag, 0x81, length]) # Simplified long-form for demo
    return header + value

def gen_scenario_1_intercept():
    """Generates an intercepted message with a plaintext ID and XOR encrypted payload."""
    # 1. Plaintext ID (Tag 0x13 - PrintableString)
    target_id = create_tlv(0x13, b"TARGET_ID: OMEGA_7")
    
    # 2. Encrypted Payload (Tag 0x04 - OctetString)
    secret_message = b"URGENT: RENDEZVOUS AT EXTRACTION POINT ALPHA."
    # XOR encrypt the message with key 0x55 (Hex '55')
    encrypted_bytes = bytes([b ^ 0x55 for b in secret_message])
    # Pad it with some random high-entropy noise so the Radar lights up
    high_entropy_noise = os.urandom(100)
    payload = create_tlv(0x04, encrypted_bytes + high_entropy_noise)
    
    # 3. Wrap in a Sequence (Tag 0x30)
    root = create_tlv(0x30, target_id + payload)
    
    with open(f"{OUTPUT_DIR}/scenario_1_intercept.bin", "wb") as f:
        f.write(root)

def gen_scenario_2_network():
    """Generates a PCAP file hiding a plaintext beacon."""
    # Standard PCAP Global Header (Magic: d4 c3 b2 a1)
    global_header = b"\xd4\xc3\xb2\xa1\x02\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\x00\x00\x01\x00\x00\x00"
    
    # Packet Header (64 bytes long)
    pkt_header = b"\x00\x00\x00\x00\x00\x00\x00\x00" + struct.pack('<I', 64) + struct.pack('<I', 64)
    
    # Payload with a hidden string surrounded by nulls/padding
    padding_before = b"\x00" * 16
    beacon = b">>> OPERATION_BLACKOUT_INITIATED <<<"
    padding_after = b"\x00" * (64 - len(padding_before) - len(beacon))
    
    with open(f"{OUTPUT_DIR}/scenario_2_network.pcap", "wb") as f:
        f.write(global_header + pkt_header + padding_before + beacon + padding_after)

def gen_scenario_3_crashlog():
    """Generates a CR file with a deliberate typo to demo the Hex Editor."""
    # .CR Header (Magic: 43 52)
    header = b"CR\x01\x00"
    
    # Deliberate typo: 'FATAL_ERR0R' (uses a zero instead of an 'O')
    # Hex for '0' is 0x30. Hex for 'O' is 0x4F.
    log_data = b"SYS_BOOT_OK... NET_LINK_UP... FATAL_ERR0R_DETECTED... HALTING."
    
    with open(f"{OUTPUT_DIR}/scenario_3_crashlog.cr", "wb") as f:
        f.write(header + log_data)

if __name__ == "__main__":
    print(f"Generating narrative test files in './{OUTPUT_DIR}'...")
    gen_scenario_1_intercept()
    gen_scenario_2_network()
    gen_scenario_3_crashlog()
    print("Done. Ready for demo.")