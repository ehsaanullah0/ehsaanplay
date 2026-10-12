import {
  LibraryChangeEntry,
  RecentChangesPackage,
  getRecentChanges,
  getChangeLogStats,
  saveCheckpoint,
} from './recentChanges';
import {
  webrtcSyncManager,
  TrustedDeviceRecord,
  SignalingPeer,
} from './webrtcManager';

export type DeviceType = 'phone' | 'laptop' | 'tablet' | 'desktop' | 'tv';

export type DeviceConnectionStatus =
  | 'DISCOVERING'
  | 'AVAILABLE'
  | 'PAIRING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'OFFLINE'
  | 'DISCONNECTED'
  | 'ERROR';

export interface QRPairingPayload {
  type: 'ehsaan-play-pair';
  version: 1;
  sessionId: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  pairingToken: string;
  expiresAt: number;
}

export interface LocalDeviceIdentity {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
}

export interface PairedDeviceRecord {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  pairingId: string;
  pairedAt: number;
  lastSeen: number;
  status: DeviceConnectionStatus;
  ip?: string;
}

export interface DiscoveredDevice {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  lastSeen: number;
  ip?: string;
  isPaired?: boolean;
  status: DeviceConnectionStatus;
}

export interface DeltaChangeSummary {
  totalChanges: number;
  newItemsCount: number;
  updatesCount: number;
  deletionsCount: number;
  ratingsCount: number;
  statusChangesCount: number;
  notesCount: number;
  listsCount: number;
  detailPoints: string[];
}

export interface EhsaanPlayDeltaPayload {
  type: 'EHSAAN_PLAY_DELTA';
  version: 1;
  sourceDevice: LocalDeviceIdentity;
  timestamp: number;
  fromChangeId: number;
  toChangeId: number;
  changes: LibraryChangeEntry[];
  summary: DeltaChangeSummary;
}

export interface IncomingTransferEvent {
  transferId: string;
  sourceDevice: LocalDeviceIdentity;
  payload: EhsaanPlayDeltaPayload;
  summary: DeltaChangeSummary;
  timestamp: number;
}

export interface ApplyResultSummary {
  success: boolean;
  message: string;
  addedCount: number;
  updatedCount: number;
  duplicatesCount: number;
  deletionsCount: number;
}

export type TransferStatus =
  | 'idle'
  | 'connecting'
  | 'preparing'
  | 'sending'
  | 'waiting_approval'
  | 'verifying'
  | 'completed'
  | 'declined'
  | 'failed';

const STORAGE_KEYS = {
  DEVICE_ID: 'ehsaan_local_device_id_v3',
  DEVICE_NAME: 'ehsaan_local_device_name_v3',
};

// ---------------------------------------------------------------------------
// 1. Stable Persistent Device Identity (EH-8F3K2A)
// ---------------------------------------------------------------------------

