import { sequelize } from "../models";
import express from "express";
import { getMirrors } from "../core/utils";
import { UPSTREAM_MIRRORS } from "../config";

const Packages = sequelize.models.Packages;
const Repos = sequelize.models.Repos;

const addPackage = async (req: express.Request, res: express.Response): Promise<void> => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({ msg: "Body must be an array." });
        return;
    }

    try {
        await Packages.bulkCreate(req.body, { updateOnDuplicate: ['repo'], validate: true });
        res.status(200).json({ msg: 'Success' });
    } catch (err) {
        res.status(403).json({ msg: `Bad request. Reason: ${err}`});
    }
};

const deletePackage = async (req: express.Request, res: express.Response): Promise<void> => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({ msg: "Body must be an array." });
        return;
    }
    let totalRemoved = await Packages.destroy({ where: { name: req.body } });
    if (totalRemoved) {
        res.status(200).json({ msg: `Removed ${totalRemoved} items` });
    } else {
        res.status(404).json({ msg: 'Packages not found' });
    }
};

const addRepo = async (req: express.Request, res: express.Response): Promise<void> => {
    if (!(req.body.name && req.body.mirror)) {
        res.status(400).json({ msg: 'name and mirror is required.' });
        return;
    }
    try {
        getMirrors(req.body.mirror, req.body.repo);
    } catch {
        res.status(403).json({ msg: `mirror ${req.body.mirror} not found in ${UPSTREAM_MIRRORS}` });
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

const deleteRepo = async (req: express.Request, res: express.Response): Promise<void> => {
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

export { addPackage, deletePackage, addRepo, deleteRepo };

