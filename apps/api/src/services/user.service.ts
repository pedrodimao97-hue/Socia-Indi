import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.js";
import { listUserPosts } from "./post.service.js";
import { publicUserSelect } from "./selectors.js";

async function addFollowFlags<T extends { id: string }>(users: T[], viewerId?: string) {
  if (!viewerId || users.length === 0) {
    return users.map((user) => ({ ...user, isFollowing: false }));
  }

  const rows = await prisma.follow.findMany({
    where: {
      followerId: viewerId,
      followingId: {
        in: users.map((user) => user.id)
      }
    },
    select: {
      followingId: true
    }
  });

  const followingIds = new Set(rows.map((row) => row.followingId));
  return users.map((user) => ({
    ...user,
    isFollowing: followingIds.has(user.id)
  }));
}

export async function searchUsers(search = "", viewerId?: string) {
  const term = search.trim();
  const users = await prisma.user.findMany({
    where: term
      ? {
          OR: [
            { username: { contains: term } },
            { name: { contains: term } }
          ]
        }
      : undefined,
    take: 30,
    orderBy: {
      createdAt: "desc"
    },
    select: {
      ...publicUserSelect,
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true
        }
      }
    }
  });

  const withCounts = users.map((user) => {
    const { _count, ...rest } = user;
    return {
      ...rest,
      postsCount: _count.posts,
      followersCount: _count.followers,
      followingCount: _count.following
    };
  });

  return addFollowFlags(withCounts, viewerId);
}

export async function getProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: {
      username: username.toLowerCase()
    },
    select: {
      ...publicUserSelect,
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError(404, "Usuario nao encontrado");
  }

  const [withFlags] = await addFollowFlags([user], viewerId);
  const { _count, ...rest } = withFlags!;
  const posts = await listUserPosts(username, viewerId);

  return {
    ...rest,
    postsCount: _count.posts,
    followersCount: _count.followers,
    followingCount: _count.following,
    posts
  };
}

export async function updateMyProfile(
  userId: string,
  input: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  }
) {
  const data: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }

  if (input.bio !== undefined) {
    data.bio = input.bio?.trim() || null;
  }

  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl?.trim() || null;
  }

  const user = await prisma.user.update({
    where: {
      id: userId
    },
    data,
    select: publicUserSelect
  });

  return user;
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new AppError(400, "Voce nao pode seguir a si mesmo");
  }

  const target = await prisma.user.findUnique({
    where: {
      id: followingId
    },
    select: {
      id: true
    }
  });

  if (!target) {
    throw new AppError(404, "Usuario nao encontrado");
  }

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId,
        followingId
      }
    },
    create: {
      followerId,
      followingId
    },
    update: {}
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId
    }
  });
}
