// src/utils/tag_dictionary.ts
// ASN.1 Universal tags + full ETSI TS 101 671 / 102 232 / 3GPP TS 33.108 tag set.
export const TAG_DICTIONARY = {
    // ── ASN.1 Universal Tags ──────────────────────────────────────────────────
    0x01: { name: "Boolean", description: "True/false logical value.", category: "Universal" },
    0x02: { name: "Integer", description: "Signed integer of arbitrary precision.", category: "Universal" },
    0x03: { name: "Bit String", description: "Ordered sequence of bits.", category: "Universal" },
    0x04: { name: "Octet String", description: "Raw byte payload or opaque data.", category: "Universal" },
    0x05: { name: "Null", description: "Absence of a value.", category: "Universal" },
    0x06: { name: "OID", description: "Object Identifier — globally unique protocol key.", category: "Universal" },
    0x0A: { name: "Enumerated", description: "Named integer constant (enum value).", category: "Universal" },
    0x0C: { name: "UTF8 String", description: "Unicode text (UTF-8 encoding).", category: "Universal" },
    0x13: { name: "Printable String", description: "ASCII subset string (letters, digits, punctuation).", category: "Universal" },
    0x14: { name: "Teletex String", description: "ISO/IEC 2022 T.61 encoded string.", category: "Universal" },
    0x16: { name: "IA5 String", description: "7-bit ASCII international alphabet string.", category: "Universal" },
    0x17: { name: "UTC Time", description: "Date-time: YYMMDDhhmmZ format.", category: "Universal" },
    0x18: { name: "Generalized Time", description: "Full date-time: YYYYMMDDhhmmssZ (ETSI timestamps).", category: "Universal" },
    0x1A: { name: "Visible String", description: "Visible ISO 646 character string.", category: "Universal" },
    0x1E: { name: "BMP String", description: "Unicode Basic Multilingual Plane string.", category: "Universal" },
    0x30: { name: "Sequence", description: "Ordered struct-like container (DER/BER SEQUENCE).", category: "Universal" },
    0x31: { name: "Set", description: "Unordered unique-type container (DER/BER SET).", category: "Universal" },
    // ── ETSI TS 101 671 — Application-class LI containers ────────────────────
    // These are CONSTRUCTED APPLICATION tags bearing HI2/HI3 intercept payloads.
    0x61: { name: "HI2 IRI Container", description: "ETSI TS 101 671 [APPLICATION 1] — Intercept Related Information (IRI) envelope.", category: "Application" },
    0x62: { name: "App [2] Container", description: "APPLICATION 2 CONSTRUCTED — protocol-specific.", category: "Application" },
    0x63: { name: "HI3 CC Container", description: "ETSI TS 101 671 [APPLICATION 3] — Content of Communication (CC) payload.", category: "Application" },
    0x41: { name: "IRI Primitive [1]", description: "APPLICATION 1 PRIMITIVE IRI field.", category: "Application" },
    0x43: { name: "CC Primitive [3]", description: "APPLICATION 3 PRIMITIVE CC field.", category: "Application" },
    0x64: { name: "App [4] Container", description: "APPLICATION 4 CONSTRUCTED — protocol-specific.", category: "Application" },
    // ── ETSI / 3GPP TS 33.108 — Context-specific primitive fields ────────────
    // Primitive context tags ([n] IMPLICIT) used inside LI headers.
    0x80: { name: "LIID / Target ID [0]", description: "3GPP [0] — Lawful Interception ID or Target Identifier (IMSI/MSISDN).", category: "Context" },
    0x81: { name: "Sequence Number [1]", description: "3GPP [1] — IRI sequence number or LIID string.", category: "Context" },
    0x82: { name: "Comm. Identifier [2]", description: "3GPP [2] — Communication Identifier (call-ID, session-ID).", category: "Context" },
    0x83: { name: "Network Identifier [3]", description: "3GPP [3] — Network/Node Identifier (LAC, Cell-ID).", category: "Context" },
    0x84: { name: "Timestamp [4]", description: "3GPP [4] — GeneralizedTime timestamp of intercept event.", category: "Context" },
    0x85: { name: "Service Type [5]", description: "3GPP [5] — Service type (voice, data, SMS, GPRS, VoIP).", category: "Context" },
    0x86: { name: "Target Address [6]", description: "3GPP [6] — Intercept target address (IP, MSISDN, IMSI).", category: "Context" },
    0x87: { name: "Direction [7]", description: "3GPP [7] — Intercept direction (to/from target).", category: "Context" },
    0x88: { name: "GPRS Params [8]", description: "3GPP [8] — GPRS parameters (PDP context, APN).", category: "Context" },
    0x89: { name: "SMS Content [9]", description: "3GPP [9] — SMS content or delivery report.", category: "Context" },
    // ── ETSI — Context-specific CONSTRUCTED containers ────────────────────────
    // Constructed context tags ([n] CONSTRUCTED) wrapping sub-fields.
    0xA0: { name: "Content From Target [0]", description: "ETSI [0] CONSTRUCTED — CC payload from intercept target.", category: "Context" },
    0xA1: { name: "Content To Target [1]", description: "ETSI [1] CONSTRUCTED — CC payload sent to intercept target.", category: "Context" },
    0xA2: { name: "Comm. ID Container [2]", description: "ETSI [2] CONSTRUCTED — CommunicationIdentifier structured wrapper.", category: "Context" },
    0xA3: { name: "Network ID Container [3]", description: "ETSI [3] CONSTRUCTED — NetworkIdentifier structured wrapper.", category: "Context" },
    0xA4: { name: "Timestamp Container [4]", description: "ETSI [4] CONSTRUCTED — Timestamp structured wrapper.", category: "Context" },
    0xA5: { name: "Service Container [5]", description: "ETSI [5] CONSTRUCTED — Service parameters container.", category: "Context" },
};
export const getTagInfo = (tag) => {
    if (tag == null) {
        return { name: "Unknown Segment", description: "No tag information available.", category: "Private" };
    }
    if (TAG_DICTIONARY[tag])
        return TAG_DICTIONARY[tag];
    // Fallback for unlisted Context/Application tags
    const tagClass = tag & 0xC0;
    const tagNum = tag & 0x1F;
    const isConstructed = (tag & 0x20) === 0x20;
    const cStr = isConstructed ? ' CONSTRUCTED' : '';
    if (tagClass === 0x80)
        return {
            name: `Context [${tagNum}]${cStr}`,
            description: `Context-specific field #${tagNum} — defined by the enclosing protocol schema.`,
            category: "Context"
        };
    if (tagClass === 0x40)
        return {
            name: `Application [${tagNum}]${cStr}`,
            description: `Application-specific container #${tagNum}.`,
            category: "Application"
        };
    if (tagClass === 0xC0)
        return {
            name: `Private [${tagNum}]${cStr}`,
            description: `Vendor private tag #${tagNum}.`,
            category: "Private"
        };
    return { name: `Unknown (0x${tag.toString(16).toUpperCase()})`, description: "Undefined tag.", category: "Private" };
};
/** Map an etsi_role string to a human-readable badge label */
export const getEtsiRoleLabel = (role) => {
    if (role.includes('102232_IRI') || role.includes('IRI_Header'))
        return { label: 'IRI Header', color: '#ff3366' };
    if (role.includes('102232_CC') || role.includes('CC_Payload'))
        return { label: 'CC Payload', color: '#ff6600' };
    if (role.includes('102232'))
        return { label: 'ETSI 102 232', color: '#ff3366' };
    if (role.includes('TS101671_HI2'))
        return { label: 'HI2 IRI', color: '#ff3366' };
    if (role.includes('TS101671_HI3'))
        return { label: 'HI3 CC', color: '#ff6600' };
    if (role.includes('3GPP') || role.includes('33108'))
        return { label: '3GPP LI', color: '#a855f7' };
    if (role.includes('LIID') || role.includes('TargetIdentifier'))
        return { label: 'LIID', color: '#f59e0b' };
    if (role.includes('Timestamp'))
        return { label: 'LI Timestamp', color: '#34d399' };
    if (role.includes('CommIdentifier'))
        return { label: 'Comm ID', color: '#60a5fa' };
    if (role.includes('SeqNum'))
        return { label: 'Seq Num', color: '#94a3b8' };
    if (role.includes('OID_Discriminator'))
        return { label: 'OID', color: '#fbbf24' };
    if (role.includes('CC_'))
        return { label: 'CC Field', color: '#fb923c' };
    return { label: role.replace(/_/g, ' '), color: '#888' };
};
//# sourceMappingURL=tag_dictionary.js.map