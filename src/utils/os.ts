import * as os from 'os';

export function getSystemInfo() {
    let arch = os.arch();
    let platform = "";

    switch (os.platform()) {
        case 'win32':
            platform = 'Windows';
            break;
        case 'darwin':
            platform = 'Mac';
            break;
        case 'linux':
            platform = 'Linux';
            break;
        default:
            platform = 'unknown';
    }

    let bit = 64;
    switch (arch) {
        case 'ia32':
        case 'arm':
            bit = 32;
            break;
    }
    if (arch === "arm64") {
        arch = "arm";
    }
    return {platform: platform, arch: arch, bit: bit};
}