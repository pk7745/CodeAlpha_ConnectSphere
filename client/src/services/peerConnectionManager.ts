export type ConnectionQuality = 'Excellent' | 'Good' | 'Poor' | 'Reconnecting' | 'Disconnected' | 'Unknown';

export interface PeerCallbacks {
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onIceCandidate: (userId: string, candidate: RTCIceCandidate) => void;
  onQualityChange: (userId: string, quality: ConnectionQuality) => void;
  onConnectionStateChange?: (userId: string, state: RTCPeerConnectionState) => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class PeerConnectionManager {
  private peers = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private videoSenders = new Map<string, RTCRtpSender>();
  private statsIntervals = new Map<string, any>();
  private lastStats = new Map<string, { packetsLost: number; packetsReceived: number }>();
  private localStream: MediaStream | null = null;
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (stream) {
      // Synchronize local tracks across all existing peer connections
      for (const [userId, peer] of this.peers.entries()) {
        const senders = peer.getSenders();
        stream.getTracks().forEach((track) => {
          const existingSender = senders.find(
            (s) => s.track?.kind === track.kind || (!s.track && (s as any).kind === track.kind)
          );
          if (existingSender) {
            existingSender.replaceTrack(track).catch(() => {});
            if (track.kind === 'video') {
              this.videoSenders.set(userId, existingSender);
            }
          } else {
            const sender = peer.addTrack(track, stream);
            if (track.kind === 'video') {
              this.videoSenders.set(userId, sender);
            }
          }
        });
      }
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getPeer(userId: string): RTCPeerConnection | undefined {
    return this.peers.get(userId);
  }

  public getRemoteStream(userId: string): MediaStream | undefined {
    return this.remoteStreams.get(userId);
  }

  public getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  public createPeerConnection(
    userId: string,
    callbacks: PeerCallbacks,
    preservePendingCandidates: boolean = false
  ): RTCPeerConnection {
    // Close existing connection if present (preserves queued candidates if an offer was received)
    this.closePeer(userId, preservePendingCandidates);

    const peer = new RTCPeerConnection(ICE_CONFIG);
    this.peers.set(userId, peer);

    // Add local tracks to this peer if localStream is available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        const sender = peer.addTrack(track, this.localStream!);
        if (track.kind === 'video') {
          this.videoSenders.set(userId, sender);
        }
      });
    } else {
      // If localStream is still initializing, reserve transceivers so SDP negotiation reserves m-lines
      peer.addTransceiver('audio', { direction: 'sendrecv' });
      const videoTransceiver = peer.addTransceiver('video', { direction: 'sendrecv' });
      this.videoSenders.set(userId, videoTransceiver.sender);
    }

