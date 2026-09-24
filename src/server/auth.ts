import crypto from 'node:crypto';
import { ADMIN_TOKEN } from '../config';

const auth = (req: Request): boolean => {
    let token = '';
    const authorization = req.headers.get('authorization');
    if (authorization && authorization.toLowerCase().startsWith('bearer')) {
        token = authorization.split(' ')[1] ?? '';
    }
    let hash0 = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();
    let hash1 = crypto.createHash('sha256').update(token).digest();
    return crypto.timingSafeEqual(hash0, hash1);
};

export default auth;
