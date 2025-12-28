// Shim for import.meta.env support in shared code
interface ImportMeta {
    env: Record<string, string | undefined>;
}
