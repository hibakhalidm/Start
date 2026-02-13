export interface TagDefinition {
    name: string;
    description: string;
    category: 'Universal' | 'Application' | 'Context' | 'Private';
}

export const TAG_DICTIONARY: Record<number, TagDefinition> = {
    // Universal Tags (ASN.1 Standard)
    0x01: { name: "Boolean", description: "Represents a true or false logical value.", category: "Universal" },
    0x02: { name: "Integer", description: "A signed whole number of arbitrary precision.", category: "Universal" },
    0x03: { name: "Bit String", description: "An ordered sequence of bits (0s and 1s).", category: "Universal" },
    0x04: { name: "Octet String", description: "A sequence of bytes (raw data or text).", category: "Universal" },
    0x05: { name: "Null", description: "A placeholder indicating no value.", category: "Universal" },
    0x06: { name: "Object Identifier (OID)", description: "A unique key that identifies a standard or algorithm.", category: "Universal" },
    0x0C: { name: "UTF8 String", description: "Unicode text characters.", category: "Universal" },
    0x13: { name: "Printable String", description: "Basic ASCII text (A-Z, 0-9, punctuation).", category: "Universal" },
    0x17: { name: "UTCTime", description: "A date and time string (YYMMDDhhmmZ).", category: "Universal" },
    0x30: { name: "Sequence", description: "An ordered collection of different types (like a struct).", category: "Universal" },
    0x31: { name: "Set", description: "An unordered collection of unique types.", category: "Universal" },

    // ETSI / Telecom Specific Context Tags (Examples)
    0x80: { name: "Context Specific [0]", description: "Field #0 defined by the specific protocol schema.", category: "Context" },
    0x81: { name: "Context Specific [1]", description: "Field #1 defined by the specific protocol schema.", category: "Context" },
    0xA1: { name: "Constructed Context [1]", description: "A container for Field #1 data.", category: "Context" },
};

export const getTagInfo = (tag: number): TagDefinition => {
    // Check direct match
    if (TAG_DICTIONARY[tag]) return TAG_DICTIONARY[tag];

    // Fallback logic
    if ((tag & 0xC0) === 0x80) return { name: `Context [${tag & 0x1F}]`, description: "Protocol-specific context tag.", category: "Context" };
    if ((tag & 0xC0) === 0x40) return { name: `App [${tag & 0x1F}]`, description: "Application-specific tag.", category: "Application" };

    return { name: `Unknown (0x${tag.toString(16)})`, description: "Undefined or private tag.", category: "Private" };
};
