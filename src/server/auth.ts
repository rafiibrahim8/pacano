import express from "express";
import crypto from "crypto";
import { ADMIN_TOKEN } from "../config";

const auth = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    let token = '';
    if (req.headers.authorization && req.headers.authorization.toLowerCase().startsWith("bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    let hash0 = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();
    let hash1 = crypto.createHash('sha256').update(token).digest();
    let match = crypto.timingSafeEqual(hash0, hash1);

    if (!match) {
        res.status(403).json({ msg: "Permission denied!" });
        return;
    }
    next();
};

export default auth;
