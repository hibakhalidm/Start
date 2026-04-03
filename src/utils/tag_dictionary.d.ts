export interface TagDefinition {
    name: string;
    description: string;
    category: 'Universal' | 'Application' | 'Context' | 'Private';
}
export declare const TAG_DICTIONARY: Record<number, TagDefinition>;
export declare const getTagInfo: (tag: number | undefined | null) => TagDefinition;
/** Map an etsi_role string to a human-readable badge label */
export declare const getEtsiRoleLabel: (role: string) => {
    label: string;
    color: string;
};
//# sourceMappingURL=tag_dictionary.d.ts.map