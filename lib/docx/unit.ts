export const DocxUnits = {
    twipsToPx(value: number): number {
        return value / 15;
    },

    twipsToPt(value: number): number {
        return value / 20;
    },

    halfPointsToPt(value: number): number {
        return value / 2;
    },

    emuToPx(value: number): number {
        return value / 9525;
    },

    eighthPointsToPt(value: number): number {
        return value / 8;
    },

    parseTwips(value?: string | null): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : null;
    },

    parseHalfPoints(value?: string | null): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : null;
    },

    parseEmu(value?: string | null): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : null;
    },
};