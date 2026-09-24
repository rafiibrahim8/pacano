import { Packages, Repos } from '../models';
import { getMirrors } from '../core/utils';
import { UPSTREAM_MIRRORS } from '../config';

type Params = Record<string, string>;

const json = (status: number, data: unknown): Response =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

const getAllPackages = async (): Promise<Response> => {
    return json(200, Packages.findNames());
};

const getPackages = async (params: Params): Promise<Response> => {
    let repo = Repos.findOne(params.repo);
    if (!repo) {
        return json(404, { msg: `Repo ${params.repo} not found` });
    }
    return json(200, Packages.findNamesByRepo(params.repo));
};

const getPackage = async (params: Params): Promise<Response> => {
    let package_ = Packages.findOne(params.package);
    if (package_) {
        return json(200, Packages.toJSON(package_));
    }
    return json(404, { msg: `Package ${params.package} not found` });
};

const addPackage = async (params: Params, body: any): Promise<Response> => {
    if (!Array.isArray(body)) {
        return json(400, { msg: 'Body must be an array.' });
    }

    try {
        Packages.bulkCreate(body, ['repo']);
        return json(200, { msg: 'Success' });
    } catch (err) {
        return json(403, { msg: `Bad request. Reason: ${err}` });
    }
};

const deletePackage = async (params: Params, body: any): Promise<Response> => {
    if (!Array.isArray(body)) {
        return json(400, { msg: 'Body must be an array.' });
    }
    let totalRemoved = Packages.destroy(body);
    if (totalRemoved) {
        return json(200, { msg: `Removed ${totalRemoved} items` });
    }
    return json(404, { msg: 'Packages not found' });
};

const getRepos = async (): Promise<Response> => {
    return json(200, Repos.findNames());
};

const getRepo = async (params: Params): Promise<Response> => {
    let repo = Repos.findOne(params.repo);
    if (repo) {
        return json(200, Repos.toJSON(repo));
    }
    return json(404, { msg: `Repo ${params.repo} not found` });
};

const addRepo = async (params: Params, body: any): Promise<Response> => {
    if (!(body.name && body.mirror)) {
        return json(400, { msg: 'name and mirror is required.' });
    }
    try {
        await getMirrors(body.mirror, body.repo);
    } catch {
        return json(403, {
            msg: `mirror ${body.mirror} not found in ${UPSTREAM_MIRRORS}`,
        });
    }
    let item_ = Repos.findOne(body.name);
    if (item_) {
        if (item_.use_mirror !== body.mirror) {
            Repos.update(body.name, { use_mirror: body.mirror });
        }
        return json(200, { msg: 'Modified' });
    }
    Repos.create(body.name, body.mirror);
    return json(201, { msg: 'Created' });
};

const deleteRepo = async (params: Params, body: any): Promise<Response> => {
    if (!body.name) {
        return json(400, { msg: 'name is required.' });
    }
    Packages.destroyByRepo(body.name);
    let totalRemoved = Repos.destroy(body.name);
    if (totalRemoved) {
        return json(200, { msg: 'Removed' });
    }
    return json(404, { msg: 'Repo not found' });
};

export type { Params };
export {
    json,
    getAllPackages,
    getPackage,
    getPackages,
    addPackage,
    deletePackage,
    addRepo,
    deleteRepo,
    getRepos,
    getRepo,
};
