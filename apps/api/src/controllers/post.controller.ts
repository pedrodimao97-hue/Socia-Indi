import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import * as postService from "../services/post.service.js";

const createPostSchema = z.object({
  content: z.string().min(1).max(1200),
  imageUrl: z.string().url().nullable().optional()
});

const addCommentSchema = z.object({
  content: z.string().min(1).max(600)
});

export const feed = asyncHandler(async (req, res) => {
  const posts = await postService.listFeed(req.user?.id);
  return res.json({ posts });
});

export const getById = asyncHandler(async (req, res) => {
  const post = await postService.getPost(req.params.id, req.user?.id);
  return res.json({ post });
});

export const create = asyncHandler(async (req, res) => {
  const payload = createPostSchema.parse(req.body);
  const post = await postService.createPost(req.user!.id, {
    content: payload.content,
    imageUrl: payload.imageUrl ?? undefined
  });
  return res.status(201).json({ post });
});

export const remove = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.user!.id);
  return res.status(204).send();
});

export const like = asyncHandler(async (req, res) => {
  const post = await postService.likePost(req.params.id, req.user!.id);
  return res.json({ post });
});

export const unlike = asyncHandler(async (req, res) => {
  const post = await postService.unlikePost(req.params.id, req.user!.id);
  return res.json({ post });
});

export const addComment = asyncHandler(async (req, res) => {
  const payload = addCommentSchema.parse(req.body);
  const post = await postService.addComment(req.params.id, req.user!.id, payload.content);
  return res.status(201).json({ post });
});

export const removeComment = asyncHandler(async (req, res) => {
  const post = await postService.deleteComment(
    req.params.postId,
    req.params.commentId,
    req.user!.id
  );
  return res.json({ post });
});
