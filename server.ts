import express, { Request, Response } from 'express';
import fs from 'fs';
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
  // 5. OMDb Secure Server-Side Proxy (Keeps API Key Secure in Production)
  // -------------------------------------------------------------------------
  app.get('/api/omdb', async (req: Request, res: Response) => {
    const imdbId = req.query.i as string;
    const query = req.query.s as string;
    const apiKey = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY || '5ac583a2';

    if (!imdbId && !query) {
      return res.status(400).json({ Response: 'False', Error: 'Missing i (imdbId) or s (search) query parameter' });
    }

    try {
      const targetUrl = new URL('https://www.omdbapi.com/');
      targetUrl.searchParams.set('apikey', apiKey);
      if (imdbId) {
        targetUrl.searchParams.set('i', imdbId.trim());
        targetUrl.searchParams.set('plot', (req.query.plot as string) || 'full');
      } else if (query) {
        targetUrl.searchParams.set('s', query.trim());
        if (req.query.type) targetUrl.searchParams.set('type', req.query.type as string);
        if (req.query.page) targetUrl.searchParams.set('page', req.query.page as string);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const upstreamRes = await fetch(targetUrl.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await upstreamRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ Response: 'False', Error: err.message || 'Failed to communicate with OMDb API' });
    }
  });

  // -------------------------------------------------------------------------
  // 6. TMDB Secure Server-Side Proxy (Secret Integration)
  // -------------------------------------------------------------------------
  app.get('/api/tmdb', async (req: Request, res: Response) => {
    const endpoint = (req.query.endpoint as string) || 'configuration';
    
    // Key resolution order: header override > server env secret > client vite env secret > default fallback
    const customHeaderKey = req.headers['x-tmdb-api-key'] as string;
    const apiKey = customHeaderKey || process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || 'a846f4eb273f08cf2aa2a8ee0b7ad03d';
    const bearerToken = process.env.TMDB_READ_ACCESS_TOKEN;

    try {
      const cleanEndpoint = endpoint.replace(/^\/+/, '');
      const targetUrl = new URL(`https://api.themoviedb.org/3/${cleanEndpoint}`);

      // Copy query parameters except 'endpoint'
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'endpoint' && typeof value === 'string') {
          targetUrl.searchParams.set(key, value);
        }
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      } else if (apiKey.length > 50 || apiKey.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        targetUrl.searchParams.set('api_key', apiKey);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const upstreamRes = await fetch(targetUrl.toString(), {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await upstreamRes.json();
      res.status(upstreamRes.status).json(data);
    } catch (err: any) {
      res.status(502).json({
        Response: 'False',
        Error: err.message || 'Failed to communicate with TMDB API via server secret proxy',
      });
    }
  });

  // -------------------------------------------------------------------------
  // 7. Multi-Source Backend Streaming & Crew Fallback Search Service
  // -------------------------------------------------------------------------
  app.get('/api/streaming-info', async (req: Request, res: Response) => {
    const title = (req.query.title as string || '').trim();
    const year = (req.query.year as string || '').trim();
    const imdbId = (req.query.imdbId as string || '').trim();
    const mediaType = (req.query.type as string || 'movie').trim();

    if (!title && !imdbId) {
      return res.status(400).json({ error: 'Missing title or imdbId parameter' });
    }

    try {
      let tmdbWatchProviders: any[] = [];

      // 1. If imdbId is available, find TMDB ID first
      let tmdbId: number | null = null;
      let actualType = mediaType;

      if (imdbId && imdbId.startsWith('tt')) {
        const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || 'a846f4eb273f08cf2aa2a8ee0b7ad03d';
        const findUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
        const findRes = await fetch(findUrl);
        if (findRes.ok) {
          const findData = await findRes.json();
          const match = findData.movie_results?.[0] || findData.tv_results?.[0];
          if (match) {
            tmdbId = match.id;
            actualType = findData.movie_results?.[0] ? 'movie' : 'tv';
          }
        }
      }

      // 2. Query TMDB Watch Providers if TMDB ID resolved
      if (tmdbId) {
        const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || 'a846f4eb273f08cf2aa2a8ee0b7ad03d';
        const provUrl = `https://api.themoviedb.org/3/${actualType}/${tmdbId}/watch/providers?api_key=${apiKey}`;
        const provRes = await fetch(provUrl);
        if (provRes.ok) {
          const provData = await provRes.json();
          const results = provData.results || {};
          const usRes = results.US || results.GB || results.CA || Object.values(results)[0] as any;
          if (usRes) {
            const flatrate = (usRes.flatrate || []).map((p: any) => ({
              name: p.provider_name,
              type: 'stream',
              logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
            }));
            const rent = (usRes.rent || []).map((p: any) => ({
              name: p.provider_name,
              type: 'rent',
              logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
            }));
            const buy = (usRes.buy || []).map((p: any) => ({
              name: p.provider_name,
              type: 'buy',
              logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
            }));
            tmdbWatchProviders = [...flatrate, ...rent, ...buy];
          }
        }
      }

      // 3. Fallback: DuckDuckGo Web Search Scraping if TMDB watch providers are empty
      if (tmdbWatchProviders.length === 0 && title) {
        try {
          const searchQuery = encodeURIComponent(`where to stream ${title} ${year} watch online`);
          const ddgUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const ddgRes = await fetch(ddgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (ddgRes.ok) {
            const htmlText = await ddgRes.text();
            const lowerHtml = htmlText.toLowerCase();

            const detectedProviders: { name: string; type: 'stream' | 'rent'; logoUrl?: string }[] = [];
            const platformKeywords = [
              { key: 'netflix', name: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/pbpMk121StLrhA3S31A2S3A2S3.jpg' },
              { key: 'prime video', name: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/w92/6899vL88A4.jpg' },
              { key: 'amazon prime', name: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/w92/6899vL88A4.jpg' },
              { key: 'disney+', name: 'Disney+', logo: 'https://image.tmdb.org/t/p/w92/7qeP3L47.jpg' },
              { key: 'disney plus', name: 'Disney+', logo: 'https://image.tmdb.org/t/p/w92/7qeP3L47.jpg' },
              { key: 'hbo max', name: 'Max', logo: 'https://image.tmdb.org/t/p/w92/max.jpg' },
              { key: 'apple tv', name: 'Apple TV+', logo: 'https://image.tmdb.org/t/p/w92/appletv.jpg' },
              { key: 'hulu', name: 'Hulu', logo: 'https://image.tmdb.org/t/p/w92/hulu.jpg' },
              { key: 'paramount+', name: 'Paramount+', logo: 'https://image.tmdb.org/t/p/w92/paramount.jpg' },
              { key: 'peacock', name: 'Peacock', logo: 'https://image.tmdb.org/t/p/w92/peacock.jpg' },
            ];

            for (const platform of platformKeywords) {
              if (lowerHtml.includes(platform.key)) {
                if (!detectedProviders.some(p => p.name === platform.name)) {
                  detectedProviders.push({
                    name: platform.name,
                    type: 'stream',
                    logoUrl: platform.logo,
                  });
                }
              }
            }

            if (detectedProviders.length > 0) {
              tmdbWatchProviders = detectedProviders;
            }
          }
        } catch {
          // ignore web search failure
        }
      }

      // Default fallback if still empty
      if (tmdbWatchProviders.length === 0) {
        tmdbWatchProviders = [
          { name: 'Stream / VOD Available', type: 'stream' },
        ];
      }

      res.json({ providers: tmdbWatchProviders });
    } catch (err: any) {
      res.json({
        providers: [{ name: 'Stream / VOD Available', type: 'stream' }],
        error: err.message,
      });
    }
  });

  // -------------------------------------------------------------------------
  // Vite Integration (Dev middleware or Production static files)
  // -------------------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      root: __dirname,
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }).end(template);
      } catch (e: any) {
        next(e);
      }
    });
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
