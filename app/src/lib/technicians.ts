const TECHS_STORAGE_KEY = 'sm_dispatch_technicians';

export interface TechnicianDirectoryEntry {
    id: string;
    name: string;
    techCode?: string;
    status?: string;
}

type TechnicianRecord = Record<string, unknown>;

const readString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeEntry = (record: TechnicianRecord): TechnicianDirectoryEntry | null => {
    const id = readString(record.id);
    const name = readString(record.name) ?? readString(record.full_name) ?? readString(record.fullName);

    if (!id || !name) return null;

    const techCode =
        readString(record.tech_code) ??
        readString(record.techCode) ??
        readString(record.code) ??
        undefined;

    const status = readString(record.status) ?? undefined;

    return { id, name, techCode, status };
};

export const loadTechnicianDirectory = (
    fallback: TechnicianDirectoryEntry[] = []
): TechnicianDirectoryEntry[] => {
    if (typeof window === 'undefined') return fallback;

    try {
        const raw = window.localStorage.getItem(TECHS_STORAGE_KEY);
        if (!raw) return fallback;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return fallback;

        const normalized = parsed
            .filter((item): item is TechnicianRecord => typeof item === 'object' && item !== null)
            .map(normalizeEntry)
            .filter((item): item is TechnicianDirectoryEntry => item !== null);

        if (normalized.length === 0) return fallback;

        const deduped = new Map<string, TechnicianDirectoryEntry>();
        normalized.forEach((entry) => {
            deduped.set(entry.id, entry);
        });
        return [...deduped.values()];
    } catch {
        return fallback;
    }
};
