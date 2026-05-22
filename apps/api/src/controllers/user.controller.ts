import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import * as userService from "../services/user.service.js";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(240).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional()
});

export const search = asyncHandler(async (req, res) => {
  const searchTerm = typeof req.query.search === "string" ? req.query.search : "";
  const users = await userService.searchUsers(searchTerm, req.user?.id);
  return res.json({ users });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getProfile(req.params.username, req.user?.id);
  return res.json({ profile });
});

export const updateMe = asyncHandler(async (req, res) => {
  const payload = updateProfileSchema.parse(req.body);
  const user = await userService.updateMyProfile(req.user!.id, payload);
  return res.json({ user });
});

export const follow = asyncHandler(async (req, res) => {
  await userService.followUser(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const unfollow = asyncHandler(async (req, res) => {
  await userService.unfollowUser(req.user!.id, req.params.id);
  return res.status(204).send();
});
