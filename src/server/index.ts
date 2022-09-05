import express from "express";
import auth from "./auth";
import { getAllPackages, addPackage, addRepo, deletePackage, deleteRepo, getPackage, getPackages, getRepo, getRepos } from "./controller";

const app = express();
app.use(express.json());
app.use(auth);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(err);
    res.status(err.status || 500).json({ msg: `Error Occurred. Reason: ${err}` });
});

app.get('/package', getAllPackages);
app.get('/package/:package', getPackage);
app.post('/package', addPackage);
app.delete('/package', deletePackage);
app.get('/repo', getRepos);
app.get('/repo/:repo', getRepo);
app.get('/repo/:repo/packages', getPackages);
app.post('/repo', addRepo);
app.delete('/repo', deleteRepo);

export default app;
