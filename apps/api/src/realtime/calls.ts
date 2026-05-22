import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { corsOrigin } from "../config/cors.js";
import { prisma } from "../config/prisma.js";
import { publicUserSelect } from "../services/selectors.js";
import { verifyToken } from "../utils/jwt.js";

type CallMode = "audio" | "video";
type CallStatus = "ringing" | "active";
type AckResponse = {
  ok: boolean;
  message?: string;
  callId?: string;
  online?: boolean;
};
type Ack = (response: AckResponse) => void;

type CallSession = {
  id: string;
  callerId: string;
  receiverId: string;
  mode: CallMode;
  status: CallStatus;
  createdAt: number;
};

const inviteSchema = z.object({
  callId: z.string().min(6).optional(),
  toUserId: z.string().min(1),
  mode: z.enum(["audio", "video"])
});

const callIdSchema = z.object({
  callId: z.string().min(1)
});

const signalSchema = z.object({
  callId: z.string().min(1),
  signal: z.unknown()
});

const userSockets = new Map<string, Set<string>>();
const socketUsers = new Map<string, string>();
const calls = new Map<string, CallSession>();

function parseToken(socket: Socket) {
  const authToken = socket.handshake.auth?.token;

  if (typeof authToken === "string" && authToken) {
    return authToken;
  }

  const authorization = socket.handshake.headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

function addSocket(userId: string, socketId: string) {
  const sockets = userSockets.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
  socketUsers.set(socketId, userId);
}

function removeSocket(socketId: string) {
  const userId = socketUsers.get(socketId);

  if (!userId) {
    return undefined;
  }

  const sockets = userSockets.get(userId);
  sockets?.delete(socketId);

  if (!sockets || sockets.size === 0) {
    userSockets.delete(userId);
  }

  socketUsers.delete(socketId);
  return userId;
}

function isUserOnline(userId: string) {
  return Boolean(userSockets.get(userId)?.size);
}

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  const sockets = userSockets.get(userId);

  if (!sockets?.size) {
    return false;
  }

  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload);
  }

  return true;
}

function otherParticipant(call: CallSession, userId: string) {
  if (call.callerId === userId) {
    return call.receiverId;
  }

  if (call.receiverId === userId) {
    return call.callerId;
  }

  return undefined;
}

function userHasOpenCall(userId: string) {
  return Array.from(calls.values()).some(
    (call) => call.callerId === userId || call.receiverId === userId
  );
}

function acknowledge(ack: Ack | undefined, response: AckResponse) {
  if (typeof ack === "function") {
    ack(response);
  }
}

