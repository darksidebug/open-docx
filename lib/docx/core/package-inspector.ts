import { DocxPackageManifest } from "@/types/manifest";
import { DocxPackageReader } from "./docx-package-reader";

export class DocxPackageInspector {
    constructor(
        private readonly reader: DocxPackageReader
    ) {}

    inspect(): DocxPackageManifest {
        const files =
            this.reader.listFiles();

        return {
            hasDocument:
                files.includes(
                    "word/document.xml"
                ),

            hasStyles:
                files.includes(
                    "word/styles.xml"
                ),

            hasNumbering:
                files.includes(
                    "word/numbering.xml"
                ),

            hasSettings:
                files.includes(
                    "word/settings.xml"
                ),

            hasTheme:
                files.some(file =>
                    file.startsWith(
                        "word/theme/"
                    )
                ),

            headers:
                files.filter(file =>
                    /^word\/header\d+\.xml$/.test(
                        file
                    )
                ),

            footers:
                files.filter(file =>
                    /^word\/footer\d+\.xml$/.test(
                        file
                    )
                ),

            media:
                files.filter(file =>
                    file.startsWith(
                        "word/media/"
                    )
                ),

            footnotes:
                files.includes(
                    "word/footnotes.xml"
                ),

            endnotes:
                files.includes(
                    "word/endnotes.xml"
                ),
        };
    }
}