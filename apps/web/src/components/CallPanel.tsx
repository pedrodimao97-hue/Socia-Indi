import { Mic, MicOff, Phone, PhoneCall, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCalls } from "../calls/CallContext";
import { Avatar } from "./Avatar";

function StreamVideo({
  stream,
  muted,
  className
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return <div className={`${className} call-video-placeholder`} />;
  }

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />;
}

export function CallPanel() {
  const {
    call,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    error,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    clearCallError
  } = useCalls();

  if (!call && !error) {
    return null;
  }

  if (!call && error) {
    return (
      <aside className="call-toast" role="status">
        <p>{error}</p>
        <button className="icon-button" type="button" onClick={clearCallError} title="Fechar alerta">
          <X size={17} />
        </button>
      </aside>
    );
  }

  if (!call) {
    return null;
  }

  const isVideoCall = call.mode === "video";
  const isIncoming = call.status === "incoming";
  const isOutgoing = call.status === "outgoing";
  const statusText = isIncoming
    ? "Chamada recebida"
    : isOutgoing
      ? "Chamando..."
      : call.status === "connecting"
        ? "Conectando..."
        : "Em chamada";

  return (
    <aside className={`call-panel ${isVideoCall ? "call-panel-video" : ""}`} aria-live="polite">
      <header className="call-panel-header">
        <div className="call-peer">
          <Avatar user={call.peer} />
          <div>
            <strong>{call.peer.name}</strong>
            <span>{statusText} - {isVideoCall ? "video" : "audio"}</span>
          </div>
        </div>
      </header>

      {isVideoCall ? (
        <div className="call-video-stage">
          <StreamVideo stream={remoteStream} className="remote-video" />
          <StreamVideo stream={localStream} muted className="local-video" />
          {!remoteStream ? (
            <div className="video-waiting">
              <Avatar user={call.peer} size="lg" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="audio-call-stage">
          <Avatar user={call.peer} size="lg" />
          <strong>{call.peer.name}</strong>
          <span>@{call.peer.username}</span>
        </div>
      )}

      {error ? <p className="call-error">{error}</p> : null}

      <div className="call-controls">
        {isIncoming ? (
          <>
            <button className="call-control accept" type="button" onClick={acceptCall} title="Atender">
              {isVideoCall ? <Video size={20} /> : <PhoneCall size={20} />}
            </button>
            <button className="call-control end" type="button" onClick={rejectCall} title="Recusar">
              <PhoneOff size={20} />
            </button>
          </>
        ) : (
          <>
            <button className="call-control" type="button" onClick={toggleMute} title={muted ? "Ativar microfone" : "Mutar"}>
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            {isVideoCall ? (
              <button
                className="call-control"
                type="button"
                onClick={toggleCamera}
                title={cameraOff ? "Ativar camera" : "Desativar camera"}
              >
                {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            ) : null}
            <button className="call-control end" type="button" onClick={endCall} title="Encerrar">
              {isOutgoing ? <PhoneOff size={20} /> : <Phone size={20} />}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