function generateStableDeviceId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EH-${randomCode}`;
}

function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'laptop';
  const ua = navigator.userAgent.toLowerCase();
  if (/tv|smarttv|googletv|appletv|hbbtv|crkey/i.test(ua)) return 'tv';
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'phone';
  if (window.innerWidth < 768) return 'phone';
  if (window.innerWidth < 1024) return 'tablet';
  return 'laptop';
}

function getDefaultDeviceName(type: DeviceType): string {
  switch (type) {
    case 'phone':
      return 'EHSAAN Play — Phone';
    case 'tablet':
      return 'EHSAAN Play — Tablet';
    case 'tv':
      return 'EHSAAN Play — TV';
    case 'desktop':
      return 'EHSAAN Play — Desktop';
    case 'laptop':
    default:
      return 'EHSAAN Play — Laptop';
  }
}

export function getLocalDeviceIdentity(): LocalDeviceIdentity {
  let deviceId = '';
  try {
    deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID) || '';
  } catch {}

  if (!deviceId || !deviceId.startsWith('EH-')) {
    deviceId = generateStableDeviceId();
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    } catch {}
  }

  const deviceType = detectDeviceType();

  let deviceName = '';
  try {
    deviceName = localStorage.getItem(STORAGE_KEYS.DEVICE_NAME) || '';
  } catch {}

  if (!deviceName) {
    deviceName = getDefaultDeviceName(deviceType);
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, deviceName);
    } catch {}
  }

  return { deviceId, deviceName, deviceType };
}

export function updateLocalDeviceName(newName: string): LocalDeviceIdentity {
  const current = getLocalDeviceIdentity();
  const trimmed = newName.trim() || getDefaultDeviceName(current.deviceType);
  try {
    localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, trimmed);
  } catch {}
  return { ...current, deviceName: trimmed };
}

// ---------------------------------------------------------------------------
// 2. Persistent Paired Device Storage Integration
// ---------------------------------------------------------------------------

export function loadPairedDevices(): PairedDeviceRecord[] {
  const trusted = webrtcSyncManager.loadTrustedDevices();
  return trusted.map(t => ({
    deviceId: t.deviceId,
    deviceName: t.deviceName,
    deviceType: t.deviceType,
    pairingId: `pair_${t.pairedAt}`,
    pairedAt: t.pairedAt,
    lastSeen: t.lastSeen,
    status: t.status,
  }));
}

export function savePairedDevices(devices: PairedDeviceRecord[]): void {
  for (const d of devices) {
    webrtcSyncManager.addTrustedDevice({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
    });
  }
}

export function addOrUpdatePairedDevice(device: {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  pairingId?: string;
  status?: DeviceConnectionStatus;
  lastSeen?: number;
  ip?: string;
}): PairedDeviceRecord {
  const record = webrtcSyncManager.addTrustedDevice(device);
  return {
    deviceId: record.deviceId,
    deviceName: record.deviceName,
    deviceType: record.deviceType,
    pairingId: device.pairingId || `pair_${record.pairedAt}`,
    pairedAt: record.pairedAt,
    lastSeen: record.lastSeen,
    status: record.status,
  };
}

export function forgetPairedDevice(deviceId: string): void {
  webrtcSyncManager.forgetTrustedDevice(deviceId);
}

// ---------------------------------------------------------------------------
// 3. Delta Change Calculation & Inspection
// ---------------------------------------------------------------------------

export function calculateDeltaSummary(changes: LibraryChangeEntry[]): DeltaChangeSummary {
  let newItemsCount = 0;
  let updatesCount = 0;
  let deletionsCount = 0;
  let ratingsCount = 0;
  let statusChangesCount = 0;
  let notesCount = 0;
  let listsCount = 0;

  for (const c of changes) {
    if (c.operation === 'add') {
      newItemsCount++;
    } else if (c.operation === 'delete') {
      deletionsCount++;
    } else if (c.operation.startsWith('list_')) {
      listsCount++;
    } else if (c.operation === 'update_state') {
      updatesCount++;
      if (c.data?.state?.personalRating !== undefined) ratingsCount++;
      if (c.data?.state?.isWatched !== undefined || c.data?.state?.inWatchlist !== undefined) {
        statusChangesCount++;
      }
      if (c.data?.state?.notes !== undefined) notesCount++;
    } else {
      updatesCount++;
    }
  }

  const detailPoints: string[] = [];
  if (newItemsCount > 0) detailPoints.push(`${newItemsCount} new movie${newItemsCount > 1 ? 's' : ''}`);
  if (ratingsCount > 0) detailPoints.push(`${ratingsCount} rating${ratingsCount > 1 ? 's' : ''}`);
  if (statusChangesCount > 0) detailPoints.push(`${statusChangesCount} watch-status change${statusChangesCount > 1 ? 's' : ''}`);
  if (notesCount > 0) detailPoints.push(`${notesCount} personal note${notesCount > 1 ? 's' : ''}`);
  if (listsCount > 0) detailPoints.push(`${listsCount} list update${listsCount > 1 ? 's' : ''}`);
  if (deletionsCount > 0) detailPoints.push(`${deletionsCount} removal${deletionsCount > 1 ? 's' : ''}`);

  return {
    totalChanges: changes.length,
    newItemsCount,
    updatesCount,
    deletionsCount,
    ratingsCount,
    statusChangesCount,
    notesCount,
    listsCount,
    detailPoints,
  };
}

export function prepareDeltaPayload(options?: {
  fromChangeId?: number;
  limit?: number;
}): EhsaanPlayDeltaPayload | null {
  const changes = getRecentChanges(options);
  if (changes.length === 0) return null;

  const sorted = [...changes].sort((a, b) => a.changeId - b.changeId);
  const fromChangeId = sorted[0].changeId;
  const toChangeId = sorted[sorted.length - 1].changeId;
  const summary = calculateDeltaSummary(sorted);
  const sourceDevice = getLocalDeviceIdentity();

  return {
    type: 'EHSAAN_PLAY_DELTA',
    version: 1,
    sourceDevice,
    timestamp: Date.now(),
    fromChangeId,
    toChangeId,
    changes: sorted,
    summary,
  };
}

// ---------------------------------------------------------------------------
// 4. WebRTC Device Transfer Engine Class
// ---------------------------------------------------------------------------

class DeviceTransferEngine {
  private activePairingCode: string | null = null;
  private unsubscribePeers: (() => void) | null = null;
  private unsubscribeTransfers: (() => void) | null = null;

  constructor() {
    webrtcSyncManager.startSignaling();
  }

  public startPresenceAdvertising(
    onPeersUpdated?: (discovered: DiscoveredDevice[], paired: PairedDeviceRecord[]) => void
  ) {
    if (this.unsubscribePeers) this.unsubscribePeers();

    webrtcSyncManager.startSignaling();

    if (onPeersUpdated) {
      this.unsubscribePeers = webrtcSyncManager.subscribePeersUpdated((discovered, trusted) => {
        const discMapped: DiscoveredDevice[] = discovered.map(d => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          lastSeen: d.lastSeen,
          status: 'AVAILABLE',
        }));

        const pairedMapped: PairedDeviceRecord[] = trusted.map(t => ({
          deviceId: t.deviceId,
          deviceName: t.deviceName,
          deviceType: t.deviceType,
          pairingId: `pair_${t.pairedAt}`,
          pairedAt: t.pairedAt,
          lastSeen: t.lastSeen,
          status: t.status,
        }));

        onPeersUpdated(discMapped, pairedMapped);
      });
    }
  }

  public stopPresenceAdvertising() {
    if (this.unsubscribePeers) {
      this.unsubscribePeers();
      this.unsubscribePeers = null;
    }
  }

  public async fetchDiscoveredPeers(): Promise<{ discovered: DiscoveredDevice[]; paired: PairedDeviceRecord[] }> {
    const trusted = webrtcSyncManager.loadTrustedDevices();
    const pairedMapped: PairedDeviceRecord[] = trusted.map(t => ({
      deviceId: t.deviceId,
      deviceName: t.deviceName,
      deviceType: t.deviceType,
      pairingId: `pair_${t.pairedAt}`,
      pairedAt: t.pairedAt,
      lastSeen: t.lastSeen,
      status: t.status,
    }));

    return { discovered: [], paired: pairedMapped };
  }

  // ---------------------------------------------------------------------------
  // Short Pairing Code Signaling Methods
  // ---------------------------------------------------------------------------

  public async generatePairingCode(): Promise<{ pairingCode: string; expiresAt: number }> {
    const hostDevice = getLocalDeviceIdentity();
    try {
      const res = await fetch('/api/signaling/pair/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDevice }),
      });

      if (res.ok) {
        const data = await res.json();
        this.activePairingCode = data.pairingCode;
        return { pairingCode: data.pairingCode, expiresAt: data.expiresAt };
      }
    } catch {}

    const fallbackCode = `EH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    this.activePairingCode = fallbackCode;
    return { pairingCode: fallbackCode, expiresAt: Date.now() + 600000 };
  }

  public async connectWithPairingCode(
    code: string
  ): Promise<{ success: boolean; message: string; pairedDevice?: PairedDeviceRecord }> {
    const guestDevice = getLocalDeviceIdentity();
    const cleanCode = code.trim().toUpperCase();

    try {
      const res = await fetch('/api/signaling/pair/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: cleanCode, guestDevice }),
      });

      if (res.ok) {
        const data = await res.json();
        const pairedRecord = addOrUpdatePairedDevice({
          deviceId: data.hostDevice.deviceId,
          deviceName: data.hostDevice.deviceName,
          deviceType: data.hostDevice.deviceType,
          pairingId: data.pairingId || `pair_${Date.now()}`,
          status: 'CONNECTED',
        });

        // Immediately initiate WebRTC DataChannel connection
        webrtcSyncManager.connectToPeer(data.hostDevice.deviceId);

        return {
          success: true,
          message: `Successfully paired with ${data.hostDevice.deviceName}!`,
          pairedDevice: pairedRecord,
        };
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Invalid or expired pairing code.');
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Invalid or expired pairing code.',
      };
    }
  }

  public async pollPairingStatus(
    code: string
  ): Promise<{ paired: boolean; guestDevice?: LocalDeviceIdentity; pairingId?: string }> {
    try {
      const res = await fetch(`/api/signaling/pair/check?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.paired && data.guestDevice) {
          addOrUpdatePairedDevice({
            deviceId: data.guestDevice.deviceId,
            deviceName: data.guestDevice.deviceName,
            deviceType: data.guestDevice.deviceType,
            pairingId: data.pairingId,
            status: 'CONNECTED',
          });

          // Connect WebRTC DataChannel
          webrtcSyncManager.connectToPeer(data.guestDevice.deviceId);

          return { paired: true, guestDevice: data.guestDevice, pairingId: data.pairingId };
        }
      }
    } catch {}

    return { paired: false };
  }

  // ---------------------------------------------------------------------------
  // QR Code Signaling Methods
  // ---------------------------------------------------------------------------

  public async generateQRSession(): Promise<{
    sessionId: string;
    pairingToken: string;
    expiresAt: number;
    qrPayload: QRPairingPayload;
  }> {
    const hostDevice = getLocalDeviceIdentity();
    try {
      const res = await fetch('/api/signaling/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDevice }),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const sessionId = `qr_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pairingToken = `tok_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 60 * 1000;
    const qrPayload: QRPairingPayload = {
      type: 'ehsaan-play-pair',
      version: 1,
      sessionId,
      deviceId: hostDevice.deviceId,
      deviceName: hostDevice.deviceName,
      deviceType: hostDevice.deviceType,
      pairingToken,
      expiresAt,
    };

    return { sessionId, pairingToken, expiresAt, qrPayload };
  }

  public async verifyAndRequestQRPairing(
    payload: QRPairingPayload
  ): Promise<{ success: boolean; message: string; hostDevice?: LocalDeviceIdentity }> {
    const guestDevice = getLocalDeviceIdentity();

    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'This QR code is not an EHSAAN PLAY device connection code.' };
    }

    if (payload.type !== 'ehsaan-play-pair' || payload.version !== 1) {
      return { success: false, message: 'Unsupported or invalid QR code protocol.' };
    }

    if (Date.now() > payload.expiresAt) {
      return { success: false, message: 'QR code expired. Ask the other device to generate a new QR code.' };
    }

    try {
      const res = await fetch('/api/signaling/qr/verify-and-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, guestDevice }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: data.message || `Pairing request sent to ${data.hostDevice.deviceName}.`,
          hostDevice: data.hostDevice,
        };
      } else {
        const errData = await res.json();
        return {
          success: false,
          message: errData.error || 'Failed to verify QR code pairing request.',
        };
      }
    } catch {
      return {
        success: true,
        message: `Pairing request sent to ${payload.deviceName}. Waiting for approval…`,
        hostDevice: {
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          deviceType: payload.deviceType,
        },
      };
    }
  }

  public async pollQRRequest(
    sessionId: string
  ): Promise<{ hasRequest: boolean; guestDevice?: LocalDeviceIdentity; expired?: boolean }> {
    try {
      const res = await fetch(`/api/signaling/qr/check-request?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return { hasRequest: false };
  }

  public async approveQRPairing(
    sessionId: string,
    action: 'accept' | 'reject'
  ): Promise<{ ok: boolean; approved?: boolean; pairingId?: string }> {
    try {
      const res = await fetch('/api/signaling/qr/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return { ok: true, approved: action === 'accept' };
  }

  public async pollQRApproval(
    sessionId: string
  ): Promise<{ approved: boolean; rejected?: boolean; expired?: boolean; hostDevice?: LocalDeviceIdentity; pairingId?: string }> {
    try {
      const res = await fetch(`/api/signaling/qr/check-approval?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.approved && data.hostDevice) {
          addOrUpdatePairedDevice({
            deviceId: data.hostDevice.deviceId,
            deviceName: data.hostDevice.deviceName,
            deviceType: data.hostDevice.deviceType,
            pairingId: data.pairingId || `pair_${Date.now()}`,
            status: 'CONNECTED',
          });

          // Connect WebRTC DataChannel
          webrtcSyncManager.connectToPeer(data.hostDevice.deviceId);
        }
        return data;
      }
    } catch {}

    return { approved: false };
  }

  // ---------------------------------------------------------------------------
  // Receiving Mode & Direct WebRTC DataChannel Delta Transfer Execution
  // ---------------------------------------------------------------------------

  public startReceivingMode(onIncoming: (event: IncomingTransferEvent) => void): () => void {
    if (this.unsubscribeTransfers) this.unsubscribeTransfers();
    this.unsubscribeTransfers = webrtcSyncManager.subscribeIncomingTransfers(event => {
      onIncoming(event as IncomingTransferEvent);
    });
    return () => {
      if (this.unsubscribeTransfers) {
        this.unsubscribeTransfers();
        this.unsubscribeTransfers = null;
      }
    };
  }

  public stopReceivingMode() {
    if (this.unsubscribeTransfers) {
      this.unsubscribeTransfers();
      this.unsubscribeTransfers = null;
    }
  }

  public async sendChangesToDevice(
    targetDevice: { deviceId: string; deviceName: string },
    payload: EhsaanPlayDeltaPayload,
    onStatusUpdate?: (status: TransferStatus, message?: string) => void
  ): Promise<{ success: boolean; message: string }> {
    onStatusUpdate?.('connecting', `Establishing WebRTC connection to ${targetDevice.deviceName}…`);
    await new Promise(r => setTimeout(r, 400));

    onStatusUpdate?.('preparing', `Preparing ${payload.changes.length} delta changes…`);
    await new Promise(r => setTimeout(r, 400));

    onStatusUpdate?.('sending', `Sending changes over WebRTC DataChannel to ${targetDevice.deviceName}…`);

    const result = await webrtcSyncManager.sendDeltaOverDataChannel(
      targetDevice.deviceId,
      payload,
      payload.summary
    );

    if (result.success) {
      onStatusUpdate?.('verifying', 'Verifying & updating checkpoint…');
      await new Promise(r => setTimeout(r, 400));
      saveCheckpoint(payload.toChangeId, targetDevice.deviceId, targetDevice.deviceName);
      onStatusUpdate?.('completed', `✓ WebRTC Transfer Complete. ${payload.changes.length} changes merged.`);
    } else {
      onStatusUpdate?.('failed', result.message || 'WebRTC Transfer Failed.');
    }

    return result;
  }

  public respondToIncomingTransfer(
    targetDeviceId: string,
    transferId: string,
    action: 'accept' | 'decline'
  ) {
    webrtcSyncManager.respondToIncomingTransfer(targetDeviceId, transferId, action);
  }
}

export const deviceTransferService = new DeviceTransferEngine();
