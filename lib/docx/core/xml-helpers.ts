export function attr(
    node: any,
    name: string
): string | null {
    return node?.attributes?.[`@_${name}`] ?? null;
}

export function text(
    node: any
): string {
    if (!node) {
        return "";
    }

    if (typeof node === "string") {
        return node;
    }

    if (typeof node["#text"] === "string") {
        return node["#text"];
    }

    if (Array.isArray(node.children)) {
        return node.children
            .filter(
                (child: any) =>
                    typeof child === "string"
            )
            .join("");
    }

    return "";
}

export function children(
    node: any,
    name: string
): any[] {
    if (!node?.children) {
        return [];
    }

    return node.children.filter(
        (child: any) =>
            child?.name === name
    );
}

export function child(
    node: any,
    name: string
): any | null {
    return (
        children(node, name)[0] ??
        null
    );
}

export function boolAttr(
    node: any,
    name: string
): boolean {
    const value = attr(node, name);

    if (value === null) {
        return false;
    }

    return ![
        "0",
        "false",
        "off",
        "none",
    ].includes(value.toLowerCase());
}

export function intAttr(
    node: any,
    name: string
): number | null {
    const value = attr(node, name);

    if (value === null) {
        return null;
    }

    const parsed = Number.parseInt(
        value,
        10
    );

    return Number.isFinite(parsed)
        ? parsed
        : null;
}

export function firstChild(
    node: any
): any | null {
    return node?.children?.[0] ?? null;
}