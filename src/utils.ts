import fs from 'node:fs';
import { spawn, SpawnOptions } from 'child_process';
interface SpawnResult {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: NodeJS.Signals | null;
}

interface SpawnPromiseOptions extends SpawnOptions {
    encoding?: BufferEncoding;
    maxBuffer?: number;
}

function spawnPromise(
    command: string,
    args: string[] = [],
    options: SpawnPromiseOptions = {},
): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
        const {
            encoding = 'utf8',
            maxBuffer = 10 * 1024 * 1024,
            ...spawnOpts
        } = options;

        const child = spawn(command, args, spawnOpts);

        let stdout = '';
        let stderr = '';
        let stdoutBuffer = Buffer.alloc(0);
        let stderrBuffer = Buffer.alloc(0);

        if (child.stdout) {
            child.stdout.on('data', (chunk: Buffer) => {
                stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);
                if (stdoutBuffer.length > maxBuffer) {
                    child.kill();
                    reject(
                        new Error(
                            `stdout maxBuffer exceeded: ${maxBuffer} bytes`,
                        ),
                    );
                }
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (chunk: Buffer) => {
                stderrBuffer = Buffer.concat([stderrBuffer, chunk]);
                if (stderrBuffer.length > maxBuffer) {
                    child.kill();
                    reject(
                        new Error(
                            `stderr maxBuffer exceeded: ${maxBuffer} bytes`,
                        ),
                    );
                }
            });
        }

        child.on('error', (error: Error) => {
            reject(error);
        });

        child.on(
            'close',
            (code: number | null, signal: NodeJS.Signals | null) => {
                stdout = stdoutBuffer.toString(encoding);
                stderr = stderrBuffer.toString(encoding);

                resolve({
                    stdout,
                    stderr,
                    code,
                    signal,
                });
            },
        );
    });
}

async function spawnPromiseStrict(
    command: string,
    args: string[] = [],
    options: SpawnPromiseOptions = {},
): Promise<SpawnResult> {
    const result = await spawnPromise(command, args, options);

    if (result.code !== 0) {
        const error = new Error(
            `Command failed with exit code ${
                result.code
            }: ${command} ${args.join(' ')}\n${result.stderr}`,
        ) as Error & SpawnResult;

        Object.assign(error, result);
        throw error;
    }

    return result;
}

async function assertBsdtar() {
    try {
        await spawnPromiseStrict('bsdtar', ['--version']);
    } catch (err) {
        console.log('Command bsdtar not found. Please install bsdtar.');
        process.exit(1);
    }
}

async function isExistPath(path: string): Promise<boolean> {
    try {
        await fs.promises.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export { assertBsdtar, spawnPromise, spawnPromiseStrict, isExistPath };
