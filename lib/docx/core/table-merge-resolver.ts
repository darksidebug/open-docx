export class TableMergeResolver {
    resolve(table: any): any {
        const rows = table.rows ?? [];

        const activeMerges =
            new Map<number, {
                startRow: number;
                cell: any;
            }>();

        for (
            let rowIndex = 0;
            rowIndex < rows.length;
            rowIndex++
        ) {
            const row = rows[rowIndex];

            let columnIndex = 0;

            for (
                const cell of row.cells ?? []
            ) {
                const colspan =
                    cell.colspan ?? 1;

                const vMerge =
                    cell.verticalMerge;

                if (
                    vMerge?.type ===
                    "restart"
                ) {
                    for (
                        let offset = 0;
                        offset < colspan;
                        offset++
                    ) {
                        activeMerges.set(
                            columnIndex + offset,
                            {
                                startRow: rowIndex,
                                cell,
                            }
                        );
                    }

                    cell.rowspan = 1;
                }

                else if (
                    vMerge?.type ===
                    "continue"
                ) {
                    for (
                        let offset = 0;
                        offset < colspan;
                        offset++
                    ) {
                        const merge =
                            activeMerges.get(
                                columnIndex +
                                offset
                            );

                        if (!merge) {
                            continue;
                        }

                        merge.cell.rowspan =
                            rowIndex -
                            merge.startRow +
                            1;
                    }
                }

                else {
                    for (
                        let offset = 0;
                        offset < colspan;
                        offset++
                    ) {
                        activeMerges.delete(
                            columnIndex + offset
                        );
                    }
                }

                columnIndex += colspan;
            }
        }

        return table;
    }
}