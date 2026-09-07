export interface OrderedXmlNode {
    [key: string]: unknown;
}

export function nodeName(
    node: OrderedXmlNode
): string | null {
    const keys =
        Object.keys(node);

    return keys.length
        ? keys[0]
        : null;
}

export function nodeValue(
    node: OrderedXmlNode
): unknown {
    const name =
        nodeName(node);

    return name
        ? node[name]
        : null;
}