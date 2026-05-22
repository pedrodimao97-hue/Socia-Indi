import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.js";
import { signToken } from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { privateUserSelect } from "./selectors.js";

type RegisterInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

type LoginInput = {
  emailOrUsername: string;
  password: string;
};

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    },
    select: {
      email: true,
      username: true
    }
  });

  if (existing?.email === email) {
    throw new AppError(409, "Email ja esta em uso");
  }

  if (existing?.username === username) {
    throw new AppError(409, "Username ja esta em uso");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      name: input.name.trim(),
      passwordHash
    },
    select: privateUserSelect
  });

  return {
    user,
    token: signToken(user.id)
  };
}

export async function login(input: LoginInput) {
  const identifier = input.emailOrUsername.trim().toLowerCase();
  const userWithPassword = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }]
    }
  });

  if (!userWithPassword) {
    throw new AppError(401, "Credenciais invalidas");
  }

  const passwordMatches = await comparePassword(input.password, userWithPassword.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "Credenciais invalidas");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userWithPassword.id },
    select: privateUserSelect
  });

  return {
    user,
    token: signToken(user.id)
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: privateUserSelect
  });

  if (!user) {
    throw new AppError(404, "Usuario nao encontrado");
  }

  return user;
}