export function initRealtime(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true
    },
    maxHttpBufferSize: 1_000_000
  });

  io.use(async (socket, next) => {
    try {
      const token = parseToken(socket);

      if (!token) {
        return next(new Error("Token ausente"));
      }

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true }
      });

      if (!user) {
        return next(new Error("Token invalido"));
      }

      socket.data.userId = user.id;
      return next();
    } catch {
      return next(new Error("Token invalido"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    addSocket(userId, socket.id);
    socket.emit("presence:self", { userId });

    socket.on("call:invite", async (rawPayload: unknown, ack?: Ack) => {
      const parsed = inviteSchema.safeParse(rawPayload);

      if (!parsed.success) {
        return acknowledge(ack, { ok: false, message: "Convite de chamada invalido" });
      }

      const { toUserId, mode } = parsed.data;

      if (toUserId === userId) {
        return acknowledge(ack, { ok: false, message: "Voce nao pode ligar para si mesmo" });
      }

      if (userHasOpenCall(userId) || userHasOpenCall(toUserId)) {
        return acknowledge(ack, { ok: false, message: "Usuario em outra chamada" });
      }

      const [caller, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect }),
        prisma.user.findUnique({ where: { id: toUserId }, select: publicUserSelect })
      ]);

      if (!caller || !receiver) {
        return acknowledge(ack, { ok: false, message: "Usuario nao encontrado" });
      }

      const callId = parsed.data.callId ?? randomUUID();
      const session: CallSession = {
        id: callId,
        callerId: userId,
        receiverId: toUserId,
        mode,
        status: "ringing",
        createdAt: Date.now()
      };

      calls.set(callId, session);
      const online = emitToUser(io, toUserId, "call:incoming", {
        callId,
        mode,
        from: caller
      });

      if (!online) {
        calls.delete(callId);
      }

      return acknowledge(ack, {
        ok: online,
        callId,
        online,
        message: online ? undefined : "Usuario offline"
      });
    });

    socket.on("call:accept", (rawPayload: unknown, ack?: Ack) => {
      const parsed = callIdSchema.safeParse(rawPayload);

      if (!parsed.success) {
        return acknowledge(ack, { ok: false, message: "Chamada invalida" });
      }

      const call = calls.get(parsed.data.callId);

      if (!call || call.receiverId !== userId) {
        return acknowledge(ack, { ok: false, message: "Chamada nao encontrada" });
      }

      call.status = "active";
      emitToUser(io, call.callerId, "call:accepted", {
        callId: call.id,
        byUserId: userId
      });

      return acknowledge(ack, { ok: true, callId: call.id });
    });

    socket.on("call:reject", (rawPayload: unknown, ack?: Ack) => {
      const parsed = callIdSchema.safeParse(rawPayload);

      if (!parsed.success) {
        return acknowledge(ack, { ok: false, message: "Chamada invalida" });
      }

      const call = calls.get(parsed.data.callId);
      const peerId = call ? otherParticipant(call, userId) : undefined;

      if (!call || !peerId) {
        return acknowledge(ack, { ok: false, message: "Chamada nao encontrada" });
      }

      calls.delete(call.id);
      emitToUser(io, peerId, "call:rejected", {
        callId: call.id,
        byUserId: userId
      });

      return acknowledge(ack, { ok: true, callId: call.id });
    });

    socket.on("call:end", (rawPayload: unknown, ack?: Ack) => {
      const parsed = callIdSchema.safeParse(rawPayload);

      if (!parsed.success) {
        return acknowledge(ack, { ok: false, message: "Chamada invalida" });
      }

      const call = calls.get(parsed.data.callId);
      const peerId = call ? otherParticipant(call, userId) : undefined;

      if (!call || !peerId) {
        return acknowledge(ack, { ok: false, message: "Chamada nao encontrada" });
      }

      calls.delete(call.id);
      emitToUser(io, peerId, "call:ended", {
        callId: call.id,
        byUserId: userId,
        reason: "ended"
      });

      return acknowledge(ack, { ok: true, callId: call.id });
    });

    socket.on("call:signal", (rawPayload: unknown, ack?: Ack) => {
      const parsed = signalSchema.safeParse(rawPayload);

      if (!parsed.success) {
        return acknowledge(ack, { ok: false, message: "Sinal WebRTC invalido" });
      }

      const call = calls.get(parsed.data.callId);
      const peerId = call ? otherParticipant(call, userId) : undefined;

      if (!call || !peerId) {
        return acknowledge(ack, { ok: false, message: "Chamada nao encontrada" });
      }

      emitToUser(io, peerId, "call:signal", {
        callId: call.id,
        fromUserId: userId,
        signal: parsed.data.signal
      });

      return acknowledge(ack, { ok: true, callId: call.id });
    });

    socket.on("disconnect", () => {
      const disconnectedUserId = removeSocket(socket.id);

      if (!disconnectedUserId || isUserOnline(disconnectedUserId)) {
        return;
      }

      for (const call of Array.from(calls.values())) {
        const peerId = otherParticipant(call, disconnectedUserId);

        if (peerId) {
          calls.delete(call.id);
          emitToUser(io, peerId, "call:ended", {
            callId: call.id,
            byUserId: disconnectedUserId,
            reason: "disconnected"
          });
        }
      }
    });
  });

  return io;
}
