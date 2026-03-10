export interface TagDefinition {
    name: string;
    description: string;
    category: 'Universal' | 'Application' | 'Context' | 'Private';
}
export declare const TAG_DICTIONARY: Record<number, TagDefinition>;
export declare const getTagInfo: (tag: number | undefined | null) => TagDefinition;
//# sourceMappingURL=tag_dictionary.d.ts.map