import {
  LocalDeviceIdentity,
  DeviceType,
  DeviceConnectionStatus,
  getLocalDeviceIdentity,
} from './deviceTransfer';
import {
  LibraryChangeEntry,
  applyRecentChanges,
} from './recentChanges';

export interface TrustedDeviceRecord {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  pairedAt: number;
  lastSeen: number;
  status: DeviceConnectionStatus;
  trusted: boolean;
}

export interface SignalingPeer {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  lastSeen: number;
  ip?: string;
}

export interface WebRTCSignalMessage {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  signalType: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  createdAt: number;
}

export interface WebRTCDataMessage {
  type: 'PING' | 'PONG' | 'TRANSFER_PROPOSAL' | 'TRANSFER_RESPONSE' | 'TRANSFER_ACK';
  transferId?: string;
  sourceDevice?: LocalDeviceIdentity;
  targetDeviceId?: string;
  payload?: any;
  summary?: any;
  action?: 'accept' | 'decline';
  message?: string;
  timestamp?: number;
}

const STORAGE_KEYS = {
  TRUSTED_DEVICES: 'ehsaan_trusted_devices_v4',
};

// Standard public STUN servers for WebRTC NAT traversal
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class WebRTCSyncManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private heartbeatIntervals = new Map<string, any>();
  private lastHeartbeatPong = new Map<string, number>();

  private trustedDevices = new Map<string, TrustedDeviceRecord>();
  private activeSignalingPeers = new Map<string, SignalingPeer>();

  private pollSignalingInterval: any = null;
  private autoReconnectInterval: any = null;

  private onPeersUpdatedCallbacks = new Set<(discovered: SignalingPeer[], trusted: TrustedDeviceRecord[]) => void>();
  private onIncomingTransferCallbacks = new Set<(event: { transferId: string; sourceDevice: LocalDeviceIdentity; payload: any; summary: any; timestamp: number }) => void>();
  private pendingTransferResolvers = new Map<string, (response: { success: boolean; message: string }) => void>();

  constructor() {
    this.loadTrustedDevices();
  }

  // ---------------------------------------------------------------------------
  // 1. Storage & Trusted Devices Persistence
  // ---------------------------------------------------------------------------

  public loadTrustedDevices(): TrustedDeviceRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRUSTED_DEVICES);
      if (raw) {
        const parsed: TrustedDeviceRecord[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.trustedDevices.clear();
          for (const d of parsed) {
            this.trustedDevices.set(d.deviceId, {
              ...d,
              status: 'OFFLINE', // Start as offline until WebRTC DataChannel opens
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load trusted devices:', err);
    }
    return Array.from(this.trustedDevices.values());
  }

  public saveTrustedDevices(): void {
    try {
      const list = Array.from(this.trustedDevices.values()).map(d => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        pairedAt: d.pairedAt,
        lastSeen: d.lastSeen,
        trusted: true,
      }));
      localStorage.setItem(STORAGE_KEYS.TRUSTED_DEVICES, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to save trusted devices:', err);
    }
  }

  public addTrustedDevice(device: { deviceId: string; deviceName: string; deviceType: DeviceType }): TrustedDeviceRecord {
    const existing = this.trustedDevices.get(device.deviceId);
    const now = Date.now();

    const record: TrustedDeviceRecord = {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      pairedAt: existing ? existing.pairedAt : now,
      lastSeen: now,
      status: this.isDataChannelOpen(device.deviceId) ? 'CONNECTED' : 'OFFLINE',
      trusted: true,
    };

    this.trustedDevices.set(device.deviceId, record);
    this.saveTrustedDevices();
    this.notifyPeersUpdated();
    return record;
  }

  public forgetTrustedDevice(deviceId: string): void {
    this.trustedDevices.delete(deviceId);
    this.saveTrustedDevices();
    this.closePeerConnection(deviceId);
    this.notifyPeersUpdated();
  }

  public isDataChannelOpen(deviceId: string): boolean {
    const dc = this.dataChannels.get(deviceId);
    return dc !== undefined && dc.readyState === 'open';
  }

  // ---------------------------------------------------------------------------
  // 2. Signaling Engine (WebRTC Offer/Answer/ICE Exchange)
  // ---------------------------------------------------------------------------

  public startSignaling() {
    this.announcePresence();

    if (!this.pollSignalingInterval) {
      this.pollSignalingInterval = setInterval(() => {
        this.announcePresence();
        this.pollSignalingMessages();
        this.fetchSignalingPeers();
      }, 3000);
    }

    if (!this.autoReconnectInterval) {
      this.autoReconnectInterval = setInterval(() => {
        this.checkAutoReconnect();
      }, 5000);
    }
  }

  public stopSignaling() {
    if (this.pollSignalingInterval) {
      clearInterval(this.pollSignalingInterval);
      this.pollSignalingInterval = null;
    }
    if (this.autoReconnectInterval) {
      clearInterval(this.autoReconnectInterval);
      this.autoReconnectInterval = null;
    }
  }

  private async announcePresence() {
    const myIdentity = getLocalDeviceIdentity();
    try {
      await fetch('/api/signaling/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(myIdentity),
      });
    } catch {}
  }

  private async fetchSignalingPeers() {
    const myIdentity = getLocalDeviceIdentity();
    try {
      const res = await fetch(`/api/signaling/peers?deviceId=${encodeURIComponent(myIdentity.deviceId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.peers)) {
          this.activeSignalingPeers.clear();
          for (const p of data.peers) {
            this.activeSignalingPeers.set(p.deviceId, p);
          }
          this.notifyPeersUpdated();
        }
      }
    } catch {}
  }

  private async sendSignal(toDeviceId: string, signalType: 'offer' | 'answer' | 'ice-candidate', payload: any) {
    const myIdentity = getLocalDeviceIdentity();
    try {
      await fetch('/api/signaling/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDeviceId: myIdentity.deviceId,
          toDeviceId,
          signalType,
          payload,
        }),
      });
    } catch (err) {
      console.error('Failed to send WebRTC signal:', err);
    }
  }

  private async pollSignalingMessages() {
    const myIdentity = getLocalDeviceIdentity();
    try {
      const res = await fetch(`/api/signaling/messages?deviceId=${encodeURIComponent(myIdentity.deviceId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            this.handleIncomingSignal(msg);
          }
        }
      }
    } catch {}
  }

  private async handleIncomingSignal(msg: WebRTCSignalMessage) {
    const fromDeviceId = msg.fromDeviceId;

    if (msg.signalType === 'offer') {
      let pc = this.peerConnections.get(fromDeviceId);
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        pc = this.createPeerConnection(fromDeviceId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.sendSignal(fromDeviceId, 'answer', answer);
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    } else if (msg.signalType === 'answer') {
      const pc = this.peerConnections.get(fromDeviceId);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        } catch (err) {
          console.error('Error handling WebRTC answer:', err);
        }
      }
    } else if (msg.signalType === 'ice-candidate') {
      const pc = this.peerConnections.get(fromDeviceId);
      if (pc && msg.payload) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. WebRTC Peer Connection & DataChannel Setup
  // ---------------------------------------------------------------------------

  public async connectToPeer(targetDeviceId: string): Promise<boolean> {
    if (this.isDataChannelOpen(targetDeviceId)) {
      return true;
    }

    const pc = this.createPeerConnection(targetDeviceId);

    try {
      const dataChannel = pc.createDataChannel('ehsaan_play_sync', {
        ordered: true,
      });
      this.setupDataChannelEvents(targetDeviceId, dataChannel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.sendSignal(targetDeviceId, 'offer', offer);

      return true;
    } catch (err) {
      console.error(`Failed to initiate WebRTC connection to ${targetDeviceId}:`, err);
      return false;
    }
  }

  private createPeerConnection(targetDeviceId: string): RTCPeerConnection {
    this.closePeerConnection(targetDeviceId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(targetDeviceId, pc);

    pc.onicecandidate = event => {
      if (event.candidate) {
        this.sendSignal(targetDeviceId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.ondatachannel = event => {
      this.setupDataChannelEvents(targetDeviceId, event.channel);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.handleDataChannelClosed(targetDeviceId);
      }
    };

    return pc;
  }

  private setupDataChannelEvents(targetDeviceId: string, channel: RTCDataChannel) {
    this.dataChannels.set(targetDeviceId, channel);

    channel.onopen = () => {
      this.updateDeviceStatus(targetDeviceId, 'CONNECTED');
      this.startHeartbeat(targetDeviceId);
    };

    channel.onclose = () => {
      this.handleDataChannelClosed(targetDeviceId);
    };

    channel.onerror = () => {
      this.handleDataChannelClosed(targetDeviceId);
    };

    channel.onmessage = event => {
      try {
        const msg: WebRTCDataMessage = JSON.parse(event.data);
        this.handleIncomingDataMessage(targetDeviceId, msg);
      } catch (err) {
        console.error('Error parsing DataChannel message:', err);
      }
    };
  }

  private handleDataChannelClosed(targetDeviceId: string) {
    this.stopHeartbeat(targetDeviceId);
    this.dataChannels.delete(targetDeviceId);
    this.peerConnections.delete(targetDeviceId);

    this.updateDeviceStatus(targetDeviceId, 'OFFLINE');
  }

  private closePeerConnection(targetDeviceId: string) {
    this.stopHeartbeat(targetDeviceId);

    const dc = this.dataChannels.get(targetDeviceId);
    if (dc) {
      try { dc.close(); } catch {}
      this.dataChannels.delete(targetDeviceId);
    }

    const pc = this.peerConnections.get(targetDeviceId);
    if (pc) {
      try { pc.close(); } catch {}
      this.peerConnections.delete(targetDeviceId);
    }

    this.updateDeviceStatus(targetDeviceId, 'OFFLINE');
  }

  private updateDeviceStatus(deviceId: string, status: DeviceConnectionStatus) {
    const trusted = this.trustedDevices.get(deviceId);
    if (trusted) {
      trusted.status = status;
      trusted.lastSeen = Date.now();
      this.trustedDevices.set(deviceId, trusted);
      this.notifyPeersUpdated();
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Heartbeat Ping / Pong over DataChannel
  // ---------------------------------------------------------------------------

  private startHeartbeat(targetDeviceId: string) {
    this.stopHeartbeat(targetDeviceId);
    this.lastHeartbeatPong.set(targetDeviceId, Date.now());

    const interval = setInterval(() => {
      const dc = this.dataChannels.get(targetDeviceId);
      if (dc && dc.readyState === 'open') {
        const lastPong = this.lastHeartbeatPong.get(targetDeviceId) || 0;
        if (Date.now() - lastPong > 20000) {
          // Heartbeat failed
          this.handleDataChannelClosed(targetDeviceId);
          return;
        }

        try {
          dc.send(JSON.stringify({ type: 'PING' }));
        } catch {}
      } else {
        this.stopHeartbeat(targetDeviceId);
      }
    }, 5000);

    this.heartbeatIntervals.set(targetDeviceId, interval);
  }

  private stopHeartbeat(targetDeviceId: string) {
    const interval = this.heartbeatIntervals.get(targetDeviceId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(targetDeviceId);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. DataChannel Data Message Handler
  // ---------------------------------------------------------------------------

  private handleIncomingDataMessage(targetDeviceId: string, msg: WebRTCDataMessage) {
    if (msg.type === 'PING') {
      const dc = this.dataChannels.get(targetDeviceId);
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'PONG' }));
      }
    } else if (msg.type === 'PONG') {
      this.lastHeartbeatPong.set(targetDeviceId, Date.now());
      this.updateDeviceStatus(targetDeviceId, 'CONNECTED');
    } else if (msg.type === 'TRANSFER_PROPOSAL') {
      if (msg.transferId && msg.sourceDevice && msg.payload) {
        // Auto-add or update trusted record for sender
        this.addTrustedDevice({
          deviceId: msg.sourceDevice.deviceId,
          deviceName: msg.sourceDevice.deviceName,
          deviceType: msg.sourceDevice.deviceType,
        });

        // Notify incoming transfer listeners
        for (const cb of this.onIncomingTransferCallbacks) {
          try {
            cb({
              transferId: msg.transferId,
              sourceDevice: msg.sourceDevice,
              payload: msg.payload,
              summary: msg.summary,
              timestamp: msg.timestamp || Date.now(),
            });
          } catch (err) {
            console.error('Error in incoming transfer listener:', err);
          }
        }
      }
    } else if (msg.type === 'TRANSFER_RESPONSE') {
      if (msg.transferId) {
        const resolver = this.pendingTransferResolvers.get(msg.transferId);
        if (resolver) {
          this.pendingTransferResolvers.delete(msg.transferId);
          if (msg.action === 'accept') {
            resolver({ success: true, message: msg.message || 'Transfer accepted and applied.' });
          } else {
            resolver({ success: false, message: 'Transfer was declined by remote device.' });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Direct Delta Change Transfer over WebRTC DataChannel
  // ---------------------------------------------------------------------------

  public async sendDeltaOverDataChannel(
    targetDeviceId: string,
    payload: any,
    summary: any
  ): Promise<{ success: boolean; message: string }> {
    let dc = this.dataChannels.get(targetDeviceId);

    if (!dc || dc.readyState !== 'open') {
      // Attempt WebRTC connection first
      const connected = await this.connectToPeer(targetDeviceId);
      if (!connected) {
        return { success: false, message: `Could not establish WebRTC connection to device (${targetDeviceId}).` };
      }

      // Wait up to 8s for DataChannel to open
      const startTime = Date.now();
      while (Date.now() - startTime < 8000) {
        await new Promise(r => setTimeout(r, 400));
        dc = this.dataChannels.get(targetDeviceId);
        if (dc && dc.readyState === 'open') break;
      }

      if (!dc || dc.readyState !== 'open') {
        return { success: false, message: `WebRTC DataChannel to ${targetDeviceId} failed to open.` };
      }
    }

    const transferId = `tr_webrtc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sourceDevice = getLocalDeviceIdentity();

    const proposalMsg: WebRTCDataMessage = {
      type: 'TRANSFER_PROPOSAL',
      transferId,
      sourceDevice,
      targetDeviceId,
      payload,
      summary,
      timestamp: Date.now(),
    };

    return new Promise<{ success: boolean; message: string }>(resolve => {
      this.pendingTransferResolvers.set(transferId, resolve);

      try {
        dc!.send(JSON.stringify(proposalMsg));
      } catch (err) {
        this.pendingTransferResolvers.delete(transferId);
        resolve({ success: false, message: 'Failed to send data over WebRTC DataChannel.' });
        return;
      }

      // Timeout after 45s
      setTimeout(() => {
        if (this.pendingTransferResolvers.has(transferId)) {
          this.pendingTransferResolvers.delete(transferId);
          resolve({ success: false, message: 'Transfer timed out waiting for remote device confirmation.' });
        }
      }, 45000);
    });
  }

  public respondToIncomingTransfer(targetDeviceId: string, transferId: string, action: 'accept' | 'decline') {
    const dc = this.dataChannels.get(targetDeviceId);
    if (dc && dc.readyState === 'open') {
      const responseMsg: WebRTCDataMessage = {
        type: 'TRANSFER_RESPONSE',
        transferId,
        action,
        message: action === 'accept' ? 'Transfer accepted and merged.' : 'Transfer declined.',
      };
      try {
        dc.send(JSON.stringify(responseMsg));
      } catch {}
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Auto Reconnection Loop
  // ---------------------------------------------------------------------------

  private checkAutoReconnect() {
    const trustedList = Array.from(this.trustedDevices.values());
    for (const device of trustedList) {
      if (!this.isDataChannelOpen(device.deviceId)) {
        // If peer is seen online in signaling registry
        const peer = this.activeSignalingPeers.get(device.deviceId);
        if (peer && Date.now() - peer.lastSeen <= 25000) {
          this.connectToPeer(device.deviceId);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Event Listeners
  // ---------------------------------------------------------------------------

  public subscribePeersUpdated(cb: (discovered: SignalingPeer[], trusted: TrustedDeviceRecord[]) => void): () => void {
    this.onPeersUpdatedCallbacks.add(cb);
    this.notifyPeersUpdated();
    return () => {
      this.onPeersUpdatedCallbacks.delete(cb);
    };
  }

  public subscribeIncomingTransfers(
    cb: (event: { transferId: string; sourceDevice: LocalDeviceIdentity; payload: any; summary: any; timestamp: number }) => void
  ): () => void {
    this.onIncomingTransferCallbacks.add(cb);
    return () => {
      this.onIncomingTransferCallbacks.delete(cb);
    };
  }

  private notifyPeersUpdated() {
    const trustedList = Array.from(this.trustedDevices.values()).map(d => ({
      ...d,
      status: this.isDataChannelOpen(d.deviceId) ? ('CONNECTED' as DeviceConnectionStatus) : ('OFFLINE' as DeviceConnectionStatus),
    }));

    const trustedIds = new Set(trustedList.map(t => t.deviceId));
    const discoveredList: SignalingPeer[] = [];

    for (const p of this.activeSignalingPeers.values()) {
      if (!trustedIds.has(p.deviceId) && Date.now() - p.lastSeen <= 25000) {
        discoveredList.push(p);
      }
    }

    for (const cb of this.onPeersUpdatedCallbacks) {
      try {
        cb(discoveredList, trustedList);
      } catch (err) {
        console.error('Error notifying peers updated:', err);
      }
    }
  }
}

export const webrtcSyncManager = new WebRTCSyncManager();
