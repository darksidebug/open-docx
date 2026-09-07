export function attr(
    node: any,
    name: string
): string | null {
    return node?.[`@_${name}`] ?? null;
}

export function text(
    node: any
): string {
    if (node === null || node === undefined) {
        return "";
    }

    if (typeof node === "string") {
        return node;
    }

    if (typeof node === "number") {
        return String(node);
    }

    return node["#text"] ?? "";
}

export function children(
    node: any,
    name: string
): any[] {
    if (!node) {
        return [];
    }

    const value = node[name];

    if (!value) {
        return [];
    }

    return Array.isArray(value)
        ? value
        : [value];
}

export function child(
    node: any,
    name: string
): any | null {
    const values = children(node, name);

    return values[0] ?? null;
}

export function boolAttr(
    node: any,
    name: string
): boolean {
    const value = attr(node, name);

    if (value === null) {
        return true;
    }

    return (
        value === "1" ||
        value === "true" ||
        value === "on"
    );
}

export function intAttr(
    node: any,
    name: string
): number | null {
    const value = attr(node, name);

    if (value === null) {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : null;
}