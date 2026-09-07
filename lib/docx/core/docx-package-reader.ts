import JSZip from "jszip";

export class DocxPackageReader {
    private zip!: JSZip;

    async load(input: ArrayBuffer | Uint8Array): Promise<void> {
        this.zip = await JSZip.loadAsync(input);
    }

    has(path: string): boolean {
        return this.zip.file(path) !== null;
    }

    async readText(path: string): Promise<string> {
        const file = this.zip.file(path);

        if (!file) {
            throw new Error(`DOCX entry not found: ${path}`);
        }

        return file.async("text");
    }

    async readBinary(path: string): Promise<Uint8Array> {
        const file = this.zip.file(path);

        if (!file) {
            throw new Error(`DOCX entry not found: ${path}`);
        }

        return file.async("uint8array");
    }

    listFiles(): string[] {
        return Object.keys(this.zip.files);
    }
}