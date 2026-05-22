import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { io, type Socket } from "socket.io-client";
import { apiBaseUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { User } from "../types";

export type CallMode = "audio" | "video";
export type CallStatus = "incoming" | "outgoing" | "connecting" | "active";

export type CallPeer = Pick<User, "id" | "username" | "name" | "avatarUrl">;

type CallSession = {
  callId: string;
  mode: CallMode;
  status: CallStatus;
  peer: CallPeer;
};

type CallAck = {
  ok: boolean;
  message?: string;
  callId?: string;
  online?: boolean;
};

type IncomingPayload = {
  callId: string;
  mode: CallMode;
  from: CallPeer;
};

type SignalPayload = {
  callId: string;
  fromUserId: string;
  signal: {
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
};

type CallContextValue = {
  call: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  error: string;
  startCall: (peer: CallPeer, mode: CallMode) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  clearCallError: () => void;
};

const SOCKET_URL = apiBaseUrl.replace(/\/api$/, "");
const DEFAULT_ICE_SERVERS = ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];

const CallContext = createContext<CallContextValue | undefined>(undefined);

function createCallId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getIceServers(): RTCIceServer[] {
  const configured = import.meta.env.VITE_RTC_ICE_SERVERS;
  const turnUsername = import.meta.env.VITE_RTC_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_RTC_TURN_CREDENTIAL;
  const urls =
    typeof configured === "string" && configured.trim()
      ? configured.split(",").map((url) => url.trim()).filter(Boolean)
      : DEFAULT_ICE_SERVERS;

  return urls.map((url) => {
    if (url.startsWith("turn:") && turnUsername && turnCredential) {
      return {
        urls: url,
        username: turnUsername,
        credential: turnCredential
      };
    }

    return { urls: url };
  });
}

function getMediaConstraints(mode: CallMode): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video:
      mode === "video"
        ? {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user"
          }
        : false
  };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<CallSession | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [call, setCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const updateCallStatus = useCallback((status: CallStatus) => {
    setCall((current) => (current ? { ...current, status } : current));
  }, []);

  const cleanupMedia = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const resetCall = useCallback(() => {
    cleanupMedia();
    setCall(null);
  }, [cleanupMedia]);

  const sendSignal = useCallback((callId: string, signal: SignalPayload["signal"]) => {
    socketRef.current?.emit("call:signal", { callId, signal });
  }, []);

  const prepareLocalMedia = useCallback(async (mode: CallMode) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Seu navegador nao suporta chamadas por audio/video");
    }

    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(mode));
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMuted(false);
    setCameraOff(false);
    return stream;
  }, []);

  const flushPendingCandidates = useCallback(async (peerConnection: RTCPeerConnection) => {
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const getPeerConnection = useCallback(
    (callId: string) => {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: getIceServers()
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(callId, { candidate: event.candidate.toJSON() });
        }
      };

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;

        if (stream) {
          setRemoteStream(stream);
          updateCallStatus("active");
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          updateCallStatus("active");
        }

        if (peerConnection.connectionState === "failed") {
          setError("A conexao da chamada falhou. Tente novamente.");
        }
      };

      const stream = localStreamRef.current;
      stream?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnectionRef.current = peerConnection;
      return peerConnection;
    },
    [sendSignal, updateCallStatus]
  );

  const makeOffer = useCallback(
    async (session: CallSession) => {
      updateCallStatus("connecting");
      await prepareLocalMedia(session.mode);
      const peerConnection = getPeerConnection(session.callId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: session.mode === "video"
      });
      await peerConnection.setLocalDescription(offer);

      if (peerConnection.localDescription) {
        sendSignal(session.callId, {
          description: peerConnection.localDescription.toJSON()
        });
      }
    },
    [getPeerConnection, prepareLocalMedia, sendSignal, updateCallStatus]
  );

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      const session = callRef.current;

      if (!session || payload.callId !== session.callId) {
        return;
      }

      try {
        await prepareLocalMedia(session.mode);
        const peerConnection = getPeerConnection(session.callId);

        if (payload.signal.description) {
          const description = new RTCSessionDescription(payload.signal.description);
          await peerConnection.setRemoteDescription(description);
          await flushPendingCandidates(peerConnection);

          if (description.type === "offer") {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            if (peerConnection.localDescription) {
              sendSignal(session.callId, {
                description: peerConnection.localDescription.toJSON()
              });
            }
          }

          if (description.type === "answer") {
            updateCallStatus("active");
          }
        }

        if (payload.signal.candidate) {
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.signal.candidate));
          } else {
            pendingCandidatesRef.current.push(payload.signal.candidate);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao conectar chamada");
      }
    },
    [flushPendingCandidates, getPeerConnection, prepareLocalMedia, sendSignal, updateCallStatus]
  );

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      resetCall();
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      setError(`Chamadas indisponiveis: ${err.message}`);
    });

    socket.on("call:incoming", (payload: IncomingPayload) => {
      if (callRef.current) {
        socket.emit("call:reject", { callId: payload.callId });
        return;
      }

      setError("");
      setCall({
        callId: payload.callId,
        mode: payload.mode,
        status: "incoming",
        peer: payload.from
      });
    });

    socket.on("call:accepted", async (payload: { callId: string }) => {
      const session = callRef.current;

      if (!session || session.callId !== payload.callId) {
        return;
      }

      try {
        await makeOffer(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nao foi possivel iniciar a chamada");
        socket.emit("call:end", { callId: payload.callId });
        resetCall();
      }
    });

    socket.on("call:signal", handleSignal);

    socket.on("call:rejected", () => {
      setError("Chamada recusada ou usuario ocupado.");
      resetCall();
    });

    socket.on("call:ended", (payload: { reason?: string }) => {
      setError(payload.reason === "disconnected" ? "A outra pessoa desconectou." : "Chamada encerrada.");
      resetCall();
    });

    return () => {
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [handleSignal, makeOffer, resetCall, token]);

  const startCall = useCallback(async (peer: CallPeer, mode: CallMode) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Servidor de chamadas desconectado.");
      return;
    }

    if (callRef.current) {
      setError("Voce ja esta em uma chamada.");
      return;
    }

    const callId = createCallId();
    setError("");
    setCall({
      callId,
      mode,
      status: "outgoing",
      peer
    });

    socket.emit("call:invite", { callId, toUserId: peer.id, mode }, (ack: CallAck) => {
      if (!ack.ok) {
        setError(ack.message ?? "Nao foi possivel chamar este usuario.");
        resetCall();
      }
    });
  }, [resetCall]);

  const acceptCall = useCallback(async () => {
    const session = callRef.current;
    const socket = socketRef.current;

    if (!session || session.status !== "incoming" || !socket) {
      return;
    }

    try {
      setError("");
      updateCallStatus("connecting");
      await prepareLocalMedia(session.mode);
      getPeerConnection(session.callId);
      socket.emit("call:accept", { callId: session.callId }, (ack: CallAck) => {
        if (!ack.ok) {
          setError(ack.message ?? "Nao foi possivel aceitar a chamada.");
          resetCall();
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permissao de camera ou microfone negada");
      socket.emit("call:reject", { callId: session.callId });
      resetCall();
    }
  }, [getPeerConnection, prepareLocalMedia, resetCall, updateCallStatus]);

  const rejectCall = useCallback(() => {
    const session = callRef.current;

    if (!session) {
      return;
    }

    const eventName = session.status === "incoming" ? "call:reject" : "call:end";
    socketRef.current?.emit(eventName, { callId: session.callId });
    resetCall();
  }, [resetCall]);

  const endCall = useCallback(() => {
    const session = callRef.current;

    if (session) {
      socketRef.current?.emit("call:end", { callId: session.callId });
    }

    resetCall();
  }, [resetCall]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const nextCameraOff = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setCameraOff(nextCameraOff);
  }, [cameraOff]);

  const value = useMemo<CallContextValue>(
    () => ({
      call,
      localStream,
      remoteStream,
      muted,
      cameraOff,
      error,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      clearCallError: () => setError("")
    }),
    [
      acceptCall,
      call,
      cameraOff,
      endCall,
      error,
      localStream,
      muted,
      rejectCall,
      remoteStream,
      startCall,
      toggleCamera,
      toggleMute
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCalls() {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error("useCalls precisa ser usado dentro de CallProvider");
  }

  return context;
}
