import fs from 'node:fs';

interface SpawnResult {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: NodeJS.Signals | null;
}

interface SpawnOptions {
    cwd?: string;
    stdio?: 'pipe' | 'inherit';
}

const readStream = (stream: unknown): Promise<string> =>
    stream instanceof ReadableStream
        ? new Response(stream).text()
        : Promise.resolve('');

async function spawnPromise(
    command: string,
    args: string[] = [],
    options: SpawnOptions = {},
): Promise<SpawnResult> {
    const inherit = options.stdio === 'inherit';
    const child = Bun.spawn([command, ...args], {
        cwd: options.cwd,
        stdin: inherit ? 'inherit' : 'ignore',
        stdout: inherit ? 'inherit' : 'pipe',
        stderr: inherit ? 'inherit' : 'pipe',
    });
    const [stdout, stderr] = await Promise.all([
        readStream(child.stdout),
        readStream(child.stderr),
    ]);
    await child.exited;
    return {
        stdout,
        stderr,
        code: child.exitCode,
        signal: child.signalCode,
    };
}

async function spawnPromiseStrict(
    command: string,
    args: string[] = [],
    options: SpawnOptions = {},
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
