export type DocxDiagnosticSeverity =
    | "info"
    | "warning"
    | "error";

export interface DocxDiagnostic {
    code: string;

    severity: DocxDiagnosticSeverity;

    message: string;

    path?: string;

    context?: Record<string, unknown>;
}