import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/", optionalAuth, userController.search);
usersRouter.patch("/me", requireAuth, userController.updateMe);
usersRouter.get("/:username", optionalAuth, userController.getProfile);
usersRouter.post("/:id/follow", requireAuth, userController.follow);
usersRouter.delete("/:id/follow", requireAuth, userController.unfollow);
