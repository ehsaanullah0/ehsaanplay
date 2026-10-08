import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ActivePeer {
  deviceId: string;
  deviceName: string;
  deviceType: 'phone' | 'laptop' | 'tablet' | 'desktop' | 'tv';
  lastSeen: number;
  ip?: string;
}

interface ActivePairingSession {
  pairingCode: string;
  hostDevice: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
  };
  createdAt: number;
  expiresAt: number;
  guestDevice?: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
  };
  pairingId?: string;
}

interface QRPairingSession {
  sessionId: string;
  pairingToken: string;
  hostDevice: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
  };
  createdAt: number;
  expiresAt: number;
  pendingRequest?: {
    guestDevice: {
      deviceId: string;
      deviceName: string;
      deviceType: string;
    };
    requestedAt: number;
  };
  approved?: boolean;
  rejected?: boolean;
  pairingId?: string;
}

interface WebRTCSignalMessage {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  signalType: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  createdAt: number;
}

// Ephemeral in-memory registries for WebRTC Signaling & Pairing Bootstrap ONLY
const activePeers = new Map<string, ActivePeer>();
const pairingSessions = new Map<string, ActivePairingSession>();
const qrSessions = new Map<string, QRPairingSession>();
const signalQueues = new Map<string, WebRTCSignalMessage[]>();

// Garbage collection for stale peers (> 30s), signals (> 60s), and pairing sessions (> 10m)
setInterval(() => {
  const now = Date.now();
  for (const [id, peer] of activePeers.entries()) {
    if (now - peer.lastSeen > 30000) {
      activePeers.delete(id);
    }
  }
  for (const [code, session] of pairingSessions.entries()) {
    if (now > session.expiresAt) {
      pairingSessions.delete(code);
    }
  }
  for (const [sessionId, session] of qrSessions.entries()) {
    if (now > session.expiresAt + 60000) {
      qrSessions.delete(sessionId);
    }
  }
  for (const [deviceId, queue] of signalQueues.entries()) {
    const valid = queue.filter(m => now - m.createdAt <= 60000);
    if (valid.length === 0) {
      signalQueues.delete(deviceId);
    } else {
      signalQueues.set(deviceId, valid);
    }
  }
}, 5000);

function generateShortPairingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c1 = '';
  let c2 = '';
  for (let i = 0; i < 4; i++) {
    c1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 2; i++) {
    c2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EH-${c1}-${c2}`;
}

function normalizePairingCode(code: string): string {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // -------------------------------------------------------------------------
  // 1. WebRTC Peer Discovery & Presence Signaling API
  // -------------------------------------------------------------------------

  app.post('/api/signaling/announce', (req: Request, res: Response) => {
    const { deviceId, deviceName, deviceType } = req.body;
    if (!deviceId || !deviceName) {
      return res.status(400).json({ error: 'Missing device identity' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'local';

    activePeers.set(deviceId, {
      deviceId,
      deviceName,
      deviceType: deviceType || 'laptop',
      lastSeen: Date.now(),
      ip: clientIp,
    });

    res.json({ ok: true, activeCount: activePeers.size });
  });

  app.get('/api/signaling/peers', (req: Request, res: Response) => {
    const callerId = req.query.deviceId as string;
    const now = Date.now();
    const peers: ActivePeer[] = [];

    for (const [id, peer] of activePeers.entries()) {
      if (id !== callerId && now - peer.lastSeen <= 25000) {
        peers.push(peer);
      }
    }

    res.json({ peers });
  });

  // -------------------------------------------------------------------------
  // 2. WebRTC Signal Exchange Pipeline (Offer, Answer, ICE Candidates)
  // -------------------------------------------------------------------------

  app.post('/api/signaling/message', (req: Request, res: Response) => {
    const { fromDeviceId, toDeviceId, signalType, payload } = req.body;
    if (!fromDeviceId || !toDeviceId || !signalType || !payload) {
      return res.status(400).json({ error: 'Invalid WebRTC signal format' });
    }

    const message: WebRTCSignalMessage = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromDeviceId,
      toDeviceId,
      signalType,
      payload,
      createdAt: Date.now(),
    };

    let queue = signalQueues.get(toDeviceId);
    if (!queue) {
      queue = [];
      signalQueues.set(toDeviceId, queue);
    }
    queue.push(message);

    res.json({ ok: true, messageId: message.id });
  });

  app.get('/api/signaling/messages', (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string;
    if (!deviceId) {
      return res.status(400).json({ error: 'Missing deviceId' });
    }

    const queue = signalQueues.get(deviceId) || [];
    signalQueues.delete(deviceId); // Flush retrieved signals

    res.json({ messages: queue });
  });

  // -------------------------------------------------------------------------
  // 3. Short Code Pairing Bootstrap Signaling
  // -------------------------------------------------------------------------

  app.post('/api/signaling/pair/generate', (req: Request, res: Response) => {
    const { hostDevice } = req.body;
    if (!hostDevice || !hostDevice.deviceId) {
      return res.status(400).json({ error: 'Missing host device identity' });
    }

    const pairingCode = generateShortPairingCode();
    const normKey = normalizePairingCode(pairingCode);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const session: ActivePairingSession = {
      pairingCode,
      hostDevice,
      createdAt: Date.now(),
      expiresAt,
    };

    pairingSessions.set(normKey, session);

    activePeers.set(hostDevice.deviceId, {
      deviceId: hostDevice.deviceId,
      deviceName: hostDevice.deviceName,
      deviceType: hostDevice.deviceType || 'laptop',
      lastSeen: Date.now(),
    });

    res.json({ pairingCode, expiresAt });
  });

  app.post('/api/signaling/pair/connect', (req: Request, res: Response) => {
    const { pairingCode, guestDevice } = req.body;
    const normKey = normalizePairingCode(pairingCode);

    const session = pairingSessions.get(normKey);
    if (!session || Date.now() > session.expiresAt) {
      return res.status(404).json({ error: 'Invalid or expired pairing code. Please generate a new code on Device A.' });
    }

    const pairingId = `pair_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    session.guestDevice = guestDevice;
    session.pairingId = pairingId;

    if (guestDevice && guestDevice.deviceId) {
      activePeers.set(guestDevice.deviceId, {
        deviceId: guestDevice.deviceId,
        deviceName: guestDevice.deviceName,
        deviceType: guestDevice.deviceType || 'phone',
        lastSeen: Date.now(),
      });
    }

    res.json({
      ok: true,
      pairingId,
      hostDevice: session.hostDevice,
      message: `Successfully paired with ${session.hostDevice.deviceName}!`,
    });
  });

  app.get('/api/signaling/pair/check', (req: Request, res: Response) => {
    const rawCode = req.query.code as string || '';
    const normKey = normalizePairingCode(rawCode);
    const session = pairingSessions.get(normKey);

    if (!session) {
      return res.json({ paired: false, expired: true });
    }

    if (session.guestDevice && session.pairingId) {
      return res.json({
        paired: true,
        guestDevice: session.guestDevice,
        pairingId: session.pairingId,
      });
    }

    res.json({ paired: false, expired: Date.now() > session.expiresAt });
  });

  // -------------------------------------------------------------------------
  // 4. QR Code Pairing Bootstrap Signaling
  // -------------------------------------------------------------------------

  app.post('/api/signaling/qr/generate', (req: Request, res: Response) => {
    const { hostDevice } = req.body;
    if (!hostDevice || !hostDevice.deviceId) {
      return res.status(400).json({ error: 'Missing host device identity' });
    }

    const sessionId = `qr_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pairingToken = `tok_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 60 * 1000; // QR expires in 60s

    const session: QRPairingSession = {
      sessionId,
      pairingToken,
      hostDevice,
      createdAt: Date.now(),
      expiresAt,
    };

    qrSessions.set(sessionId, session);

    activePeers.set(hostDevice.deviceId, {
      deviceId: hostDevice.deviceId,
      deviceName: hostDevice.deviceName,
      deviceType: hostDevice.deviceType || 'laptop',
      lastSeen: Date.now(),
    });

    const qrPayload = {
      type: 'ehsaan-play-pair',
      version: 1,
      sessionId,
      deviceId: hostDevice.deviceId,
      deviceName: hostDevice.deviceName,
      deviceType: hostDevice.deviceType,
      pairingToken,
      expiresAt,
    };

    res.json({ sessionId, pairingToken, expiresAt, qrPayload });
  });

  app.post('/api/signaling/qr/verify-and-request', (req: Request, res: Response) => {
    const { payload, guestDevice } = req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'This QR code is not an EHSAAN PLAY device connection code.' });
    }

    if (payload.type !== 'ehsaan-play-pair' || payload.version !== 1) {
      return res.status(400).json({ error: 'Unsupported or invalid QR code protocol.' });
    }

    if (Date.now() > payload.expiresAt) {
      return res.status(400).json({ error: 'QR code expired. Ask the other device to generate a new QR code.' });
    }

    const session = qrSessions.get(payload.sessionId);
    if (!session || session.pairingToken !== payload.pairingToken) {
      return res.status(400).json({ error: 'QR code invitation was revoked or invalidated. Please generate a new QR code.' });
    }

    if (Date.now() > session.expiresAt) {
      return res.status(400).json({ error: 'QR code expired. Ask the other device to generate a new QR code.' });
    }

    session.pendingRequest = {
      guestDevice,
      requestedAt: Date.now(),
    };

    if (guestDevice && guestDevice.deviceId) {
      activePeers.set(guestDevice.deviceId, {
        deviceId: guestDevice.deviceId,
        deviceName: guestDevice.deviceName,
        deviceType: guestDevice.deviceType || 'phone',
        lastSeen: Date.now(),
      });
    }

    res.json({
      ok: true,
      hostDevice: session.hostDevice,
      message: `Pairing request sent to ${session.hostDevice.deviceName}. Waiting for approval…`,
    });
  });

  app.get('/api/signaling/qr/check-request', (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const session = qrSessions.get(sessionId);

    if (!session) {
      return res.json({ expired: true });
    }

    if (Date.now() > session.expiresAt) {
      return res.json({ expired: true });
    }

    if (session.pendingRequest) {
      return res.json({
        hasRequest: true,
        guestDevice: session.pendingRequest.guestDevice,
        requestedAt: session.pendingRequest.requestedAt,
      });
    }

    res.json({ hasRequest: false, expired: false });
  });

  app.post('/api/signaling/qr/approve', (req: Request, res: Response) => {
    const { sessionId, action } = req.body;
    const session = qrSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session expired or not found.' });
    }

    if (action === 'accept') {
      const pairingId = `pair_qr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      session.approved = true;
      session.pairingId = pairingId;

      if (session.pendingRequest?.guestDevice) {
        activePeers.set(session.pendingRequest.guestDevice.deviceId, {
          deviceId: session.pendingRequest.guestDevice.deviceId,
          deviceName: session.pendingRequest.guestDevice.deviceName,
          deviceType: (session.pendingRequest.guestDevice.deviceType as any) || 'phone',
          lastSeen: Date.now(),
        });
      }

      return res.json({ ok: true, approved: true, pairingId });
    } else {
      session.rejected = true;
      return res.json({ ok: true, approved: false });
    }
  });

  app.get('/api/signaling/qr/check-approval', (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const session = qrSessions.get(sessionId);

    if (!session) {
      return res.json({ expired: true });
    }

    if (session.approved) {
      return res.json({
        approved: true,
        pairingId: session.pairingId,
        hostDevice: session.hostDevice,
      });
    }

    if (session.rejected) {
      return res.json({ rejected: true });
    }

    res.json({ approved: false, rejected: false, expired: Date.now() > session.expiresAt });
  });

  // -------------------------------------------------------------------------
  // Vite Integration (Dev middleware or Production static files)
  // -------------------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EHSAAN PLAY] Signaling server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[EHSAAN PLAY] Failed to start signaling server:', err);
  process.exit(1);
});
