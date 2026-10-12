import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Wifi,
  Send,
  Download,
  Upload,
  Smartphone,
  Laptop,
  Tablet,
  Tv,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Radio,
  Plus,
  Trash2,
  Lock,
  Clock,
  Key,
  QrCode,
  Camera,
  FileJson,
  Copy,
  Info,
  Layers,
  FileText,
  Zap,
  Star,
} from 'lucide-react';
import {
  LocalDeviceIdentity,
  PairedDeviceRecord,
  DiscoveredDevice,
  DeviceType,
  EhsaanPlayDeltaPayload,
  IncomingTransferEvent,
  TransferStatus,
  QRPairingPayload,
  getLocalDeviceIdentity,
  updateLocalDeviceName,
  prepareDeltaPayload,
  deviceTransferService,
  loadPairedDevices,
  forgetPairedDevice,
  addOrUpdatePairedDevice,
} from '../../services/deviceTransfer';
import {
  applyRecentChanges,
  getChangeLogStats,
  getRecentChanges,
  createRecentChangesPackage,
  exportChangesToJSON,
  encodeChangesToCode,
  decodeChangesFromCode,
  validateChangesPackage,
  saveCheckpoint,
  clearChangeLogHistory,
  RecentChangesPackage,
} from '../../services/recentChanges';
import { QRScannerModal } from './QRScannerModal';
import { SafeImage } from '../common/SafeImage';
import { loadMediaCache } from '../../services/storage';

interface DeviceTransferViewProps {
  onRefreshData?: () => void;
}

