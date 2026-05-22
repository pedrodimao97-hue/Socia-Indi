import { Router } from "express";
import * as postController from "../controllers/post.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const postsRouter = Router();

postsRouter.get("/", optionalAuth, postController.feed);
postsRouter.post("/", requireAuth, postController.create);
postsRouter.get("/:id", optionalAuth, postController.getById);
postsRouter.delete("/:id", requireAuth, postController.remove);
postsRouter.post("/:id/like", requireAuth, postController.like);
postsRouter.delete("/:id/like", requireAuth, postController.unlike);
postsRouter.post("/:id/comments", requireAuth, postController.addComment);
postsRouter.delete("/:postId/comments/:commentId", requireAuth, postController.removeComment);
