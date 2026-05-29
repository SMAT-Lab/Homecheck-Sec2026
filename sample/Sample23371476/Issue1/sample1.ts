// Command execution sample
import { exec } from 'child_process';

function runDangerousCommand(cmd: string) {
    // unsafe execution of external input
    exec(cmd);
}

export { runDangerousCommand };