    // Handle incoming remote media tracks
    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStreams.set(userId, stream);
      callbacks.onRemoteStream(userId, stream);
    };

    // Handle local ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(userId, event.candidate);
      }
    };

    // Connection state monitor
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (callbacks.onConnectionStateChange) {
        callbacks.onConnectionStateChange(userId, state);
      }

      if (state === 'connected') {
        callbacks.onQualityChange(userId, 'Good');
      } else if (state === 'connecting') {
        callbacks.onQualityChange(userId, 'Reconnecting');
      } else if (state === 'disconnected' || state === 'failed') {
        callbacks.onQualityChange(userId, 'Disconnected');
      }
    };

    // Start stats monitoring
    this.startStatsMonitoring(userId, peer, callbacks.onQualityChange);

    return peer;
  }

  public async createOffer(
    userId: string,
    callbacks: PeerCallbacks
  ): Promise<RTCSessionDescriptionInit> {
    const existing = this.peers.get(userId);
    if (existing && existing.connectionState === 'connected' && existing.signalingState === 'stable') {
      // Connection already active and stable; create renegotiation offer
      const offer = await existing.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await existing.setLocalDescription(offer);
      return offer;
    }

    const peer = this.createPeerConnection(userId, callbacks, false);
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(
    userId: string,
    sdp: RTCSessionDescriptionInit,
    callbacks: PeerCallbacks
  ): Promise<RTCSessionDescriptionInit> {
    // Preserve any early ICE candidates that arrived before the offer was processed
    const peer = this.createPeerConnection(userId, callbacks, true);
    await peer.setRemoteDescription(new RTCSessionDescription(sdp));

    // Process queued candidates
    const queued = this.pendingCandidates.get(userId) || [];
    for (const cand of queued) {
      await peer.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
    }
    this.pendingCandidates.delete(userId);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(userId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) return;

    if (peer.signalingState !== 'stable') {
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process queued candidates
      const queued = this.pendingCandidates.get(userId) || [];
      for (const cand of queued) {
        await peer.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      this.pendingCandidates.delete(userId);
    }
  }

  public async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(userId);
    if (peer && peer.remoteDescription && peer.remoteDescription.type) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      // Queue candidate until remote description is set
      const queued = this.pendingCandidates.get(userId) || [];
      queued.push(candidate);
      this.pendingCandidates.set(userId, queued);
    }
  }

  public async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<void> {
    for (const [userId, peer] of this.peers.entries()) {
      try {
        let sender = this.videoSenders.get(userId);
        if (!sender) {
          sender = peer.getSenders().find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
          if (sender) this.videoSenders.set(userId, sender);
        }
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      } catch (err) {
        console.warn(`[PeerConnectionManager] Failed to replace video track for ${userId}:`, err);
      }
    }
  }

  private startStatsMonitoring(
    userId: string,
    peer: RTCPeerConnection,
    onQualityChange: (userId: string, quality: ConnectionQuality) => void
  ) {
    const interval = setInterval(async () => {
      if (peer.connectionState === 'closed') {
        clearInterval(interval);
        return;
      }

      try {
        const stats = await peer.getStats();
        let rtt: number | undefined;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              rtt = report.currentRoundTripTime * 1000; // ms
            }
          }
          if (report.type === 'inbound-rtp') {
            if (report.packetsLost !== undefined) packetsLost += report.packetsLost;
            if (report.packetsReceived !== undefined) packetsReceived += report.packetsReceived;
          }
        });

        if (peer.connectionState !== 'connected') {
          onQualityChange(userId, peer.connectionState === 'connecting' ? 'Reconnecting' : 'Disconnected');
          return;
        }

        if (rtt === undefined) {
          onQualityChange(userId, 'Good');
          return;
        }

        // Calculate delta packet loss over the sampling window (avoids cumulative distortion)
        const prev = this.lastStats.get(userId);
        let deltaLost = packetsLost;
        let deltaReceived = packetsReceived;
        if (prev) {
          deltaLost = Math.max(0, packetsLost - prev.packetsLost);
          deltaReceived = Math.max(0, packetsReceived - prev.packetsReceived);
        }
        this.lastStats.set(userId, { packetsLost, packetsReceived });

        const deltaTotal = deltaLost + deltaReceived;
        const lossRate = deltaTotal > 0 ? (deltaLost / deltaTotal) * 100 : 0;

        if (rtt < 120 && lossRate < 2) {
          onQualityChange(userId, 'Excellent');
        } else if (rtt < 300 && lossRate < 6) {
          onQualityChange(userId, 'Good');
        } else {
          onQualityChange(userId, 'Poor');
        }
      } catch {
        // Safe fallback
      }
    }, 3000);

    this.statsIntervals.set(userId, interval);
  }

  public closePeer(userId: string, preservePendingCandidates: boolean = false) {
    const interval = this.statsIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.statsIntervals.delete(userId);
    }

    const peer = this.peers.get(userId);
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
      this.peers.delete(userId);
    }

    this.videoSenders.delete(userId);
    this.remoteStreams.delete(userId);
    this.lastStats.delete(userId);

    if (!preservePendingCandidates) {
      this.pendingCandidates.delete(userId);
    }
  }

  public closeAll() {
    for (const userId of Array.from(this.peers.keys())) {
      this.closePeer(userId, false);
    }
    this.localStream = null;
    this.remoteStreams.clear();
    this.videoSenders.clear();
    this.lastStats.clear();
    this.pendingCandidates.clear();
  }
}

export const peerConnectionManager = new PeerConnectionManager();