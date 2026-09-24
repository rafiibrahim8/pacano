import auth from './auth';
import {
    Params,
    json,
    getAllPackages,
    addPackage,
    addRepo,
    deletePackage,
    deleteRepo,
    getPackage,
    getPackages,
    getRepo,
    getRepos,
} from './controller';

type Handler = (params: Params, body: any) => Promise<Response>;

interface Route {
    method: string;
    pattern: RegExp;
    keys: string[];
    handler: Handler;
}

const BODY_LIMIT = 100 * 1024;

const routes: Route[] = [];

const route = (method: string, path: string, handler: Handler): void => {
    const keys: string[] = [];
    const source = path
        .replace(/\//g, '\\/')
        .replace(/:(\w+)/g, (_, key: string) => {
            keys.push(key);
            return '(?:([^\\/]+?))';
        });
    routes.push({
        method,
        pattern: new RegExp(`^${source}\\/?$`, 'i'),
        keys,
        handler,
    });
};

const httpError = (name: string, message: string, status: number) =>
    Object.assign(new Error(message), { name, status });

const parseBody = async (req: Request): Promise<any> => {
    const type = (req.headers.get('content-type') ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    if (type !== 'application/json') {
        return {};
    }
    const raw = await req.arrayBuffer();
    if (raw.byteLength > BODY_LIMIT) {
        throw httpError('PayloadTooLargeError', 'request entity too large', 413);
    }
    if (raw.byteLength === 0) {
        return {};
    }
    const text = new TextDecoder().decode(raw);
    let body;
    try {
        body = JSON.parse(text);
    } catch (err) {
        throw Object.assign(err as Error, { status: 400 });
    }
    if (body === null || typeof body !== 'object') {
        const position = text.search(/[^ \t\n\r]/);
        throw httpError(
            'SyntaxError',
            `Unexpected token ${text[position]} in JSON at position ${position}`,
            400,
        );
    }
    return body;
};

const decodeParam = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        throw httpError('URIError', `Failed to decode param '${value}'`, 400);
    }
};

const notFound = (method: string, pathname: string): Response =>
    new Response(
        `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot ${method} ${Bun.escapeHTML(pathname)}</pre>\n</body>\n</html>\n`,
        {
            status: 404,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Security-Policy': "default-src 'none'",
                'X-Content-Type-Options': 'nosniff',
            },
        },
    );

route('GET', '/package', getAllPackages);
route('GET', '/package/:package', getPackage);
route('POST', '/package', addPackage);
route('DELETE', '/package', deletePackage);
route('GET', '/repo', getRepos);
route('GET', '/repo/:repo', getRepo);
route('GET', '/repo/:repo/packages', getPackages);
route('POST', '/repo', addRepo);
route('DELETE', '/repo', deleteRepo);

const app = async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    try {
        const body = await parseBody(req);
        if (!auth(req)) {
            return json(403, { msg: 'Permission denied!' });
        }
        const method = req.method === 'HEAD' ? 'GET' : req.method;
        for (const { method: routeMethod, pattern, keys, handler } of routes) {
            const match = routeMethod === method && pattern.exec(pathname);
            if (match) {
                const params = Object.fromEntries(
                    keys.map((key, i) => [key, decodeParam(match[i + 1])]),
                );
                return await handler(params, body);
            }
        }
        return notFound(req.method, pathname);
    } catch (err: any) {
        console.log(err);
        return json(err.status || 500, {
            msg: `Error Occurred. Reason: ${err}`,
        });
    }
};

export default app;
