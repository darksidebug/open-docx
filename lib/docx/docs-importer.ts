import { DocxPackageReader } from "./core/docx-package-reader";
import { DocxXmlParser } from "./parser/xml-parser";
import { DocxDocumentParser } from "./parser/document-parser";
import { DocxDocument } from "@/types/docx";

export class DocxImporter {
    async import(
        file: Blob
    ): Promise<DocxDocument> {

        const packageReader =
            await DocxPackageReader.fromBlob(
                file
            );

        const xmlParser =
            new DocxXmlParser();

        const documentXml =
            xmlParser.parse(
                await packageReader.readText(
                    "word/document.xml"
                )
            );

        const stylesXml =
            packageReader.has(
                "word/styles.xml"
            )
                ? xmlParser.parse(
                    await packageReader.readText(
                        "word/styles.xml"
                    )
                )
                : null;

        const numberingXml =
            packageReader.has(
                "word/numbering.xml"
            )
                ? xmlParser.parse(
                    await packageReader.readText(
                        "word/numbering.xml"
                    )
                )
                : null;

        const styles =
            stylesXml
                ? new StyleParser().parse(
                    stylesXml
                )
                : emptyStyles();

        const numbering =
            numberingXml
                ? new NumberingParser().parse(
                    numberingXml
                )
                : emptyNumbering();

        const context =
            createParseContext(
                styles,
                numbering
            );

        const parser =
            new DocxDocumentParser(
                context
            );

        return parser.parse(
            documentXml
        );
    }
}