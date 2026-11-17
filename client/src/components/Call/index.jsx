// src/components/Call/CallPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import socket from "../../services/socket";

/**
 * CallPanel
 *
 * Props:
 *  - roomId: string (required)  -> use ticket ID so call maps to ticket
 *  - onClose: function()        -> called when user ends/closes the panel
 *
 * Usage:
 *  <CallPanel roomId={ticketId} onClose={() => setCallOpen(false)} />
 */

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" } // add TURN here if you setup coturn
];

export default function CallPanel({ roomId, onClose }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [calling, setCalling] = useState(false);
  const [statusText, setStatusText] = useState("Idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Socket handlers
    function onJoined({ roomId: r, isInitiator: initiatorFlag }) {
      console.log("joined", r, initiatorFlag);
      setJoined(true);
      setIsInitiator(initiatorFlag);
      setStatusText("Ready");
      if (initiatorFlag) {
        // initiator may create offer after local stream ready
      }
    }

    async function onSignal({ from, data }) {
      try {
        // ensure PC exists
        if (!pcRef.current) {
          await createPeerConnection();
        }

        if (data.type === "offer") {
          console.log("Received offer");
          setStatusText("Incoming offer — answering...");
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit("signal", { roomId, data: pcRef.current.localDescription });
          setCalling(true);
        } else if (data.type === "answer") {
          console.log("Received answer");
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.candidate) {
          // ICE candidate
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
          } catch (e) {
            console.warn("Failed to add ICE candidate", e);
          }
        }
      } catch (e) {
        console.error("Error handling signal", e);
      }
    }

    function onPeerJoined(payload) {
      console.log("peer joined", payload);
      setStatusText("Peer joined");
    }

    function onPeerLeft(payload) {
      console.log("peer left", payload);
      setStatusText("Peer left");
      stopCall();
    }

    socket.on("joined", onJoined);
    socket.on("signal", onSignal);
    socket.on("peer-joined", onPeerJoined);
    socket.on("peer-left", onPeerLeft);

    // join the room right away
    socket.emit("join", roomId);
    setStatusText("Joining...");

    return () => {
      socket.off("joined", onJoined);
      socket.off("signal", onSignal);
      socket.off("peer-joined", onPeerJoined);
      socket.off("peer-left", onPeerLeft);
      // leave room
      try { socket.emit("leave", roomId); } catch (e) {}
      cleanupLocal();
      closePeerConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Timer
  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setCallSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [connected]);

  async function startLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = s;
      // optionally set a hidden local audio to monitor (muted to avoid echo)
      return s;
    } catch (err) {
      console.error("getUserMedia failed", err);
      throw err;
    }
  }

  async function createPeerConnection() {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // create remote stream and attach to audio element
    const remoteStream = new MediaStream();
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    } else {
      // create an audio element if not present
      const a = document.createElement("audio");
      a.autoplay = true;
      a.id = `remote-audio-${roomId}`;
      document.body.appendChild(a);
      remoteAudioRef.current = a;
      a.srcObject = remoteStream;
    }

    pc.ontrack = (evt) => {
      // add incoming tracks to remote stream
      evt.streams?.[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", { roomId, data: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log("pc state", s);
      setStatusText(s);
      if (s === "connected" || s === "completed") {
        setConnected(true);
      } else if (s === "disconnected" || s === "failed" || s === "closed") {
        setConnected(false);
      }
    };

    // add local tracks
    const s = await startLocalStream();
    s.getTracks().forEach((t) => pc.addTrack(t, s));

    return pc;
  }

  async function startCall() {
    try {
      setStatusText("Starting call...");
      await createPeerConnection();

      // If we are already joined as initiator, create offer:
      if (isInitiator) {
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit("signal", { roomId, data: pcRef.current.localDescription });
        setCalling(true);
        setStatusText("Offer sent, waiting for answer...");
      } else {
        setStatusText("Waiting for remote to offer...");
      }
    } catch (e) {
      console.error("startCall error", e);
      setStatusText("Call failed: " + (e.message || e));
      stopCall();
    }
  }

  async function answerCall() {
    // This is handled automatically on receiving an offer in the 'signal' handler.
    // If you want an explicit "Answer" button, you can call createPeerConnection() here.
    try {
      await createPeerConnection();
      setStatusText("Answered");
    } catch (e) {
      console.error("answer error", e);
    }
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  }

  function closePeerConnection() {
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => {
          try { if (s.track) s.track.stop(); } catch {}
        });
      } catch {}
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    setConnected(false);
    setCalling(false);
  }

  function cleanupLocal() {
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;
    }
    // remove any dynamically added audio element
    try {
      const el = document.getElementById(`remote-audio-${roomId}`);
      if (el) el.remove();
    } catch {}
  }

  function stopCall() {
    try { socket.emit("leave", roomId); } catch {}
    cleanupLocal();
    closePeerConnection();
    if (onClose) onClose();
  }

  // simple helpers for UI
  function formatDuration(sec) {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Room</div>
          <div className="font-semibold">{roomId}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            Status: <span className="font-medium">{statusText}</span>
          </div>

          <div className="text-xs text-gray-500">
            {connected ? <span>Duration: {formatDuration(callSeconds)}</span> : null}
          </div>

          <button
            onClick={toggleMute}
            className={`px-3 py-1 rounded text-sm ${muted ? "bg-yellow-200" : "bg-gray-200"}`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>

          {!calling && (
            <button
              onClick={startCall}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Call
            </button>
          )}

          {calling && (
            <button
              onClick={stopCall}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Hang Up
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded shadow-sm">
        <p className="text-sm text-gray-700">Use this panel to conduct a 1:1 voice call for this ticket.</p>

        <div className="mt-3 flex items-center gap-3">
          <div>
            <div className="text-xs text-gray-500">Local</div>
            <div className="w-36 h-10 bg-white border rounded flex items-center justify-center text-xs text-gray-600">
              {localStreamRef.current ? "Microphone active" : "No microphone"}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Remote</div>
            <div className="w-36 h-10 bg-white border rounded flex items-center justify-center text-xs text-gray-600">
              {connected ? "Connected" : "No remote audio"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}