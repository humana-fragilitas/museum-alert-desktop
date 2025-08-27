export function msToHMS(ms: number): { h: number; m: number; s: number } {
    if (!ms || ms < 0) {
       return { h: 0, m: 0, s: 0 };
    }
    const s = Math.floor(ms / 1000);
    return {
        h: Math.floor(s / 3600),
        m: Math.floor(s % 3600 / 60),
        s: s % 60
    };
}