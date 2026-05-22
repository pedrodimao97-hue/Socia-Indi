import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "./error.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return next(new AppError(401, "Token ausente"));
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true }
    });

    if (!user) {
      return next(new AppError(401, "Token invalido"));
    }

    req.user = { id: user.id };
    return next();
  } catch {
    return next(new AppError(401, "Token invalido"));
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true }
    });

    if (user) {
      req.user = { id: user.id };
    }
  } catch {
    req.user = undefined;
  }

  return next();
}
