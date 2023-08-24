import { spawnSync } from 'child_process';

export function CanFmt(binary: string): boolean {
    const p = spawnSync(binary, ["fmt", "-version"]);
    return p.stdout?.toString().includes("Formatter version:");
}
