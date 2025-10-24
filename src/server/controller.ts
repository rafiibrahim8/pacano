import { sequelize } from '../models';
import express from 'express';
import { getMirrors } from '../core/utils';
import { UPSTREAM_MIRRORS } from '../config';

const Packages = sequelize.models.Packages;
const Repos = sequelize.models.Repos;

const getAllPackages = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    let packages_ = await Packages.findAll({ attributes: ['name'] });
    let packages = packages_.map((p: any) => p.name);
    res.json(packages);
};

const getPackages = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    let repo = await Repos.findOne({ where: { name: req.params.repo } });
    if (!repo) {
        res.status(404).json({ msg: `Repo ${req.params.repo} not found` });
        return;
    }
    let packages_ = await Packages.findAll({
        where: { repo: req.params.repo },
        attributes: ['name'],
    });
    let packages = packages_.map((p: any) => p.name);
    res.status(200).json(packages);
};

const getPackage = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    let package_ = await Packages.findOne({
        where: { name: req.params.package },
    });
    if (package_) {
        res.status(200).json(package_);
        return;
    }
    res.status(404).json({ msg: `Package ${req.params.package} not found` });
};

const addPackage = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({ msg: 'Body must be an array.' });
        return;
    }

    try {
        await Packages.bulkCreate(req.body, {
            updateOnDuplicate: ['repo'],
            validate: true,
        });
        res.status(200).json({ msg: 'Success' });
    } catch (err) {
        res.status(403).json({ msg: `Bad request. Reason: ${err}` });
    }
};

const deletePackage = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({ msg: 'Body must be an array.' });
        return;
    }
    let totalRemoved = await Packages.destroy({ where: { name: req.body } });
    if (totalRemoved) {
        res.status(200).json({ msg: `Removed ${totalRemoved} items` });
    } else {
        res.status(404).json({ msg: 'Packages not found' });
    }
};

const getRepos = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    let repos_ = await Repos.findAll({ attributes: ['name'] });
    let repos = repos_.map((r: any) => r.name);
    res.status(200).json(repos);
};

const getRepo = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    let repo = await Repos.findOne({ where: { name: req.params.repo } });
    if (repo) {
        res.status(200).json(repo);
        return;
    }
    res.status(404).json({ msg: `Repo ${req.params.repo} not found` });
};

const addRepo = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    if (!(req.body.name && req.body.mirror)) {
        res.status(400).json({ msg: 'name and mirror is required.' });
        return;
    }
    try {
        await getMirrors(req.body.mirror, req.body.repo);
    } catch {
        res.status(403).json({
            msg: `mirror ${req.body.mirror} not found in ${UPSTREAM_MIRRORS}`,
        });
        return;
    }
    let item_ = await Repos.findOne({ where: { name: req.body.name } });
    let item = { name: req.body.name, use_mirror: req.body.mirror };
    if (item_) {
        await item_.update(item);
        res.status(200).json({ msg: 'Modified' });
        return;
    }
    await Repos.create(item);
    res.status(201).json({ msg: 'Created' });
};

const deleteRepo = async (
    req: express.Request,
    res: express.Response,
): Promise<void> => {
    if (!req.body.name) {
        res.status(400).json({ msg: 'name is required.' });
        return;
    }
    await Packages.destroy({ where: { repo: req.body.name } });
    let totalRemoved = await Repos.destroy({ where: { name: req.body.name } });
    if (totalRemoved) {
        res.status(200).json({ msg: 'Removed' });
    } else {
        res.status(404).json({ msg: 'Repo not found' });
    }
};

export {
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
