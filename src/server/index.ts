import express from "express";
import auth from "./auth";
import { addPackage, addRepo, deletePackage, deleteRepo } from "./controller";

const app = express();
app.use(express.json());
app.use(auth);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(err);
    res.status(err.status || 500).json({ msg: `Error Occurred. Reason: ${err}` });
});

app.post('/package', addPackage);
app.delete('/package', deletePackage);
app.post('/repo', addRepo);
app.delete('/repo', deleteRepo);

export default app;
