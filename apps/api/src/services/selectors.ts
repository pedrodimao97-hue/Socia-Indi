import type { Prisma } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
  createdAt: true
} satisfies Prisma.UserSelect;

export const privateUserSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
  createdAt: true
} satisfies Prisma.UserSelect;

export const postInclude = {
  author: {
    select: publicUserSelect
  },
  comments: {
    orderBy: {
      createdAt: "asc"
    },
    include: {
      author: {
        select: publicUserSelect
      }
    }
  },
  _count: {
    select: {
      likes: true,
      comments: true
    }
  }
} satisfies Prisma.PostInclude;
