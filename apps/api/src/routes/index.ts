import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { postsRouter } from "./posts.routes.js";
import { usersRouter } from "./users.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/posts", postsRouter);
