export interface ChangelogPoint {
  title?: string;
  description: string;
  codeSnippet?: string;
}

export interface ChangelogVersion {
  version: string;
  isLatest?: boolean;
  tagline: string;
  points: ChangelogPoint[];
}

export const CHANGELOG_VERSIONS: ChangelogVersion[] = [
  {
    version: 'v2.2.9',
    isLatest: true,
    tagline: 'Fullscreen Preview Changes Window, Detailed Mutation Inspection & Explicit Approve Action',
    points: [
      {
        title: 'Fullscreen Preview Changes Window',
        description: 'Added a dedicated, immersive fullscreen modal allowing users to preview and inspect all incoming library changes before approving the merge.',
      },
      {
        title: 'Itemized Mutation Sequencing',
        description: 'Shows each distinct operation (adds, deletions, state updates) with stable change IDs, operation badges, and exact timestamps.',
      },
      {
        title: 'Pristine Detailed Inspect Cards',
        description: 'Details exact state transitions such as watched status updates, watchlist modifications, stars ratings, and personal notes.',
      },
      {
        title: 'Approve & Merge Action Safeguard',
        description: 'Users must explicitly click "Approve & Merge Changes" or discard the payload to maintain absolute control of their local database.',
      },
      {
        title: 'Universal Integration',
        description: 'Wired seamlessly across both JSON File import and Sync Code pasted inputs.',
      },
      {
        title: 'Non-Destructive Indicators',
        description: 'Displays clear disclaimers explaining how data safety rules protect and merge files rather than overwriting existing records.',
      },
      {
        title: 'Clean Dismiss Controls',
        description: 'Built elegant dismiss controls to cancel, close, or discard change previews at any time.',
      },
    ],
  },
  {
    version: 'v2.2.8',
    tagline: 'Clean & Spacious Change-JSON Layout, Streamlined JSON File & Sync Code Methods',
    points: [
      {
        title: 'Clean & Spacious Change-JSON Layout',
        description: 'Redesigned the Change-JSON interface into a spacious, high-fidelity layout with generous padding, rich typographic hierarchy, and clear visual zones.',
      },
      {
        title: 'Streamlined Transfer Options',
        description: 'Removed QR transfer from the Change-JSON section to streamline operations around robust JSON File and Sync Code transfer methods.',
      },
      {
        title: 'Primary JSON File Transfer Method',
        description: 'Highlighted JSON File Transfer as the recommended primary method with prominent export and import action buttons (.json).',
      },
      {
        title: 'Copyable Sync Code Transfer Option',
        description: 'Provided a dedicated full-width card for generating or entering compressed sync codes (EP-RC1-...).',
      },
      {
        title: 'Real-Time Change Queue Stats',
        description: 'Displayed an itemized stats bar detailing ready unexported changes, last exported checkpoint ID, and total recorded change queue.',
      },
      {
        title: 'Non-Destructive Library Merging',
        description: 'Preserved strict non-destructive merge rules, ensuring imported changes update existing titles without replacing or resetting unrelated library records.',
      },
      {
        title: 'Refined WebRTC Local Wi-Fi Layout',
        description: 'Cleaned up the experimental Local Wi-Fi tab with spacious card surfaces, peer connection badges, and responsive action controls.',
      },
    ],
  },
  {
    version: 'v2.2.7',
    tagline: 'Two-Tab Local Device Hub, Change-JSON Transfer System & Non-Destructive Library Merging',
    points: [
      {
        title: 'Reconstructed Two-Tab Local Device Hub',
        description: 'Separated local device operations into two distinct tabs: Local Wi-Fi (experimental WebRTC P2P sync) and Change-JSON (primary change-transfer system).',
      },
      {
        title: 'Primary JSON File Transfer Method',
        description: 'Introduced direct JSON file export (.json) and file import triggers as the recommended primary method for transferring lightweight library delta changes across devices.',
      },
      {
        title: 'QR Code Change Transfer Option',
        description: 'Added Change QR Code generation with automatic character-length size guards (>1,400 chars) to prevent oversize QR rendering, backed by live camera QR scanning.',
      },
      {
        title: 'Copyable Sync Code Option',
        description: 'Supported compressed sync string generation (EP-RC1-...) and code paste/import, sharing the exact same underlying merge engine.',
      },
      {
        title: 'Strict Non-Destructive Data Safety Guarantee',
        description: 'Enforced non-destructive merging (Existing Library + Imported Changes → Merged Library), ensuring existing movies, ratings, notes, progress, and custom collections are never overwritten or reset.',
      },
      {
        title: 'Centralized Monotonic Change Tracking Engine',
        description: 'Utilized a single unified change tracking engine (recentChanges.ts) with stable change IDs, record deduplication, and device checkpoints.',
      },
      {
        title: 'Zero-Artwork Lightweight Payloads',
        description: 'Stripped heavy poster binaries, cached artwork blobs, and full library snapshots from export files, keeping change payloads microscopic in size.',
      },
    ],
  },
  {
    version: 'v2.2.6',
    tagline: 'Authoritative WebRTC RTCDataChannel Architecture, Persistent Pairing & Auto Reconnection',
    points: [
      {
        title: 'Authoritative WebRTC RTCDataChannel Architecture',
        description: 'Completely reconstructed device transfer layer to use direct browser-to-browser WebRTC DataChannels for all library change syncs.',
      },
      {
        title: 'Dedicated WebRTC Signaling Infrastructure',
        description: 'Converted server endpoints to lightweight signaling channels (/api/signaling/*) for SDP Offer, Answer, and ICE Candidate exchange, eliminating server middleman transfers.',
      },
      {
        title: 'Persistent Local Device Pairing',
        description: 'Saved trusted device credentials persistently in browser storage (localStorage), allowing remembered devices to survive reloads, browser restarts, and PWA relaunches.',
      },
      {
        title: 'Seamless Background Auto-Reconnection',
        description: 'Automatically discovers active trusted peers on local signaling channels and re-establishes WebRTC DataChannels in the background without repeated QR or code scanning.',
      },
      {
        title: 'Real-Time DataChannel Heartbeat Ping/Pong',
        description: 'Implemented active 5-second DataChannel ping/pong health checks to accurately reflect true CONNECTED vs PAIRED / OFFLINE status.',
      },
      {
        title: 'Two-Way Pairing Approval Gate',
        description: 'Preserved dual QR and 6-digit short code pairing authorization workflows with mandatory host confirmation before establishing trusted WebRTC connections.',
      },
      {
        title: 'Idempotent Delta Change Sync & Merge',
        description: 'Transferred compact delta changes exclusively over WebRTC DataChannels, deduplicating incoming updates safely by stable monotonic change IDs.',
      },
      {
        title: 'Zero-Cloud Library Privacy Protection',
        description: 'Ensured movie libraries, ratings, and notes never touch external servers or central databases, executing transfers strictly peer-to-peer.',
      },
    ],
  },
  {
    version: 'v2.2.5',
    tagline: 'Optional QR Code Device Connection, Camera Scanner & Two-Way Approval Gate',
    points: [
      {
        title: 'Ephemeral QR Code Pairing Session Protocol',
        description: 'Introduced a lightweight QR invitation payload carrying short-lived session tokens, device identities, and 60-second expiration timestamps without serializing library data.',
      },
      {
        title: 'Laptop & Desktop "Show My QR" Display Mode',
        description: 'Added high-contrast, scalable QR code rendering on large viewports accompanied by a live countdown timer, fallback 6-digit pairing code, and auto-refresh controls.',
      },
      {
        title: 'High-Performance Camera Scanner via jsQR',
        description: 'Embedded a browser-native camera QR scanner with reticle frame targeting, scan line animation, camera permission recovery, and instant track cleanup.',
      },
      {
        title: 'Non-Trust Pre-Pairing Verification & Two-Way Approval Gate',
        description: 'Implemented explicit two-way confirmation dialogs ("CONNECT TO DEVICE? [Connect] [Cancel]" / "NEW DEVICE REQUEST [Accept] [Reject]") before establishing trusted device relationships.',
      },
      {
        title: 'Permanent Trusted Device Identity Integration',
        description: 'Successfully paired devices via QR are saved persistently in local storage for instant single-tap delta syncs without repeated scanning.',
      },
      {
        title: 'Robust Error Handling & Accessible Fallbacks',
        description: 'Provided clear user messaging for expired QR codes, malformed payloads, and camera access denial, with prominent "Use 6-Digit Code" fallback triggers.',
      },
      {
        title: 'Zero-Cloud Local Privacy Guarantee',
        description: 'All QR pairing tokens and data channels operate strictly over local network signaling and WebRTC DataChannels, keeping library data strictly on your local Wi-Fi.',
      },
    ],
  },
  {
    version: 'v2.2.4',
    tagline: 'Instant Code Pairing Feedback, Dual-Channel Alignment & Code Key Normalization',
    points: [
      {
        title: 'Instant Dual-Channel Code Pairing Alignment',
        description: 'Normalized short pairing keys across HTTP server endpoints and BroadcastChannel messages (stripping spaces/dashes), ensuring instant code verification regardless of formatting.',
      },
      {
        title: 'Server-Side Host & Guest Discovery Auto-Registration',
        description: 'Automatically registers both host and guest device identities into the active local network peers registry immediately upon code connection.',
      },
      {
        title: 'Synchronous In-Memory Pairing Status Cache',
        description: 'Added an instant completed-pairings cache in DeviceTransferEngine so Device A detects Device B connection in under 1 second via BroadcastChannel or local polling.',
      },
      {
        title: 'Interactive Success Feedback on Code Generator (Device A)',
        description: 'Replaced the endless "Waiting for another device..." spinner on Device A with a prominent green confirmation badge and success banner upon guest pairing.',
      },
      {
        title: 'Automatic Code Generation on Modal Launch',
        description: 'Modal automatically generates a fresh pairing code as soon as the "+ Pair Device" modal opens, eliminating manual button clicks.',
      },
      {
        title: 'Faster Status Polling Frequency',
        description: 'Increased code pairing status polling frequency to 1000ms intervals, speeding up confirmation feedback on the code display screen.',
      },
      {
        title: 'Robust Network Recovery on Pairing Session Expiry',
        description: 'Gracefully handles session expiry or invalid entries with clean user error messages and one-tap code regeneration.',
      },
    ],
  },
  {
    version: 'v2.2.3',
    tagline: 'LocalSend-Style App-Wide Wi-Fi Sync, Universal Receiver Popup & Slideshow Default Off',
    points: [
      {
        title: 'Background App-Wide Sync Engine (LocalSend Architecture)',
        description: 'Configured continuous background presence heartbeats and HTTP/BroadcastChannel sync listeners that run globally across the app, ensuring receiving devices discover peers and trigger approval modals anywhere.',
      },
      {
        title: 'Global Incoming Transfer Approval Modal',
        description: 'Universal incoming transfer popup appears automatically regardless of active tab or screen, showing sender device identity, change counts, and itemized change summaries.',
      },
      {
        title: 'Multi-Subscriber Transfer Listener',
        description: 'Refactored DeviceTransferEngine with set-based listener callbacks, preventing screen unmounts or tab switches from interrupting background discovery or sync handlers.',
      },
      {
        title: 'LocalSend-Inspired Radar & Peer Identity Cards',
        description: 'Upgraded DeviceTransferView with animated radar scanning, active device badges, status indicators (Available, Connected, Offline), and single-tap Send Changes workflow.',
      },
      {
        title: 'Slideshow Hidden by Default',
        description: 'Defaulted the Featured Hero Slideshow banner to hidden on fresh installs and default layouts, providing a clean and compact home screen layout.',
      },
      {
        title: 'Shelf Pencil Icon Slideshow Customization',
        description: 'Users can effortlessly re-enable or customize the Hero Slideshow at any time by clicking the shelf pencil customize icon or toggling it in Settings.',
      },
      {
        title: 'Post-Sync In-App Audit Toast',
        description: 'Presents clear toast notifications upon accepting transfers, detailing added titles and updated ratings merged into the local library.',
      },
      {
        title: 'Resilient Network Discovery & Sync Persistence',
        description: 'Maintains active device pairing relationships and auto-recovers background polling when network connectivity drops or reconnects.',
      },
    ],
  },
  {
    version: 'v2.2.2',
    tagline: 'Permanent Device Pairing, Short Human-Friendly Codes & Robust Local Wi-Fi Discovery',
    points: [
      {
        title: 'Continuous Local Wi-Fi Peer Discovery & Heartbeat',
        description: 'Periodically broadcasts local network presence and updates connection states (Available, Connected, Offline, with Last Seen timestamps) without dropping saved pairing relationships.',
      },
      {
        title: 'Short Human-Friendly Pairing Codes (+ Pair Device)',
        description: 'Generates secure short pairing authorizations (e.g. EH-7K4P-92) for instant cross-device authentication even when broadcast discovery is restricted by network firewalls.',
      },
      {
        title: 'Permanent Local Device Pairing Architecture',
        description: 'Saves trusted device credentials locally in browser storage, maintaining status history and enabling direct single-tap delta syncs without repeated code entry.',
      },
      {
        title: 'Interactive Receiver Approval Dialog (Sync Request Received)',
        description: 'Displays an explicit confirmation card on the receiver showing sender details and change counts (new items vs updates), with manual Accept or Decline safety controls.',
      },
      {
        title: 'Exact Post-Sync Audit Breakdown',
        description: 'Presents an itemized import breakdown post-merge (e.g., 12 items added • 3 updates • 0 duplicates) to ensure complete transparency before updating local state.',
      },
      {
        title: 'Robust Network Recovery & Offline Resilience',
        description: 'Gracefully handles temporary Wi-Fi drops and reconnection events, retaining paired devices persistently so temporary disconnects never remove saved peers.',
      },
      {
        title: 'Queued Pending Sync Notifications',
        description: 'Queues incoming transfer proposals safely if the receiver app is backgrounded or busy, presenting the approval modal immediately upon returning.',
      },
    ],
  },
  {
    version: 'v2.2.1',
    tagline: 'Same-Wi-Fi Device Transfer, Local Peer Discovery, Interactive Approval & Zero-Cloud Sync',
    points: [
      {
        title: 'Same-Wi-Fi Local Device Transfer',
        description: 'Replaced QR and manual sync codes with seamless local device-to-device transfer between phones, laptops, and tablets on the same Wi-Fi.',
      },
      {
        title: 'Instant Local Device Discovery',
        description: 'Automatically detects active EHSAAN Play devices on your local network with friendly names and icons, without cloud accounts or central servers.',
      },
      {
        title: 'Dedicated Device Transfer Settings Hub',
        description: 'Added a dedicated Device Transfer section situated prominently above Appearance settings, providing one-tap Send Changes and Receive Changes workflows.',
      },
      {
        title: 'Interactive Incoming Change Approval',
        description: 'Receiving devices display an in-app confirmation card summarizing incoming changes (new movies, ratings, watch status) with explicit Accept or Decline controls.',
      },
      {
        title: 'Zero-Cloud Local Privacy Guarantee',
        description: 'All library transfers remain strictly on your local Wi-Fi network. Your personal journal, notes, and ratings are never sent to external servers.',
      },
      {
        title: 'Idempotent Delta Merge Engine',
        description: 'Transfers only new and modified records, merging them non-destructively by stable entity ID while intelligently preventing duplicate records.',
      },
      {
        title: 'Persistent Friendly Device Identity',
        description: 'Each installation maintains a local device ID and customizable friendly name (e.g., My Phone, Living Room TV) stored directly in browser storage.',
      },
    ],
  },
  {
    version: 'v2.2.0',
    tagline: 'Lightweight Recent Changes Transfer, Real-Time Delta Queue, Single-QR Guard & Safe Merge Engine',
    points: [
      {
        title: 'Lightweight Recent Changes Transfer Engine',
        description: 'Introduced an isolated transfer pipeline operating solely on lightweight delta entries. Your full library is never serialized, scanned, or touched during transfers.',
      },
      {
        title: 'Persistent Monotonic Change-Log Queue',
        description: 'Every meaningful modification (adds, watchlist status, ratings, progress, notes, deletions, and lists) writes an isolated atomic entry with a stable monotonic ID.',
      },
      {
        title: 'Zero-Artwork Compact Transfer Payloads',
        description: 'Excluded heavy image binary data and large artwork from transfer packets, streaming via compact TMDB relative paths so payloads remain microscopic in size.',
      },
      {
        title: 'Defensive Non-Destructive Merge Engine',
        description: 'Imported transfers merge safely by permanent entity ID, preserving all existing records and intelligently skipping duplicate additions.',
      },
      {
        title: 'Triple Transfer Modalities',
        description: 'Choose between high-density single QR codes, compressed copyable sync codes (EP-RC1-...), or compact recent-changes JSON export files.',
      },
      {
        title: 'Single-QR Size Protection Guard',
        description: 'Monitors payload character length before rendering; alerts and reroutes transfers exceeding 1,400 characters to Copyable Code or JSON instead of splitting into endless codes.',
      },
      {
        title: 'Built-in Camera QR Scanner & Photo Decoder',
        description: 'Added a live camera scanner with auto-reticle targeting and instant QR screenshot upload decoding, enabling device-to-device transfers in seconds.',
      },
      {
        title: 'Multi-Device Checkpoint Architecture',
        description: 'Implemented device-specific checkpoints (e.g., Phone, Tablet, TV), allowing you to transfer only changes made since each specific device was last synced.',
      },
    ],
  },
  {
    version: 'v2.1.8',
    tagline: 'High-Res Slideshow Backdrops, Zero-Gap Breakouts, Delicate Local Vignette & Tactile Targets',
    points: [
      {
        title: 'Bulletproof Edge-to-Edge Breakout',
        description: 'Replaced conflicting horizontal positioning with a bulletproof relative centering transform, completely eliminating border gaps and empty layout spaces on ultra-wide screens.',
      },
      {
        title: 'Original-Resolution Backdrop Stream',
        description: 'Upgraded background artwork loading in the hero slideshow to retrieve original full-bleed TMDB resolutions, preventing pixelation or blurring on 4K/retina monitors.',
      },
      {
        title: 'Transparent Image Canvas Fallback',
        description: 'Hardcoded strict transparent backgrounds on image containers inside the slideshow, eradicating light-colored theme bleeding during initial loading states or active transitions.',
      },
      {
        title: 'Delicate Localized Vignette',
        description: 'Adjusted the cinematic gradients to softly darken only the left text zone and bottom control strip, leaving the remaining areas of the backdrop clear and vivid.',
      },
      {
        title: 'Enlarged Action Button Target',
        description: 'Increased the tactile click target and width of the watchlist button in the icon-only preview modal view for enhanced mobile ergonomics.',
      },
      {
        title: 'Vibration Feedback Calibrator',
        description: 'Refined haptic feedback triggers across long-press gestures, delivering smooth physical pulses on compatible touch devices.',
      },
      {
        title: 'Performance Layout Optimizations',
        description: 'Restructured image pre-loading within the slideshow loop, dramatically reducing layout shifts and render delays on mobile browsers.',
      },
    ],
  },
  {
    version: 'v2.1.7',
    tagline: 'Hero Customizer Pencil Tool, Fullscreen vs Card View Modes & Real-Time Opacity Slider',
    points: [
      {
        title: 'Hero Slideshow Minimal Pencil Customizer',
        description: 'Added a top-right pencil tool (accessible on hover or long-press) to dynamically configure display modes and visual fog.',
      },
      {
        title: 'Edge-to-Edge Fullscreen & Card View Modes',
        description: 'Introduced layout switching between standard rounded card containers and full-bleed edge-to-edge cinematic hero displays.',
      },
      {
        title: 'Real-Time Dark Fog Opacity Controller',
        description: 'Provided an interactive slider to calibrate vignette opacity from 0% (pure untouched artwork) to 100% (maximum contrast fog).',
      },
      {
        title: 'Haptic Long-Press Banner Trigger',
        description: 'Added tactile long-press gesture recognition on the slideshow canvas to quickly invoke the customization popover.',
      },
      {
        title: 'Persistent Slideshow Layout Storage',
        description: 'Synced customizer display preferences and opacity levels directly to local browser storage across sessions.',
      },
      {
        title: 'Zero-Gap Fullscreen Flush Placement & Seamless Header Edge',
        description: 'Eliminated empty top padding when fullscreen hero mode is active, smoothly anchoring the backdrop artwork directly beneath the sticky top navigation bar.',
      },
      {
        title: 'Reset Defaults Action',
        description: 'Added one-tap restoration to reset opacity and layout back to factory defaults.',
      },
      {
        title: 'Cinema Shelf Slideshow Visibility Toggle',
        description: 'Integrated a direct on/off switch for the Featured Hero Slideshow inside the Home shelf customize popover (pencil icon), allowing instant one-tap toggling.',
      },
    ],
  },
  {
    version: 'v2.1.6',
    tagline: 'Featured Hero Slideshow Banner, Universal Dark Fog, Tips & Tricks Guide & Expanded Action Buttons',
    points: [
      {
        title: 'Cinematic 5-Title Hero Slideshow Banner',
        description: 'Added an expansive, auto-rotating hero showcase at the top of the Home view featuring 5 recently added or highlighted titles with high-definition backdrop artwork, smooth transitions, and instant play/detail triggers.',
      },
      {
        title: 'Localized Soft Text Fog & Crystal-Clear Artwork',
        description: 'Refined the hero slideshow vignette to softly darken only the specific text region on the lower-left while preserving full brightness and vivid clarity across the rest of the backdrop artwork.',
      },
      {
        title: 'Tips & Tricks Guide in Settings',
        description: 'Introduced a dedicated 2-column Material Expressive guide in Settings with curated actionable cards for gestures, customizers, and shortcuts.',
      },
      {
        title: 'Mobile-Optimized Preview Surface',
        description: 'Disabled heavy hero background artwork on mobile viewports while preserving cinematic full-bleed backdrops on tablet and desktop displays.',
      },
      {
        title: 'Expanded Watchlist Icon Button Geometry',
        description: 'Increased the horizontal touch target and width of the Add to Watchlist button in preview icon-only mode for effortless one-handed tapping.',
      },
      {
        title: 'Home Shelf Pencil Edit Quick Tip',
        description: 'Documented the floating home customizer tool allowing users to rearrange and toggle Top 10 rails and continue watching carousels.',
      },
      {
        title: 'Tactile Long-Press Gesture Directory',
        description: 'Detailed the 4-button quick menu card gesture and the long-press search bar layout exchange in the interactive tips catalog.',
      },
      {
        title: 'Rapid 3-Tap Watch Status Guidance',
        description: 'Visualized the 3-state cycling sequence across Watched, Watching, and Reset status in the new settings guide.',
      },
      {
        title: 'Settings Navigation Re-Indexing',
        description: 'Added the Tips & Tricks section to the main settings category list with responsive tablet and mobile view transitions.',
      },
    ],
  },
  {
    version: 'v2.1.5',
    tagline: 'Dynamic Search & Lists Position Exchange, Minimalist Quick Actions & 3-Cycle Watch Status',
    points: [
      {
        title: 'Dynamic Search & Custom Lists Position Exchange',
        description: 'Introduced an interactive long-press gesture on the top search bar (with tactile vibration and a Material Expressive confirmation dialog) allowing users to exchange positions between Search and Custom Lists across the top header and bottom navigation bar.',
      },
      {
        title: 'Bi-Directional Navigation Layout Re-Indexing',
        description: 'Engineered persistent layout reconfiguration enabling seamless single-tap searches from the mobile bottom bar and quick list access from the header corner, fully toggleable via long-press or settings.',
      },
      {
        title: 'Minimalist 4-Button Long-Press Action Menu',
        description: 'Replaced detached focus modals with a compact, tactile action sheet featuring direct buttons for Watchlist, Watch Status, Add to List, and Removal.',
      },
      {
        title: 'Stage Text Elimination for Clean Typography',
        description: 'Removed cluttered stage indicators and progress labels from quick action overlays to keep typography minimal and distraction-free.',
      },
      {
        title: 'Intuitive 3-Tap Watch Status Cycler',
        description: 'Streamlined the watch status button to cycle smoothly through Watched (1st tap), Watching (2nd tap), and Reset (3rd tap) with distinct dynamic accents.',
      },
      {
        title: 'Inline Custom List Picker Expansion',
        description: 'Designed a seamless accordion inside the long-press menu to add or remove media from personal collections without navigating away.',
      },
      {
        title: 'High-Visibility Crimson Quick Remove Action',
        description: 'Standardized the quick deletion trigger with deep blood red styling (#7F1D1D) for unmistakable destructive intent.',
      },
      {
        title: 'Responsive Poster Touch Geometry',
        description: 'Fine-tuned touch cancellation thresholds and drag-prevention to prevent accidental long-press triggers during fast scrolling on mobile viewports.',
      },
      {
        title: 'Unified Surface Elevation & Border Sync',
        description: 'Synchronized the quick actions container with the active theme background, subtle borders, and smooth entrance scale animations.',
      },
    ],
  },
  {
    version: 'v2.1.4',
    tagline: 'Universal Dark Backdrop Fog, Responsive Developer Notice & Sequential Versioning',
    points: [
      {
        title: 'Universal Dark Backdrop Fog Engine',
        description: 'Re-engineered the preview hero artwork container to always use a solid deep black base and rich directional vignette, preventing white fogging in light themes when reducing opacity.',
      },
      {
        title: 'Responsive Notice Layout',
        description: 'Streamlined the developer examination notice on mobile and tablet displays by hiding secondary header text and focusing on clear notice copy and contact actions.',
      },
      {
        title: 'Chronological Sequential Release Archive',
        description: 'Restructured all historical changelog releases to follow an intuitive incremental versioning system (v2.0.0 through v2.1.4).',
      },
      {
        title: 'Instant Contact Channel Routing',
        description: 'Verified direct mailto links to worsmon@proton.me across all notice modals, about views, and support triggers.',
      },
      {
        title: 'High-Contrast Hero Backdrop Controls',
        description: 'Enhanced the real-time opacity slider in the Preview Customizer to transition fluidly between pure artwork clarity and deep cinematic blackness.',
      },
      {
        title: 'Zero-Artifact Image Fallback System',
        description: 'Ensured image fade and backdrop transitions preserve hardware acceleration across desktop and standalone PWA displays.',
      },
      {
        title: 'Clean Initialization Guard',
        description: 'Maintained clean start states for new users with instant storage validation.',
      },
    ],
  },
  {
    version: 'v2.1.3',
    tagline: 'Examination Hiatus Notice, Material Expressive Pure White Surfaces & Mint Contrast Refinement',
    points: [
      {
        title: 'Academic Examination Notice & Secondary Contact Action',
        description: 'Placed a distinguished crimson announcement at the top of the version history notes stating development pause until December 2026 for examinations, accompanied by a direct feedback contact action.',
      },
      {
        title: 'Minimalist Notice Typography & Streamlined Banner Layout',
        description: 'Cleaned up the developer hiatus notice by removing extraneous graphic icons, focusing entirely on high-legibility typographic hierarchy and quick contact access.',
      },
      {
        title: 'Pure White Material Expressive Settings Containers',
        description: 'Configured all inner settings category containers to pristine white (#FFFFFF) for light modes to provide clean Material Expressive surface contrast and visual separation.',
      },
      {
        title: 'Mint Palette Deep Blood Red Complementary Contrast',
        description: 'Upgraded secondary interactive accents in the Mint Green color scheme to deep blood red across all themes for enhanced visual hierarchy and legibility.',
      },
      {
        title: 'Home Hero Movie Shelf Mint Theme Synchronization',
        description: 'Harmonized the personal cinema shelf library statistics banner to render in soothing Mint Green while reserving rich dark red for interactive controls and counters.',
      },
      {
        title: 'Filled Dark Blood Red Destructive Buttons Standard',
        description: 'Standardized all removal, list deletion, note clearing, and data reset buttons across the app with filled dark blood red styling for clear intent.',
      },
      {
        title: 'Watchlist Random Pick Secondary Color Accentuation',
        description: 'Refined the Random Pick movie button on the watchlist view to dynamically render in the active secondary theme color.',
      },
      {
        title: 'Clean-Slate Watchlist Initialization',
        description: 'Removed all preloaded dummy movies from the watchlist state to deliver a completely pristine, personalized canvas for users starting fresh.',
      },
      {
        title: 'Updated Official Developer Contact Channel',
        description: 'Switched the primary inquiry, feedback, and bug reporting email channel to worsmon@proton.me across all notice banners and about cards.',
      },
      {
        title: 'Mobile-Optimized Icon-Only Action Bar & Backdrop Toggle',
        description: 'Simplified preview modal hero actions on mobile displays into tactile circular icon buttons and disabled heavy background artwork on small viewports by default.',
      },
    ],
  },
  {
    version: 'v2.1.2',
    tagline: 'Default Watchlist Seeding, Material Typeface, Theme-Synced Modals & Dark Crimson Actions',
    points: [
      {
        title: 'Full-Width Material 3 Color Palette Swatches',
        description: 'Optimized the Appearance color scheme selector rail into a cohesive edge-to-edge grid layout, seamlessly distributing all 6 Material theme palettes without awkward overflow or extra empty space.',
      },
      {
        title: 'Complete Theme Synchronization for Modals & Empty States',
        description: 'Overhauled the empty watchlist and collections states, update notification cards, and the version changelog modal to fully use dynamic theme tokens across Warm Cream, Dark Olive, and OLED Black modes.',
      },
      {
        title: 'Initial 10-Title Watchlist Auto-Seeding',
        description: 'Configured default state initialization to automatically populate 10 diverse, top-rated movies into the watchlist for first-time library setups.',
      },
      {
        title: 'Google Sans Flex App-Wide Default Typeface',
        description: 'Updated the default typography system configuration across the entire app to Google Sans Flex for crisp Material 3 typography.',
      },
      {
        title: 'Mobile-Optimized Preview Background & Icon-Only Action Buttons',
        description: 'Turned off heavy background backdrop artwork in the movie preview modal exclusively on mobile screens by default, and streamlined all preview action buttons into clean, tactile icon-only circular controls.',
      },
      {
        title: 'Secondary Theme Color for Watchlist Random Pick',
        description: 'Updated the Watchlist Random Pick trigger button to render in the active secondary theme accent color for prominent, harmonious visual balance.',
      },
      {
        title: 'Filled Dark Blood Red Delete & Clear Actions',
        description: 'Standardized all destructive actions—including Delete All Data, Delete Collection, Remove from Shelf, and Clear Notes—with filled dark blood red styling for clear, unmistakable intent.',
      },
      {
        title: 'Mint Palette Deep Blood Red Contrast Upgrade',
        description: 'Replaced matching pale mint secondary tones with a rich, deep blood red secondary color across Light Cream, Dark, and OLED Black modes for striking complementary contrast and visual hierarchy.',
      },
      {
        title: 'Home Hero Movie Count Card Mint Theme Harmonization',
        description: 'Refined the home page hero library stats shelf card to display in crisp, soothing Mint Green across all display modes while preserving deep blood red for secondary interactive buttons and badges.',
      },
      {
        title: 'Pure Clear White Material Expressive Card Surfaces',
        description: 'Configured the inner settings and category card containers to pure clear white (#FFFFFF) across all Light/Cream modes for high-fidelity Material Expressive contrast, elevation, and visual hierarchy.',
      },
    ],
  },
  {
    version: 'v2.1.1',
    tagline: 'Ultra-Minimal Controls, Immersive Fullscreen, and Instant Theme Syncing',
    points: [
      {
        title: 'Ultra-Minimal Controls Popup',
        description: 'Redesigned the long-press controls popup to be ultra-clean and compact: removed bulky live badges, simplified the header layout, and organized controls into elegant list elements.',
      },
      {
        title: 'Robust 3-State Watch Status Integration',
        description: 'Completed the watch status state cycle integration across all shelves, lists, and collections views, making the cycle button fully functional on all list views.',
      },
      {
        title: 'Dynamic Footer Showcase Theme Fix',
        description: 'Fixed the footer GitHub showcase styling by applying complementary dynamic yellow variables for high visibility on dark and OLED themes, preventing blending issues.',
      },
      {
        title: 'Instant Loading Screen Theme Syncing',
        description: 'Injected a fast-loading, blocking inline script into index.html to read saved settings and apply theme attributes immediately, preventing white flashes on page reload.',
      },
      {
        title: 'Immersive Standalone Fullscreen PWA',
        description: 'Modified Web App Manifest options to default to "fullscreen" display, allowing standalone app instances to launch borderless with hidden system status bars.',
      },
      {
        title: 'Body Overscroll Theme Transition',
        description: 'Removed hardcoded light background classes from the HTML body tag, allowing the main viewport and browser overscroll areas to transition smoothly based on the active theme.',
      },
      {
        title: 'Favicon & PWA Icon Refresh Cache-Buster',
        description: 'Incremented static query cache-busting parameters on manifest links and bumped the service worker shell cache version to trigger immediate browser icon refreshes.',
      },
      {
        title: 'Refreshing Mint & Sage Material Palette',
        description: 'Introduced a beautiful new Material Design 3 Minty Green color scheme, dynamically integrated across standard Warm Cream, Dark, and OLED Black display modes.',
      },
      {
        title: 'Theme-Synced Empty Watchlist UI',
        description: 'Replaced hardcoded olive elements and buttons in the empty watchlist section with dynamic CSS variables, allowing seamless synchronization with selected themes.',
      },
      {
        title: 'Theme-Synced App Update Notifications',
        description: 'Completely overhauled the native update notification card, transitioning all hardcoded backgrounds, borders, badges, loader icons, and buttons to responsive theme tokens.',
      },
    ],
  },
  {
    version: 'v2.1.0',
    tagline: 'Vibrant Material Themes, 3-State Watch Status & Mobile Preview Enhancements',
    points: [
      {
        title: 'Mobile Movie Poster Aspect Size Enhancement',
        description: 'Increased movie poster artwork dimensions in the preview modal hero section exclusively for mobile screens, creating a richer, prominent visual anchor.',
      },
      {
        title: '3-State Watched Status Cycle & Minimal Popup UI',
        description: 'Streamlined the long-press popup window into a minimal card and upgraded the watch status button to cycle seamlessly: 1st click "Watched", 2nd click "Watching", and 3rd click "Reset Status".',
      },
      {
        title: 'Vibrant Pink & Purple Material Color Schemes',
        description: 'Introduced two new Material 3 color palettes (Soft Coral Pink & Lavender Purple) seamlessly integrated across Light Warm Cream, Dark Olive, and OLED Black display themes.',
      },
      {
        title: 'Fullscreen PWA & System Status Bar Hiding',
        description: 'Updated web app manifest with "display": "fullscreen" and "orientation": "any" alongside black-translucent WebKit meta tags to hide the system status bar for edge-to-edge cinematic display.',
      },
      {
        title: 'Streamlined Check Update Interface',
        description: 'Removed the redundant app logo graphic from the Check for Updates section in Settings for a clean, minimalist application status card.',
      },
      {
        title: 'Responsive Hero Layout Optimization',
        description: 'Optimized hero information hierarchy and left-anchored poster artwork scaling across mobile, tablet, and desktop viewports.',
      },
      {
        title: 'Footer Showcase Theme Token Fix & Opposite Developer Links Color',
        description: 'Replaced hardcoded hex colors in the footer GitHub showcase with dynamic theme variables and updated the social link icons below the Lead Developer area to use complementary opposite card colors synced across all theme palettes.',
      },
      {
        title: 'Force Fullscreen OS Mode & Standalone PWA Manifest',
        description: 'Optimized Web App Manifest with "display": "standalone" and "display_override" fallback array, and introduced a 1-tap Force Fullscreen OS Mode toggle in the topbar and Settings to expand UI edge-to-edge on demand.',
      },
      {
        title: 'Loading Screen & About App Logo Theme Synchronization',
        description: 'Synchronized the loading screen layout with dynamic theme variable tokens, and upgraded the About section logo with a high-fidelity inline SVG clapperboard that live-syncs color palettes dynamically in real-time.',
      },
      {
        title: 'Pink Clapperboard PWA Icon & Favicon Update',
        description: 'Overwrote system-level favicons, apple touch icons, and standalone app drawer launcher icons with the custom pink clapperboard squircle logo while preserving dynamic color-changing logo showcases inside the app settings, loading screen, and footers.',
      },
    ],
  },
  {
    version: 'v2.0.9',
    tagline: 'Clean Immersive Poster Artwork & Long-Press Controls Modal',
    points: [
      {
        title: 'Clean Immersive Card Artwork',
        description: 'Removed all overlaid action buttons from movie album poster images for an uninterrupted, edge-to-edge mobile and desktop viewing experience.',
      },
      {
        title: 'Tactile Long-Press Controls Modal',
        description: 'Added a mobile-optimized popup window triggered on long-press (450ms hold) or right-click on any movie or series card.',
      },
      {
        title: 'Integrated Quick Action Panel',
        description: 'Packed the long-press controls popup with full status toggles: Add/Remove Watchlist, Mark Watched, Favorite status, and direct navigation.',
      },
      {
        title: 'Haptic Feedback & Scroll Safety',
        description: 'Integrated native haptic vibration (navigator.vibrate) upon long-press activation and scroll-cancellation logic to ensure page scrolling remains fluid.',
      },
      {
        title: 'Universal Card Gesture Engine',
        description: 'Embedded long-press gesture support across Home rails, Top 10 rankings, Explore recommendations, Watchlist grids, and Custom Collections.',
      },
      {
        title: 'Direct Details Navigation',
        description: 'Included a prominent "Open Full Title Details" action inside the long-press modal for fast access to full cinematic details.',
      },
    ],
  },
  {
    version: 'v2.0.8',
    tagline: 'Unified Settings Changelog Hub, M3 Grouped Cards & Direct Navigation',
    points: [
      {
        title: 'Unified In-App Changelog Hub',
        description: 'Integrated the complete changelog directly into Settings > EHSAAN PLAY as the dedicated single source of truth for all release notes.',
      },
      {
        title: 'Direct In-App Navigation',
        description: 'Clicking changelog triggers across footers and about cards now seamlessly routes straight into the Settings > EHSAAN PLAY changelog view.',
      },
      {
        title: 'Streamlined Release Cards',
        description: 'Removed redundant fullscreen modal triggers from release cards in favor of a clean, distraction-free inline viewing experience.',
      },
      {
        title: 'Material 3 Grouped Settings',
        description: 'Unified all settings categories into cohesive M3 grouped surfaces with tactile checkmark switches and color swatch rails.',
      },
      {
        title: 'Tactile M3 Switches & Bubble Toggles',
        description: 'Replaced text-heavy settings with clean bubble selectors, sliders, and animated checkmark switches.',
      },
      {
        title: 'Timeless Date-Free Release Archive',
        description: 'Retained clean, timeless version records with expandable historical archives.',
      },
      {
        title: 'GNU GPL-3 License & Developer Attributions',
        description: 'Updated developer attribution to EHSAAN ULLAH and linked license terms directly to GNU General Public License v3.0 (GPL-3).',
      },
      {
        title: 'Universal Theme Logic & Default Olive Restoration',
        description: 'Preserved the signature Olive & Yellow character theme with a dedicated "Default" button alongside the Orange and Blue color palettes.',
      },
      {
        title: 'Material 3 Tactile Sliders & Squircle Palette Rail',
        description: 'Implemented Android Expressive thick-track tactile sliders with vertical line thumbs and a horizontal squircle color rail designed for future palette additions.',
      },
      {
        title: 'Selected Swatch Tick Icon & Preview Artwork Theme Adaptation',
        description: 'Replaced selected color swatch ring outlines with a sleek checkmark icon badge in Settings, and unified Preview Window theme tokens across artwork toggle states.',
      },
    ],
  },
  {
    version: 'v2.0.7',
    tagline: 'Google Sans Flex Variable Typography, Font Customizer & Clean Mobile Settings',
    points: [
      {
        title: 'Material 3 Grouped Settings Architecture',
        description: 'Re-architected all settings screens into unified M3 grouped card surfaces with tactile checkmark switches, segmented bubble selectors, and color swatch bars.',
      },
      {
        title: 'Typography Customizer in Tweaks',
        description: 'Added dedicated typography selector in UI Tweaks supporting Default (Plus Jakarta Sans) and Google Sans Flex.',
      },
      {
        title: 'Google Sans Flex Variable Typography',
        description: 'Integrated authentic Google Sans Flex variable typography applied universally across all shelves, previews, cards, and navigation.',
      },
      {
        title: 'Interactive Typeface Previews',
        description: 'Real-time font sample preview cards with visual active checkmarks and adaptive theme token badges.',
      },
      {
        title: 'Coming More Font Roadmap Banner',
        description: 'Added upcoming typeface preview hint for future font additions (Cabinet Grotesk, Inter Tight, Satoshi, Literata).',
      },
      {
        title: 'Instant Local Font Persistence',
        description: 'Selected typeface preferences save instantly into local storage and persist seamlessly across offline sessions.',
      },
      {
        title: 'Dynamic Font Token Architecture',
        description: 'Configured high-performance --font-sans CSS variable engine ensuring smooth fallback without layout shift.',
      },
      {
        title: 'Tactile M3 Switches & Bubble Toggles',
        description: 'Replaced cluttered multi-card blocks with compact, zero-noise bubble pills, sliders, and animated checkmark switches.',
      },
      {
        title: 'Streamlined Date-Free Changelog',
        description: 'Removed date timestamps across all historical versions for a timeless, minimal release showcase.',
      },
    ],
  },
  {
    version: 'v2.0.6',
    tagline: 'Modular Settings Hub, Embedded Changelog & Desktop Sidebar Navigation',
    points: [
      {
        title: 'Material 3 Modular Settings Hub',
        description: 'Grouped all preferences behind dedicated topic cards (App Specs, Storage & Offline, Appearance, Tweaks, TMDB, Shortcuts, Backup, About).',
      },
      {
        title: 'Dedicated Mobile Topic Sub-Pages',
        description: 'Tapping any settings category on mobile opens a dedicated, distraction-free page with smooth top-bar back navigation (< Settings).',
      },
      {
        title: 'Master-Detail Desktop Sidebar',
        description: 'Transformed desktop and tablet settings into a dual-pane layout with a sticky left category sidebar and full-canvas active setting controls.',
      },
      {
        title: 'Contextual Breadcrumb Tracking',
        description: 'Main canvas features real-time category path indicators (Settings / Topic) for effortless orientation.',
      },
      {
        title: 'Fluid Scroll & Transition Management',
        description: 'Switching between topics automatically resets scroll position to the top of the canvas on all devices for optimal focus.',
      },
      {
        title: 'Live Category Status Badges',
        description: 'Topic cards showcase real-time settings values directly in their subtitles (active theme name, artwork cache size, storage volume).',
      },
      {
        title: 'EHSAAN PLAY Section Changelog Card',
        description: 'Embedded an interactive changelog showcase directly within the primary EHSAAN PLAY settings section styled consistently with GitHub showcase cards.',
      },
      {
        title: 'Yellow Expand Arrow for Version Archive',
        description: 'Integrated an interactive warm yellow chevron toggle to seamlessly expand and explore the full archive of historical releases directly within the view.',
      },
      {
        title: 'Full-Flow Scrollable Changelog Modal',
        description: 'Re-architected modal to allow header and descriptions to scroll naturally with the content, unlocking full screen reading height on mobile displays.',
      },
      {
        title: 'Filled Yellow Circle Navigation Arrows',
        description: 'Enhanced all settings category cards and sidebar navigation with distinctive filled warm yellow circular arrow badges.',
      },
    ],
  },
  {
    version: 'v2.0.5',
    tagline: 'M3 Dark Theme Cards, Preview Customizer & Reflections Journal',
    points: [
      {
        title: 'Dark Theme Olive & Yellow Refinement',
        description: 'Softened dark theme card colors to --dark-olive: #464825 and --dark-yellow: #AA9034 to eliminate harsh brightness in dark environments.',
      },
      {
        title: 'Material 3 Adaptive Typography',
        description: 'Card text and icons dynamically adapt with high-contrast on-container tokens (#E9EFC8 and #FFF3D1) preserving WCAG AAA readability.',
      },
      {
        title: 'Desktop & Tablet Top-Right List Trigger',
        description: 'Shifted Add to List action into a sleek top-right icon button with quick collection selector on desktop and tablet viewports.',
      },
      {
        title: 'Enhanced Multi-Line Reflections Journal',
        description: 'Redesigned personal notes with multi-line writing space, live word/character counters, quick-clear action, and instant save status indicators.',
      },
      {
        title: 'Preview Button Format Customization',
        description: 'Added instant toggle in Preview Customizer to switch hero action buttons between full text and sleek icon-only modes.',
      },
      {
        title: 'Granular Action Button Visibility Toggles',
        description: 'Added customizer controls to individually show or hide Favorite, Add to List, Watched/Watching, and Watchlist buttons.',
      },
      {
        title: 'Pristine Light Theme Preservation',
        description: 'Maintained original warm cream palette (#CAD893 and #FEDB99) without altering any light mode visuals.',
      },
      {
        title: 'Continue Watching Harmonization',
        description: 'Continue Watching horizontal album cards now seamlessly adopt theme variables with adaptive dark yellow progress bars.',
      },
      {
        title: 'Universal Theme Component Alignment',
        description: 'Updated Explore filters, preview modal status badges, ranking rail controls, and footer badges to full theme responsiveness.',
      },
    ],
  },
  {
    version: 'v2.0.4',
    tagline: 'UI Tweaks, Watchlist Actions & Experience Polish',
    points: [
      {
        title: 'Auto-Hiding Scroll Topbar',
        description: 'Header topbar now smoothly hides on scroll down to maximize viewport space and slides back into view when scrolling up across all screens.',
      },
      {
        title: 'Settings Interface Tweaks',
        description: 'Added a dedicated "Tweaks" card with pill-shape switches to configure scroll-hide behavior and animation dynamics.',
      },
      {
        title: 'Watchlist Quick-Remove',
        description: 'Added top-left cross button (✕) on poster hover for desktop and persistent mobile tap for rapid watchlist management.',
      },
      {
        title: 'Filter-Aware Watchlist Defaults',
        description: 'Default watchlist view presents active unwatched titles, while watched items stay organized under the filter sheet.',
      },
      {
        title: 'Direct Top 10 Watchlist Addition',
        description: 'Plus (+) button on Top 10 movie and series rails now directly adds items to the library in a single tap.',
      },
      {
        title: 'Continue Watching Cover Streamlining',
        description: 'Removed play icon overlay on Continue Watching album cards for unobstructed poster viewing.',
      },
      {
        title: 'Instant Cache Cleaner Button',
        description: 'Added a one-click action in Storage & Backup to safely clear cached posters, backdrops, and queries.',
      },
      {
        title: 'Animated Version Checker',
        description: 'PWA check version button now features smooth rotation feedback and real-time status messaging.',
      },
      {
        title: 'Themed Light Olive Changelog',
        description: 'Formatted all historical version tags in crisp light olive (#E4EAB8) for visual consistency.',
      },
      {
        title: 'Updated GitHub Repository & Backup Naming',
        description: 'Connected showcase link to github.com/ehsaanullah0/ehsaanplay and streamlined backup JSON filenames.',
      },
    ],
  },
  {
    version: 'v2.0.3',
    tagline: 'PWA Update System, Footer & UI Polish',
    points: [
      {
        title: 'Built-In PWA Update System',
        description: 'Integrated Service Worker version detection and instant update trigger directly in Settings with safe background cache revalidation.',
      },
      {
        title: 'Minimal Footer Showcase',
        description: 'Added a clean, minimal footer displaying open-source statement, GitHub showcase, and quick support links.',
      },
      {
        title: 'Two Grid View in Settings',
        description: 'Refactored Settings cards into a 2-column masonry waterfall layout with an icon-only view toggle (Rows vs Grid).',
      },
      {
        title: 'Added & Improved Explore Section',
        description: 'Enhanced dynamic TMDB discovery recommendations on the Home page with zero-network fallback safety.',
      },
      {
        title: 'New Warm Yellow UI Accents',
        description: 'Introduced rich warm yellow accents (#FEDB99) across Continue Watching cards, active favorite highlights, and support buttons.',
      },
      {
        title: 'OLED Black High-Contrast Mode',
        description: 'Engineered true black background (#000000) for OLED panels with enhanced contrast readability.',
      },
    ],
  },
  {
    version: 'v2.0.2',
    tagline: 'Major UI Polish & Feature Suite',
    points: [
      {
        title: 'Tomato FOSS Aesthetic Splash Screen',
        description: 'Designed a warm, minimal app loading page with line-art clapperboard logo and pulsing status pill.',
      },
      {
        title: 'Masonry Waterfall Settings Layout',
        description: 'Transformed Settings grid into a responsive multi-column waterfall layout that eliminates empty vertical gaps.',
      },
      {
        title: 'Light Olive Color Theme Accents',
        description: 'Re-styled the Main Library Count Card (Your Cinema Shelf) and Random Pick button to light olive (#E4EAB8).',
      },
      {
        title: 'Horizontal Album Continue Watching',
        description: 'Redesigned Continue Watching cards into horizontal movie album cards with borderless yellow containers (#FEDB99) and dark yellow progress bars.',
      },
      {
        title: 'Mobile Preview Customizer & Artwork',
        description: 'Enabled background artwork visibility on mobile devices and centered customizer popover for small screens.',
      },
      {
        title: 'Yellow Favorite Active State',
        description: 'Favorited titles now highlight with a rich warm yellow badge (#FEDB99 / #624B15).',
      },
      {
        title: 'Bidirectional TV Episode Syncing',
        description: 'Marking series watched or moving progress slider automatically completes season and episode checkboxes.',
      },
      {
        title: 'Merged Overview & Production Details',
        description: 'Display full synopsis paragraph without line-clamp truncation alongside merged production metadata.',
      },
      {
        title: 'Custom Keyboard Shortcuts',
        description: 'Configurable keybindings for Back, Home, Watchlist, Search, and Custom Lists in Settings.',
      },
      {
        title: 'Enhanced Offline Artwork Loading',
        description: 'Multi-size fallback lookup across caches ensures pre-cached artwork loads 100% reliably offline.',
      },
    ],
  },
  {
    version: 'v2.0.1',
    tagline: 'Offline Artwork Engine & UI Streamlining',
    points: [
      {
        title: 'Open Source GitHub Showcase',
        description: 'Added interactive GitHub showcase link (github.com/ehsaanullah0/ehsaanplay) with live repository details.',
      },
      {
        title: 'Header Search Bar Streamlining',
        description: 'Cleaned up header search bar by removing shortcut badge icon for a clutter-free navigation experience.',
      },
      {
        title: 'Cache Pre-Fetching Engine',
        description: 'Integrated complete library artwork pre-fetching to ensure zero missing posters during full offline usage.',
      },
      {
        title: 'Custom TMDB API Health Diagnostics',
        description: 'Built-in real-time connection diagnostic tester measuring latency and endpoint reachability.',
      },
      {
        title: 'Selective Backup JSON Export',
        description: 'Streamlined backup export and restore engine with validation safety checks.',
      },
      {
        title: 'Adaptive Material Design Tokens',
        description: 'Unified theme token architecture across all layout rails and preview modals.',
      },
    ],
  },
  {
    version: 'v2.0.0',
    tagline: 'Local-First Architecture & Cinema Shelf Initial Release',
    points: [
      {
        title: 'Local-First PWA Foundation',
        description: 'Engineered complete offline-capable progressive web application with IndexedDB and Cache Storage.',
      },
      {
        title: 'Full TMDB Catalog Integration',
        description: 'Live catalog searching, trending movies, TV series, recommendations, and custom collections.',
      },
      {
        title: 'Personal Reflections & Star Ratings',
        description: 'Private movie journal with personalized notes, quick rating stars, and custom collection management.',
      },
      {
        title: 'Watchlist & Watched History Filtering',
        description: 'Fast filtering by format, genres, watched status, release year, and sorting order.',
      },
      {
        title: 'Full-Screen Cinematic Preview Modal',
        description: 'Rich media preview modal with backdrop hero, trailer embeds, cast lists, and similar titles rail.',
      },
      {
        title: 'Zero Ads & Calm Privacy Philosophy',
        description: 'No trackers, no telemetry, no subscription paywalls, and complete data ownership on user device.',
      },
    ],
  },
];