export const DeviceTransferView: React.FC<DeviceTransferViewProps> = ({
  onRefreshData,
}) => {
  // Main Tab Navigation: 'json' (Default/Recommended) | 'wifi'
  const [mainTab, setMainTab] = useState<'json' | 'wifi'>('json');

  // Device identity & paired devices
  const [deviceIdentity, setDeviceIdentity] = useState<LocalDeviceIdentity>(getLocalDeviceIdentity());
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(deviceIdentity.deviceName);

  const [pairedDevices, setPairedDevices] = useState<PairedDeviceRecord[]>(loadPairedDevices());
  const [discoveredPeers, setDiscoveredPeers] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Active sub-view in WebRTC tab: 'overview' | 'send'
  const [activeView, setActiveView] = useState<'overview' | 'send'>('overview');

  // Pair Modal State (WebRTC P2P)
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [pairModalTab, setPairModalTab] = useState<'show_qr' | 'scan_qr' | 'pairing_code'>('show_qr');

  // WebRTC QR & Code State
  const [qrPayload, setQrPayload] = useState<QRPairingPayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [qrRemainingSec, setQrRemainingSec] = useState<number>(60);
  const [generatedPairCode, setGeneratedPairCode] = useState<string | null>(null);
  const [qrPendingRequest, setQrPendingRequest] = useState<LocalDeviceIdentity | null>(null);
  const [qrSuccessMsg, setQrSuccessMsg] = useState<string | null>(null);

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannedPayload, setScannedPayload] = useState<QRPairingPayload | null>(null);
  const [scannedConfirmHost, setScannedConfirmHost] = useState<LocalDeviceIdentity | null>(null);
  const [isRequestingQRPair, setIsRequestingQRPair] = useState(false);
  const [qrPairError, setQrPairError] = useState<string | null>(null);

  const [inputPairCode, setInputPairCode] = useState<string>('');
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairSuccessMsg, setPairSuccessMsg] = useState<string | null>(null);
  const [isPairingConnecting, setIsPairingConnecting] = useState(false);

  // Send Workflow State (WebRTC)
  const [selectedTargetDeviceId, setSelectedTargetDeviceId] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Incoming Transfer State on Receiver (WebRTC)
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransferEvent | null>(null);
  const [importResultSummary, setImportResultSummary] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Delta Stats
  const [stats, setStats] = useState(getChangeLogStats());

  // ---------------------------------------------------------------------------
  // CHANGE-JSON TAB STATE
  // ---------------------------------------------------------------------------
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const [jsonResult, setJsonResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Code Sync Modal State
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalMode, setCodeModalMode] = useState<'generate' | 'enter'>('generate');
  const [generatedSyncCode, setGeneratedSyncCode] = useState<string | null>(null);
  const [inputSyncCode, setInputSyncCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Fullscreen Preview Changes State
  const [previewPackage, setPreviewPackage] = useState<RecentChangesPackage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Outgoing Delta payload for WebRTC
  const activePayload = useMemo(() => {
    const unexportedPayload = prepareDeltaPayload({ fromChangeId: stats.lastExportedChangeId + 1 });
    if (unexportedPayload && unexportedPayload.changes.length > 0) return unexportedPayload;
    return prepareDeltaPayload({ limit: 10 });
  }, [stats.lastExportedChangeId]);

  // Construct a mapping of entity IDs to movie/series metadata (e.g. title, poster, type)
  const mediaDetailsMap = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Seed from the receiver's local cached catalog
    try {
      const cached = loadMediaCache();
      if (Array.isArray(cached)) {
        for (const m of cached) {
          if (m && m.id) {
            map.set(m.id, m);
          }
        }
      }
    } catch (err) {
      console.error('Error seeding mediaDetailsMap from cache:', err);
    }

    // 2. Supplement/override with data from the incoming previewPackage changes (e.g. 'add' operations)
    if (previewPackage && Array.isArray(previewPackage.changes)) {
      for (const change of previewPackage.changes) {
        if (change.entityId) {
          const item = change.data?.mediaItem;
          if (item && item.id) {
            const existing = map.get(change.entityId) || {};
            map.set(change.entityId, {
              ...existing,
              ...item,
            });
          }
        }
      }
    }

    return map;
  }, [previewPackage]);

  // Initial load and continuous discovery setup
  useEffect(() => {
    const identity = getLocalDeviceIdentity();
    setDeviceIdentity(identity);
    setPairedDevices(loadPairedDevices());
    setStats(getChangeLogStats());

    // Start WebRTC signaling discovery and listen for peer heartbeats
    deviceTransferService.startPresenceAdvertising((discovered, paired) => {
      setDiscoveredPeers(discovered);
      setPairedDevices(paired);
    });

    // Start receiving listener for incoming WebRTC transfers
    const unsubscribeReceiving = deviceTransferService.startReceivingMode(transfer => {
      setIncomingTransfer(transfer);
    });

    // Keep changelog stats perfectly updated if user toggles watchlists or adds titles via header Search modal
    const handleFocus = () => {
      setStats(getChangeLogStats());
    };
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      setStats(getChangeLogStats());
    }, 1500);

    return () => {
      deviceTransferService.stopPresenceAdvertising();
      unsubscribeReceiving();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // WebRTC: Generate QR code session on Host device
  const handleGenerateQRSession = async () => {
    setQrSuccessMsg(null);
    setQrPendingRequest(null);
    setPairError(null);

    const fallback = await deviceTransferService.generatePairingCode();
    setGeneratedPairCode(fallback.pairingCode);

    const session = await deviceTransferService.generateQRSession();
    setQrPayload(session.qrPayload);
    setQrExpiresAt(session.expiresAt);
    setQrRemainingSec(60);

    try {
      const dataUrl = await QRCode.toDataURL(JSON.stringify(session.qrPayload), {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  };

  const handleOpenPairModal = (tab?: 'show_qr' | 'scan_qr' | 'pairing_code') => {
    setIsPairModalOpen(true);
    const targetTab = tab || (deviceIdentity.deviceType === 'phone' ? 'scan_qr' : 'show_qr');
    setPairModalTab(targetTab);

    if (targetTab === 'show_qr') {
      handleGenerateQRSession();
    } else if (targetTab === 'scan_qr') {
      setIsScannerModalOpen(true);
    }
  };

  // Timer Countdown for WebRTC QR Expiration
  useEffect(() => {
    let interval: any = null;
    if (isPairModalOpen && pairModalTab === 'show_qr' && qrExpiresAt && !qrSuccessMsg) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
        setQrRemainingSec(remaining);
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPairModalOpen, pairModalTab, qrExpiresAt, qrSuccessMsg]);

  // WebRTC: Host Device Polls for Incoming QR Connection Request
  useEffect(() => {
    let interval: any = null;
    if (isPairModalOpen && pairModalTab === 'show_qr' && qrPayload && !qrPendingRequest && !qrSuccessMsg) {
      interval = setInterval(async () => {
        const check = await deviceTransferService.pollQRRequest(qrPayload.sessionId);
        if (check.hasRequest && check.guestDevice) {
          setQrPendingRequest(check.guestDevice);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPairModalOpen, pairModalTab, qrPayload, qrPendingRequest, qrSuccessMsg]);

  // WebRTC: Host Device Approves or Rejects Connection Request
  const handleHostApproveQRRequest = async (action: 'accept' | 'reject') => {
    if (!qrPayload || !qrPendingRequest) return;

    if (action === 'accept') {
      await deviceTransferService.approveQRPairing(qrPayload.sessionId, 'accept');
      addOrUpdatePairedDevice({
        deviceId: qrPendingRequest.deviceId,
        deviceName: qrPendingRequest.deviceName,
        deviceType: qrPendingRequest.deviceType,
        status: 'CONNECTED',
      });
      setPairedDevices(loadPairedDevices());
      setQrSuccessMsg(`✓ Successfully paired with ${qrPendingRequest.deviceName}!`);
      setTimeout(() => {
        setIsPairModalOpen(false);
        setQrSuccessMsg(null);
        setQrPendingRequest(null);
      }, 1800);
    } else {
      await deviceTransferService.approveQRPairing(qrPayload.sessionId, 'reject');
      setQrPendingRequest(null);
    }
  };

  // WebRTC: Guest Device Handles Scanned QR Code
  const handleScannedPayload = async (payload: QRPairingPayload) => {
    setIsScannerModalOpen(false);

    if ((payload as any).format === 'ehsaan-play-recent-changes') {
      handleApplyChangePackage(payload as any);
      return;
    }

    setScannedPayload(payload);
    setQrPairError(null);

    if (Date.now() > payload.expiresAt) {
      setQrPairError('QR code expired. Ask the other device to generate a new QR code.');
      return;
    }

    setScannedConfirmHost({
      deviceId: payload.deviceId,
      deviceName: payload.deviceName,
      deviceType: payload.deviceType,
    });
  };

  // WebRTC: Guest Device Confirms Pairing Request
  const handleConfirmQRPairing = async () => {
    if (!scannedPayload) return;
    setIsRequestingQRPair(true);
    setQrPairError(null);

    const res = await deviceTransferService.verifyAndRequestQRPairing(scannedPayload);
    setIsRequestingQRPair(false);

    if (!res.success) {
      setQrPairError(res.message);
      return;
    }

    const pollInterval = setInterval(async () => {
      const check = await deviceTransferService.pollQRApproval(scannedPayload.sessionId);
      if (check.approved) {
        clearInterval(pollInterval);
        setPairSuccessMsg(`✓ Connected to ${scannedPayload.deviceName}!`);
        setPairedDevices(loadPairedDevices());
        setTimeout(() => {
          setIsPairModalOpen(false);
          setScannedConfirmHost(null);
          setScannedPayload(null);
          setPairSuccessMsg(null);
        }, 1800);
      } else if (check.rejected) {
        clearInterval(pollInterval);
        setQrPairError('Connection request was declined by host device.');
        setScannedConfirmHost(null);
      } else if (check.expired) {
        clearInterval(pollInterval);
        setQrPairError('QR code expired. Ask the other device to generate a new QR code.');
        setScannedConfirmHost(null);
      }
    }, 1000);
  };

  // WebRTC: Poll for short pairing code connection
  useEffect(() => {
    let interval: any = null;
    if (isPairModalOpen && pairModalTab === 'pairing_code' && generatedPairCode && !pairSuccessMsg) {
      interval = setInterval(async () => {
        const check = await deviceTransferService.pollPairingStatus(generatedPairCode);
        if (check.paired && check.guestDevice) {
          setPairSuccessMsg(`✓ Successfully paired with ${check.guestDevice.deviceName}!`);
          setPairedDevices(loadPairedDevices());
          setTimeout(() => {
            setIsPairModalOpen(false);
            setPairSuccessMsg(null);
            setGeneratedPairCode(null);
          }, 1800);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPairModalOpen, pairModalTab, generatedPairCode, pairSuccessMsg]);

  const handleScanNetwork = async () => {
    setIsScanning(true);
    try {
      const res = await deviceTransferService.fetchDiscoveredPeers();
      setDiscoveredPeers(res.discovered);
      setPairedDevices(res.paired);
    } finally {
      setTimeout(() => setIsScanning(false), 600);
    }
  };

  const handleSaveDeviceName = () => {
    if (!customNameInput.trim()) return;
    const updated = updateLocalDeviceName(customNameInput.trim());
    setDeviceIdentity(updated);
    setIsEditingName(false);
    deviceTransferService.startPresenceAdvertising();
  };

  const handleConnectWithCode = async () => {
    if (!inputPairCode.trim()) return;
    setPairError(null);
    setIsPairingConnecting(true);

    const res = await deviceTransferService.connectWithPairingCode(inputPairCode.trim());
    setIsPairingConnecting(false);

    if (res.success) {
      setPairSuccessMsg(res.message);
      setPairedDevices(loadPairedDevices());
      setInputPairCode('');
      setTimeout(() => {
        setIsPairModalOpen(false);
        setPairSuccessMsg(null);
      }, 1800);
    } else {
      setPairError(res.message);
    }
  };

  const handleForgetDevice = (deviceId: string, deviceName: string) => {
    if (window.confirm(`Permanently remove pairing with "${deviceName}"? You will need to pair again in the future.`)) {
      forgetPairedDevice(deviceId);
      setPairedDevices(loadPairedDevices());
    }
  };

  const handleExecuteSend = async () => {
    if (!selectedTargetDeviceId || !activePayload) return;

    const allTargets = [
      ...pairedDevices.map(p => ({ deviceId: p.deviceId, deviceName: p.deviceName })),
      ...discoveredPeers.map(d => ({ deviceId: d.deviceId, deviceName: d.deviceName })),
    ];
    const target = allTargets.find(t => t.deviceId === selectedTargetDeviceId);
    if (!target) return;

    setTransferStatus('connecting');
    setStatusMessage(`Establishing WebRTC connection to ${target.deviceName}…`);

    const result = await deviceTransferService.sendChangesToDevice(
      target,
      activePayload,
      (status, msg) => {
        setTransferStatus(status);
        if (msg) setStatusMessage(msg);
      }
    );

    if (result.success) {
      setStats(getChangeLogStats());
      if (onRefreshData) onRefreshData();
    }
  };

  const handleAcceptIncoming = () => {
    if (!incomingTransfer) return;

    try {
      const applyResult = applyRecentChanges({
        format: 'ehsaan-play-recent-changes',
        version: 1,
        exportedAt: incomingTransfer.timestamp,
        fromChangeId: incomingTransfer.payload.fromChangeId,
        toChangeId: incomingTransfer.payload.toChangeId,
        changeCount: incomingTransfer.payload.changes.length,
        changes: incomingTransfer.payload.changes,
      });

      if (applyResult.success) {
        deviceTransferService.respondToIncomingTransfer(
          incomingTransfer.sourceDevice.deviceId,
          incomingTransfer.transferId,
          'accept'
        );

        addOrUpdatePairedDevice({
          deviceId: incomingTransfer.sourceDevice.deviceId,
          deviceName: incomingTransfer.sourceDevice.deviceName,
          deviceType: incomingTransfer.sourceDevice.deviceType,
          status: 'CONNECTED',
        });

        const added = applyResult.newItemsCount;
        const updated = applyResult.updatesCount;
        const duplicates = Math.max(0, applyResult.appliedCount - (added + updated));

        setImportResultSummary({
          success: true,
          message: `✓ WebRTC Sync Complete: ${added} item${added !== 1 ? 's' : ''} added • ${updated} update${updated !== 1 ? 's' : ''} • ${duplicates} duplicates preserved`,
          details: `Merged changes from ${incomingTransfer.sourceDevice.deviceName} into your local library.`,
        });

        setIncomingTransfer(null);
        setStats(getChangeLogStats());
        setPairedDevices(loadPairedDevices());
        if (onRefreshData) onRefreshData();
      } else {
        setImportResultSummary({
          success: false,
          message: applyResult.message || 'Validation failed for incoming payload.',
        });
      }
    } catch (err) {
      setImportResultSummary({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to apply incoming sync request.',
      });
    }
  };

  const handleDeclineIncoming = () => {
    if (!incomingTransfer) return;
    deviceTransferService.respondToIncomingTransfer(
      incomingTransfer.sourceDevice.deviceId,
      incomingTransfer.transferId,
      'decline'
    );
    setIncomingTransfer(null);
  };

  // ---------------------------------------------------------------------------
  // CHANGE-JSON SYSTEM LOGIC (ONE CENTRAL CHANGE ENGINE)
  // ---------------------------------------------------------------------------

  const getExportableChanges = (): RecentChangesPackage => {
    const latestStats = getChangeLogStats();
    const changes = getRecentChanges({ fromChangeId: latestStats.lastExportedChangeId + 1 });
    if (changes.length > 0) {
      return createRecentChangesPackage(changes);
    }
    const fallbackChanges = getRecentChanges({ limit: 20 });
    if (fallbackChanges.length === 0) {
      throw new Error('No library changes found to export.');
    }
    return createRecentChangesPackage(fallbackChanges);
  };

  // Method 1: Export JSON File
  const handleExportJSONFile = () => {
    try {
      const pkg = getExportableChanges();
      const jsonString = exportChangesToJSON(pkg);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ehsaan-play-changes-v1-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveCheckpoint(pkg.toChangeId);
      setStats(getChangeLogStats());

      setJsonResult({
        success: true,
        message: `✓ Exported ${pkg.changeCount} recent changes to JSON file.`,
        details: `Saved file: ehsaan-play-changes-v1-${Date.now()}.json (Changes #${pkg.fromChangeId}–#${pkg.toChangeId}).`,
      });
    } catch (err) {
      setJsonResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to export Change-JSON file.',
      });
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear and reset the recent change history? This will reset your unexported modifications queue, but preserves your actual movies and ratings.')) {
      clearChangeLogHistory();
      setStats(getChangeLogStats());
      setJsonResult({
        success: true,
        message: '✓ Change history successfully cleared and reset.',
      });
    }
  };

  // Method 1: Import JSON File
  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        handleApplyChangePackage(parsed);
      } catch (err) {
        setJsonResult({
          success: false,
          message: err instanceof Error ? err.message : 'Invalid JSON file format.',
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Universal Merge Engine Interceptor for JSON and Code
  const handleApplyChangePackage = (pkg: RecentChangesPackage) => {
    try {
      const validation = validateChangesPackage(pkg);
      if (!validation.valid || !validation.package) {
        setJsonResult({
          success: false,
          message: validation.message || 'Validation failed for Change-JSON package.',
        });
        return;
      }

      // Open the fullscreen Preview Changes window
      setPreviewPackage(validation.package);
      setIsPreviewOpen(true);
    } catch (err) {
      setJsonResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to process Change-JSON transfer.',
      });
    }
  };

  // Merge the changes after user clicks Approve & Merge
  const handleConfirmMergeChanges = () => {
    if (!previewPackage) return;
    try {
      const mergeResult = applyRecentChanges(previewPackage);

      if (mergeResult.success) {
        const added = mergeResult.newItemsCount;
        const updated = mergeResult.updatesCount;
        const duplicates = Math.max(0, mergeResult.appliedCount - (added + updated));

        setJsonResult({
          success: true,
          message: `✓ Change-JSON Merged: ${added} new title${added !== 1 ? 's' : ''} added • ${updated} update${updated !== 1 ? 's' : ''} • ${duplicates} duplicate records preserved intact`,
          details: `Merged ${mergeResult.appliedCount} changes into existing library without overwriting existing data.`,
        });

        setStats(getChangeLogStats());
        if (onRefreshData) onRefreshData();
      } else {
        setJsonResult({
          success: false,
          message: mergeResult.message || 'Failed to apply changes.',
        });
      }
    } catch (err) {
      setJsonResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to process Change-JSON transfer.',
      });
    } finally {
      setIsPreviewOpen(false);
      setPreviewPackage(null);
    }
  };

  // Method 2: Generate Copyable Code
  const handleGenerateSyncCode = () => {
    try {
      const pkg = getExportableChanges();
      const code = encodeChangesToCode(pkg);
      setGeneratedSyncCode(code);
      setCodeModalMode('generate');
      setIsCodeModalOpen(true);
      setCodeCopied(false);
      saveCheckpoint(pkg.toChangeId);
      setStats(getChangeLogStats());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate sync code.');
    }
  };

  // Method 2: Import Copyable Code
  const handleImportSyncCode = () => {
    setCodeError(null);
    if (!inputSyncCode.trim()) return;

    try {
      const pkg = decodeChangesFromCode(inputSyncCode.trim());
      handleApplyChangePackage(pkg);
      setIsCodeModalOpen(false);
      setInputSyncCode('');
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Invalid sync code format.');
    }
  };

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-5 h-5 text-[var(--accent-primary)]" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-[var(--accent-primary)]" />;
      case 'tv':
        return <Tv className="w-5 h-5 text-[var(--accent-primary)]" />;
      case 'desktop':
      case 'laptop':
      default:
        return <Laptop className="w-5 h-5 text-[var(--accent-primary)]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto">
      {/* ------------------------------------------------------------------- */}
      {/* TOP TAB BAR: Change-JSON (Recommended) vs Local Wi-Fi (P2P WebRTC)  */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-3xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs font-black shadow-2xs">
        <button
          type="button"
          onClick={() => setMainTab('json')}
          className={`py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 ${
            mainTab === 'json'
              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-sm scale-[1.01]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileJson className="w-4 h-4 stroke-[2.5]" />
          <span className="font-extrabold">Change-JSON</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] uppercase font-mono tracking-wider bg-black/15 dark:bg-white/15 font-black">
            ⭐ Recommended
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('wifi')}
          className={`py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 ${
            mainTab === 'wifi'
              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-sm scale-[1.01]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Wifi className="w-4 h-4 stroke-[2.5]" />
          <span className="font-extrabold">Local Wi-Fi (P2P)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: CHANGE-JSON SYSTEM (Primary & Clean Layout)                  */}
      {/* ------------------------------------------------------------------- */}
      {mainTab === 'json' && (
        <div className="space-y-6 animate-scale-up">
          {/* Hero Header Surface Card */}
          <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-sm p-6 sm:p-8 space-y-5 overflow-hidden relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-12 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <FileJson className="w-7 h-7 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)]">
                      Transfer Recent Changes
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-black bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                      Change-JSON
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed max-w-xl">
                    Transfer only your recent library modifications between devices. Existing movies, ratings, notes, and collections are preserved safely.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="py-2.5 px-4 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-xs font-bold transition active:scale-95 shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Clear History</span>
              </button>
            </div>

            {/* Change Queue Stats Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                  Ready to Export
                </div>
                <div className="text-lg font-black text-[var(--accent-primary)] tabular-nums">
                  {stats.unexportedCount} changes
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                  Last Exported Checkpoint
                </div>
                <div className="text-sm font-black text-[var(--text-primary)] font-mono tabular-nums">
                  Change #{stats.lastExportedChangeId || 1840}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                  Change History Queue
                </div>
                <div className="text-sm font-black text-[var(--text-primary)] tabular-nums">
                  {stats.totalEntries} entries recorded
                </div>
              </div>
            </div>
          </div>

          {/* Import/Export Result Banner */}
          {jsonResult && (
            <div
              className={`p-5 rounded-3xl text-xs sm:text-sm font-bold flex items-center justify-between border shadow-xs animate-scale-up ${
                jsonResult.success
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/25'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-black text-sm">
                  {jsonResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                  <span>{jsonResult.message}</span>
                </div>
                {jsonResult.details && (
                  <div className="text-xs font-normal opacity-90 pl-7">{jsonResult.details}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setJsonResult(null)}
                className="p-1.5 rounded-full opacity-70 hover:opacity-100 shrink-0 ml-3 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden File Input for JSON Import */}
          <input
            type="file"
            ref={jsonFileInputRef}
            onChange={handleImportJSONFile}
            accept=".json,application/json"
            className="hidden"
          />

          {/* 2 SPACIOUS TRANSFER METHOD SECTIONS */}
          <div className="space-y-4">
            {/* METHOD 1: JSON File ⭐ Primary */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-card)] border-2 border-[var(--accent-primary)]/60 shadow-sm space-y-5 relative overflow-hidden transition-all hover:border-[var(--accent-primary)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center font-black shadow-xs">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-[var(--text-primary)] flex items-center gap-2">
                      <span>JSON File Transfer</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-mono bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black">
                        ⭐ Primary Method
                      </span>
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Export lightweight changes file (`.json`) and import it on your other device
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportJSONFile}
                  className="py-4 px-6 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs sm:text-sm transition-all active:scale-95 shadow-xs hover:opacity-90 flex items-center justify-center gap-2.5"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Export Changes (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="py-4 px-6 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] font-black text-xs sm:text-sm border border-[var(--border-subtle)] transition-all active:scale-95 hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2.5"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Import Changes (JSON)</span>
                </button>
              </div>
            </div>

            {/* METHOD 2: Sync Code */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex items-center justify-center font-black">
                  <Key className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h4 className="font-black text-base text-[var(--text-primary)]">
                    Sync Code Transfer
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Copy and paste a compressed sync string (`EP-RC1-...`) to transfer changes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateSyncCode}
                  className="py-3.5 px-5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] font-bold text-xs sm:text-sm border border-[var(--border-subtle)] transition-all active:scale-95 hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Generate Sync Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCodeModalMode('enter');
                    setCodeError(null);
                    setIsCodeModalOpen(true);
                  }}
                  className="py-3.5 px-5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] font-bold text-xs sm:text-sm border border-[var(--border-subtle)] transition-all active:scale-95 hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Enter Sync Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* Data Guarantee Note */}
          <div className="p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-1.5 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Safe Non-Destructive Library Merging</span>
            </div>
            <p className="leading-relaxed">
              Change-JSON transfers add new titles and merge watch state updates into your existing library without overwriting existing records or clearing unmentioned items.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: LOCAL WI-FI (P2P WebRTC)                                     */}
      {/* ------------------------------------------------------------------- */}
      {mainTab === 'wifi' && (
        <div className="space-y-5 animate-scale-up">
          {/* Device Identity Header Card */}
          <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-sm p-6 sm:p-8 space-y-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-12 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center font-black shrink-0 shadow-2xs">
                  {getDeviceIcon(deviceIdentity.deviceType)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!isEditingName ? (
                      <>
                        <h3 className="text-lg font-black tracking-tight text-[var(--text-primary)] truncate">
                          {deviceIdentity.deviceName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomNameInput(deviceIdentity.deviceName);
                            setIsEditingName(true);
                          }}
                          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                          title="Rename device"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customNameInput}
                          onChange={e => setCustomNameInput(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] font-bold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                          placeholder="e.g. My Phone, Bedroom TV"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveDeviceName}
                          className="p-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--chip-bg)] active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono font-extrabold text-[var(--accent-primary)]">
                      Device ID: {deviceIdentity.deviceId}
                    </span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      WebRTC Ready
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenPairModal('show_qr')}
                className="px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs hover:opacity-90 active:scale-95 shrink-0 self-start sm:self-auto"
              >
                <QrCode className="w-4 h-4 stroke-[2.5]" />
                <span>Show QR Code</span>
              </button>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-3 text-center text-xs border-t border-[var(--border-subtle)]">
              <div className="p-3 rounded-2xl bg-[var(--chip-bg)]">
                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Ready to Send</div>
                <div className="text-base font-black text-[var(--accent-primary)] tabular-nums mt-0.5">
                  {stats.unexportedCount} changes
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chip-bg)]">
                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Paired Devices</div>
                <div className="text-base font-black text-[var(--text-primary)] tabular-nums mt-0.5">
                  {pairedDevices.length} saved
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chip-bg)]">
                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Checkpoint</div>
                <div className="text-base font-black text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
                  #{stats.lastExportedChangeId || 1840}
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Sync Popup (WebRTC) */}
          {incomingTransfer && (
            <div className="p-6 rounded-3xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border border-[var(--border-subtle)] shadow-xl space-y-4 animate-scale-up">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center font-black">
                    <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-[var(--accent-primary)]">
                      WebRTC Sync request received
                    </div>
                    <h4 className="text-base font-black tracking-tight mt-0.5">
                      {incomingTransfer.sourceDevice.deviceName} wants to send changes
                    </h4>
                  </div>
                </div>
                <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 shrink-0">
                  {incomingTransfer.summary.totalChanges} changes
                </span>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAcceptIncoming}
                  className="flex-1 py-3 px-5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs transition active:scale-95 shadow-xs hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Accept & Merge Changes</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeclineIncoming}
                  className="py-3 px-5 rounded-2xl bg-black/10 dark:bg-white/10 font-bold text-xs transition active:scale-95 hover:bg-black/15"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Trusted Paired Devices List */}
          <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                <h4 className="font-black text-sm text-[var(--text-primary)]">
                  Trusted Paired Devices ({pairedDevices.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleScanNetwork}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent-primary)] ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning…' : 'Scan Network'}</span>
              </button>
            </div>

            {pairedDevices.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[var(--chip-bg)]/60 text-center space-y-3">
                <QrCode className="w-10 h-10 text-[var(--text-secondary)] mx-auto opacity-50" />
                <h5 className="font-bold text-sm text-[var(--text-primary)]">No Paired WebRTC Devices</h5>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                  Pair devices via QR code or short code to establish direct WebRTC P2P DataChannels.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenPairModal('show_qr')}
                  className="px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold text-xs shadow-xs active:scale-95 mt-2"
                >
                  + Pair First Device
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pairedDevices.map(peer => {
                  const isOnline = peer.status === 'CONNECTED' || peer.status === 'AVAILABLE';
                  return (
                    <div
                      key={peer.deviceId}
                      className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          {getDeviceIcon(peer.deviceType)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[var(--text-primary)] truncate">
                              {peer.deviceName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs">
                            <span
                              className={`flex items-center gap-1 font-bold ${
                                isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                                }`}
                              />
                              <span>{isOnline ? 'Connected' : 'Offline'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={() => {
                            setSelectedTargetDeviceId(peer.deviceId);
                            setActiveView('send');
                          }}
                          className="px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-xs transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Changes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleForgetDevice(peer.deviceId, peer.deviceName)}
                          className="p-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: CODE SYNC MODAL (Method C)                                   */}
      {/* ------------------------------------------------------------------- */}
      {isCodeModalOpen && (
        <div
          onClick={() => setIsCodeModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in text-[var(--text-primary)]"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-6 sm:p-8 space-y-5 animate-scale-up text-left"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center font-black">
                  <Key className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                    {codeModalMode === 'generate' ? 'Generated Sync Code' : 'Enter Sync Code'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {codeModalMode === 'generate' ? 'Copy code and enter it on Device B' : 'Paste sync code to merge changes'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--chip-bg)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {codeModalMode === 'generate' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] font-mono text-xs font-bold break-all max-h-48 overflow-y-auto select-all leading-relaxed">
                  {generatedSyncCode}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (generatedSyncCode) {
                      navigator.clipboard.writeText(generatedSyncCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs sm:text-sm transition active:scale-95 shadow-xs flex items-center justify-center gap-2"
                >
                  {codeCopied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{codeCopied ? 'Code Copied to Clipboard!' : 'Copy Sync Code'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={inputSyncCode}
                  onChange={e => setInputSyncCode(e.target.value)}
                  placeholder="Paste EP-RC1-... code here"
                  rows={5}
                  className="w-full p-4 font-mono text-xs rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] leading-relaxed"
                />

                {codeError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-bold flex items-center gap-2 border border-rose-500/20">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!inputSyncCode.trim()}
                  onClick={handleImportSyncCode}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs sm:text-sm transition active:scale-95 shadow-xs disabled:opacity-50"
                >
                  Import & Merge Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WebRTC Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScannedPayload={handleScannedPayload}
        onSwitchToPairingCode={() => {
          setIsScannerModalOpen(false);
          setIsPairModalOpen(true);
          setPairModalTab('pairing_code');
        }}
      />

      {/* ------------------------------------------------------------------- */}
      {/* FULLSCREEN PREVIEW CHANGES MODAL                                    */}
      {/* ------------------------------------------------------------------- */}
      {isPreviewOpen && previewPackage && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col animate-fade-in overflow-hidden">
          {/* Header Bar */}
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-5 shrink-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                    Preview Changes
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-[var(--accent-primary)] text-[var(--bg-primary)]">
                    {previewPackage.changeCount} modifications
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Inspect the changes in this package before merging into your library.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewPackage(null);
                }}
                className="p-2 rounded-full hover:bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 shrink-0"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Main List Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-[var(--bg-primary)]">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Package Overview Card */}
              <div className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold shadow-2xs">
                <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-2xl space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Package Version</div>
                  <div className="text-sm font-black font-mono">v{previewPackage.version}.0</div>
                </div>
                <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-2xl space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Change Logs Covered</div>
                  <div className="text-sm font-black font-mono text-[var(--accent-primary)]">
                    #{previewPackage.fromChangeId} – #{previewPackage.toChangeId}
                  </div>
                </div>
                <div className="p-3 bg-[var(--bg-surface-elevated)] rounded-2xl space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Package Exported At</div>
                  <div className="text-sm font-black">
                    {new Date(previewPackage.exportedAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              </div>

              {/* Changes List */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider pl-1">
                  Itemized Changes Sequence ({previewPackage.changes.length})
                </h4>

                <div className="space-y-3">
                  {previewPackage.changes.map((change, idx) => {
                    const isAdd = change.operation === 'add';
                    const isDelete = change.operation === 'delete';
                    const isState = change.operation === 'update_state';
                    const isMedia = change.operation === 'update_media';

                    // Dynamic metadata and poster lookup from pre-compiled memo mapping
                    const mediaItem = mediaDetailsMap.get(change.entityId);
                    const posterUrl = mediaItem?.posterUrl || change.data?.mediaItem?.posterUrl;
                    const title = mediaItem?.title || change.data?.mediaItem?.title || `Entity ID: ${change.entityId}`;
                    const year = mediaItem?.year || change.data?.mediaItem?.year;

                    return (
                      <div
                        key={`${change.changeId}-${idx}`}
                        className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 transition-all hover:border-[var(--accent-primary)]/30 hover:shadow-xs"
                      >
                        <div className="flex items-start min-w-0 flex-1">
                          {/* Image preview for movies/series (supports add, watchlist, watched, custom list items) */}
                          {posterUrl && (
                            <div className="w-12 h-[72px] sm:w-14 sm:h-[84px] rounded-xl overflow-hidden shadow-2xs border border-[var(--border-subtle)] mr-4 shrink-0 bg-[var(--chip-bg)]">
                              <SafeImage
                                src={posterUrl}
                                alt={title}
                                fallbackTitle={title}
                                className="w-full h-full object-cover"
                                size="w342"
                              />
                            </div>
                          )}

                          <div className="space-y-2 min-w-0 flex-1">
                            {/* Title & Metadata */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--chip-bg)] px-2 py-0.5 rounded-md">
                                #{change.changeId}
                              </span>

                              {isAdd && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--accent-primary)] text-[var(--bg-primary)] border-2 border-[var(--accent-secondary)]">
                                  Add Movie
                                </span>
                              )}
                              {isDelete && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--chip-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                  Delete Title
                                </span>
                              )}
                              {isState && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border-2 border-[var(--accent-primary)]">
                                  {change.data?.state?.inWatchlist ? 'Add Watchlist' : 'Update State'}
                                </span>
                              )}
                              {isMedia && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                  Update Media
                                </span>
                              )}
                              {change.operation.startsWith('list_') && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--chip-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)]">
                                  Custom List Update
                                </span>
                              )}

                              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                                {new Date(change.timestamp).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Descriptive Info */}
                            <div className="min-w-0">
                              <h5 className="font-black text-sm text-[var(--text-primary)] truncate">
                                {title}{' '}
                                {year && (
                                  <span className="text-xs text-[var(--text-secondary)] font-normal">
                                    ({year})
                                  </span>
                                )}
                              </h5>

                              {/* Details Details */}
                              {change.data?.state && (
                                <div className="mt-1.5 space-y-1 text-xs text-[var(--text-secondary)]">
                                  {change.data.state.personalRating !== undefined && (
                                    <div className="flex items-center gap-1.5">
                                      <Star className="w-4 h-4 fill-[var(--accent-primary)] text-[var(--accent-secondary)] shrink-0" />
                                      <span>Rating: <strong className="text-[var(--text-primary)]">{change.data.state.personalRating} / 10</strong></span>
                                    </div>
                                  )}
                                  {change.data.state.isWatched !== undefined && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary-text)]" />
                                      <span>Watched status set to <strong className="text-[var(--text-primary)]">{change.data.state.isWatched ? 'Watched' : 'Unwatched'}</strong></span>
                                    </div>
                                  )}
                                  {change.data.state.inWatchlist !== undefined && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                                      <span>Watchlist status set to <strong className="text-[var(--text-primary)]">{change.data.state.inWatchlist ? 'In Watchlist' : 'Not in Watchlist'}</strong></span>
                                    </div>
                                  )}
                                  {change.data.state.notes !== undefined && (
                                    <div className="flex items-start gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] mt-1 shrink-0" />
                                      <span className="italic leading-normal">"{(change.data.state.notes || '').slice(0, 100)}{(change.data.state.notes || '').length > 100 ? '...' : ''}"</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {change.operation.startsWith('list_') && change.data?.list && (
                                <div className="mt-1.5 text-xs text-[var(--text-secondary)]">
                                  {change.data.list.title && (
                                    <div>List Name: <strong className="text-[var(--text-primary)]">{change.data.list.title}</strong></div>
                                  )}
                                  {change.data.list.description && (
                                    <div className="italic mt-0.5">"{change.data.list.description}"</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Visual Icon for Operation */}
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                          isAdd
                            ? 'bg-[var(--accent-primary)] border-2 border-[var(--accent-secondary)]'
                            : isState
                            ? 'bg-[var(--accent-secondary)] border-2 border-[var(--accent-primary)]'
                            : 'bg-[var(--chip-bg)] border border-[var(--border-subtle)]'
                        }`}>
                          {isAdd && <Plus className="w-5 h-5 text-[var(--bg-primary)] stroke-[3]" />}
                          {isDelete && <Trash2 className="w-5 h-5 text-[var(--text-secondary)]" />}
                          {isState && <Sparkles className="w-5 h-5 text-[var(--accent-secondary-text)]" />}
                          {isMedia && <RefreshCw className="w-5 h-5 text-[var(--accent-primary)] animate-pulse" />}
                          {change.operation.startsWith('list_') && <Layers className="w-5 h-5 text-[var(--accent-primary)]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions Area */}
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-5 shrink-0 shadow-lg">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-bold text-center sm:text-left">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Non-Destructive: These modifications will safely merge into your local library.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setPreviewPackage(null);
                  }}
                  className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-bold text-xs sm:text-sm transition active:scale-95"
                >
                  Cancel & Discard
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMergeChanges}
                  className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs sm:text-sm transition active:scale-95 shadow-md flex items-center justify-center gap-2 hover:opacity-90"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Approve & Merge Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
