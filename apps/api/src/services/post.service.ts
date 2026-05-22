import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.js";
import { postInclude } from "./selectors.js";

type PostWithRelations = Prisma.PostGetPayload<{
  include: typeof postInclude;
}>;

async function serializePosts(posts: PostWithRelations[], viewerId?: string) {
  const postIds = posts.map((post) => post.id);
  const likedRows = viewerId
    ? await prisma.like.findMany({
        where: {
          userId: viewerId,
          postId: {
            in: postIds
          }
        },
        select: {
          postId: true
        }
      })
    : [];
  const likedIds = new Set(likedRows.map((like) => like.postId));

  return posts.map((post) => {
    const { _count, ...rest } = post;
    return {
      ...rest,
      likesCount: _count.likes,
      commentsCount: _count.comments,
      likedByMe: likedIds.has(post.id)
    };
  });
}

export async function listFeed(viewerId?: string) {
  const posts = await prisma.post.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 50,
    include: postInclude
  });

  return serializePosts(posts, viewerId);
}

export async function listUserPosts(username: string, viewerId?: string) {
  const posts = await prisma.post.findMany({
    where: {
      author: {
        username: username.toLowerCase()
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50,
    include: postInclude
  });

  return serializePosts(posts, viewerId);
}

export async function getPost(postId: string, viewerId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: postInclude
  });

  if (!post) {
    throw new AppError(404, "Post nao encontrado");
  }

  const [serialized] = await serializePosts([post], viewerId);
  return serialized!;
}

export async function createPost(authorId: string, input: { content: string; imageUrl?: string }) {
  const content = input.content.trim();

  if (!content) {
    throw new AppError(400, "O post precisa ter conteudo");
  }

  const post = await prisma.post.create({
    data: {
      authorId,
      content,
      imageUrl: input.imageUrl?.trim() || null
    },
    include: postInclude
  });

  const [serialized] = await serializePosts([post], authorId);
  return serialized!;
}

export async function deletePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      authorId: true
    }
  });

  if (!post) {
    throw new AppError(404, "Post nao encontrado");
  }

  if (post.authorId !== userId) {
    throw new AppError(403, "Voce nao pode remover este post");
  }

  await prisma.post.delete({
    where: { id: postId }
  });
}

export async function likePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true }
  });

  if (!post) {
    throw new AppError(404, "Post nao encontrado");
  }

  await prisma.like.upsert({
    where: {
      userId_postId: {
        userId,
        postId
      }
    },
    create: {
      userId,
      postId
    },
    update: {}
  });

  return getPost(postId, userId);
}

export async function unlikePost(postId: string, userId: string) {
  await prisma.like.deleteMany({
    where: {
      userId,
      postId
    }
  });

  return getPost(postId, userId);
}

export async function addComment(postId: string, authorId: string, content: string) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new AppError(400, "O comentario precisa ter conteudo");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true }
  });

  if (!post) {
    throw new AppError(404, "Post nao encontrado");
  }

  await prisma.comment.create({
    data: {
      postId,
      authorId,
      content: trimmedContent
    }
  });

  return getPost(postId, authorId);
}

export async function deleteComment(postId: string, commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      post: {
        select: {
          id: true,
          authorId: true
        }
      }
    }
  });

  if (!comment || comment.postId !== postId) {
    throw new AppError(404, "Comentario nao encontrado");
  }

  if (comment.authorId !== userId && comment.post.authorId !== userId) {
    throw new AppError(403, "Voce nao pode remover este comentario");
  }

  await prisma.comment.delete({
    where: { id: commentId }
  });

  return getPost(postId, userId);
}
