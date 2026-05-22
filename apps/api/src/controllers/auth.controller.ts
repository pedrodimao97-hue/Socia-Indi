import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import * as authService from "../services/auth.service.js";

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras, numeros e underscore"),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(8)
});

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const result = await authService.register(payload);
  return res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await authService.login(payload);
  return res.json(result);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.id);
  return res.json({ user });
});
