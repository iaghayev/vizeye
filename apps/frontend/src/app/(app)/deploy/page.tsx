'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { useLang } from '@/lib/i18n/lang-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Terminal, Copy, CheckCircle, Server, ChevronRight,
  Download, Cpu, HardDrive, Wifi, RefreshCw,
} from 'lucide-react';

// ── OS tərifi ────────────────────────────────────────────────────────────────
const OS_LIST = [
  {
    id: 'linux-amd64',
    label: 'Linux (x86_64)',
    icon: '🐧',
    desc: 'Ubuntu, Debian, CentOS, RHEL, Alma — 64-bit',
    binaryName: 'vizeye-agent-linux-amd64',
    goOS: 'linux', goArch: 'amd64',
  },
  {
    id: 'linux-arm64',
    label: 'Linux (ARM64)',
    icon: '🐧',
    desc: 'Raspberry Pi 4/5, AWS Graviton, Oracle ARM',
    binaryName: 'vizeye-agent-linux-arm64',
    goOS: 'linux', goArch: 'arm64',
  },
  {
    id: 'linux-arm',
    label: 'Linux (ARMv7)',
    icon: '🐧',
    desc: 'Raspberry Pi 2/3, köhnə ARM serverləri',
    binaryName: 'vizeye-agent-linux-arm',
    goOS: 'linux', goArch: 'arm',
  },
  {
    id: 'darwin-amd64',
    label: 'macOS (Intel)',
    icon: '🍎',
    desc: 'Intel Mac — macOS 11+',
    binaryName: 'vizeye-agent-darwin-amd64',
    goOS: 'darwin', goArch: 'amd64',
  },
  {
    id: 'darwin-arm64',
    label: 'macOS (Apple Silicon)',
    icon: '🍎',
    desc: 'M1 / M2 / M3 Mac',
    binaryName: 'vizeye-agent-darwin-arm64',
    goOS: 'darwin', goArch: 'arm64',
  },
  {
    id: 'windows-amd64',
    label: 'Windows (64-bit)',
    icon: '🪟',
    desc: 'Windows Server 2016/2019/2022, Windows 10/11',
    binaryName: 'vizeye-agent-windows-amd64.exe',
    goOS: 'windows', goArch: 'amd64',
  },
  {
    id: 'freebsd-amd64',
    label: 'FreeBSD (x86_64)',
    icon: '😈',
    desc: 'FreeBSD 12+',
    binaryName: 'vizeye-agent-freebsd-amd64',
    goOS: 'freebsd', goArch: 'amd64',
  },
];

// ── Script generasiyası ───────────────────────────────────────────────────────
function generateScript(
  os: typeof OS_LIST[0],
  agentKey: string,
  serverUrl: string,
  intervalSec: number,
  assetName: string,
): string {
  const isWindows = os.goOS === 'windows';
  const isMac     = os.goOS === 'darwin';
  const downloadUrl = `${serverUrl}/api/v1/agent/download/${os.binaryName}`;

  // ── Windows (PowerShell) ──────────────────────────────────────────────────
  if (isWindows) {
    return `# VizEye Agent — Windows Quraşdırma Skripti
# PowerShell-də Administrator olaraq işlədin
# Asset: ${assetName}

$VIZEYE_URL   = "${serverUrl}"
$AGENT_KEY    = "${agentKey}"
$BINARY_URL   = "${downloadUrl}"
$INSTALL_DIR  = "C:\\Program Files\\VizEye"
$CONFIG_FILE  = "C:\\ProgramData\\VizEye\\config.yaml"
$SERVICE_NAME = "VizEyeAgent"

# 1. Qovluqlar yarat
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
New-Item -ItemType Directory -Force -Path "C:\\ProgramData\\VizEye" | Out-Null

# 2. Binary yüklə
Write-Host "Agent yüklənir..."
Invoke-WebRequest -Uri $BINARY_URL -OutFile "$INSTALL_DIR\\vizeye-agent.exe"

# 3. Config yarat
@"
server:
  url: "$VIZEYE_URL"
  agent_key: "$AGENT_KEY"
  connect_timeout_sec: 10
  request_timeout_sec: 30
  retry_max_attempts: 5
collection:
  interval_sec: ${intervalSec}
  heartbeat_interval_sec: 60
  collectors:
    cpu: true
    memory: true
    disk: true
    load: true
    network: true
logging:
  level: "info"
  format: "json"
"@ | Out-File -FilePath $CONFIG_FILE -Encoding UTF8

# 4. Windows Service qeydiyyatı
sc.exe create $SERVICE_NAME binPath= "$INSTALL_DIR\\vizeye-agent.exe -config $CONFIG_FILE" start= auto DisplayName= "VizEye Monitoring Agent"
sc.exe description $SERVICE_NAME "VizEye infrastructure monitoring agent"

# 5. Servisi başlat
Start-Service $SERVICE_NAME
Write-Host "✓ VizEye Agent quraşdırıldı və başladıldı!"
Write-Host "Status: " (Get-Service $SERVICE_NAME).Status

# Yoxlamaq üçün:
# Get-Service VizEyeAgent
# Get-EventLog -LogName Application -Source VizEyeAgent -Newest 20`;
  }

  // ── macOS ─────────────────────────────────────────────────────────────────
  if (isMac) {
    return `#!/bin/bash
# VizEye Agent — macOS Quraşdırma Skripti
# Asset: ${assetName}
set -e

VIZEYE_URL="${serverUrl}"
AGENT_KEY="${agentKey}"
BINARY_URL="${downloadUrl}"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/vizeye"
PLIST_PATH="/Library/LaunchDaemons/com.vizeye.agent.plist"

echo "━━━ VizEye Agent quraşdırılır (macOS ${os.label})..."

# 1. Binary yüklə
echo "▶ Agent binary yüklənir..."
curl -fsSL "$BINARY_URL" -o "$INSTALL_DIR/vizeye-agent"
chmod +x "$INSTALL_DIR/vizeye-agent"

# 2. Config yarat
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_DIR/config.yaml" << 'CONFIG'
server:
  url: "${serverUrl}"
  agent_key: "${agentKey}"
  connect_timeout_sec: 10
  request_timeout_sec: 30
  retry_max_attempts: 5
collection:
  interval_sec: ${intervalSec}
  heartbeat_interval_sec: 60
  collectors:
    cpu: true
    memory: true
    disk: true
    load: true
    network: true
logging:
  level: "info"
  format: "json"
CONFIG

# 3. LaunchDaemon (macOS service)
cat > "$PLIST_PATH" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>              <string>com.vizeye.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/vizeye-agent</string>
    <string>-config</string>
    <string>/etc/vizeye/config.yaml</string>
  </array>
  <key>RunAtLoad</key>          <true/>
  <key>KeepAlive</key>          <true/>
  <key>StandardOutPath</key>    <string>/var/log/vizeye-agent.log</string>
  <key>StandardErrorPath</key>  <string>/var/log/vizeye-agent.log</string>
</dict>
</plist>
PLIST

# 4. Servisi başlat
launchctl load -w "$PLIST_PATH"

echo "✓ VizEye Agent quraşdırıldı!"
echo ""
echo "Log izləmək üçün:"
echo "  tail -f /var/log/vizeye-agent.log"
echo ""
echo "Dayandırmaq üçün:"
echo "  sudo launchctl unload $PLIST_PATH"`;
  }

  // ── Linux / FreeBSD ───────────────────────────────────────────────────────
  return `#!/bin/bash
# VizEye Agent — Linux Quraşdırma Skripti
# Asset: ${assetName} | OS: ${os.label}
# Bu skripti root olaraq işlədin: bash install-agent.sh

set -e

VIZEYE_URL="${serverUrl}"
AGENT_KEY="${agentKey}"
BINARY_URL="${downloadUrl}"
INSTALL_BIN="/usr/local/bin/vizeye-agent"
CONFIG_DIR="/etc/vizeye"
CONFIG_FILE="$CONFIG_DIR/config.yaml"
SERVICE_FILE="/etc/systemd/system/vizeye-agent.service"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " VizEye Agent Quraşdırıcı"
echo " Asset : ${assetName}"
echo " OS    : ${os.label}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Binary yüklə ───────────────────────────────────────────────────────
echo ""
echo "▶ Agent binary yüklənir..."
if command -v curl &>/dev/null; then
  curl -fsSL "$BINARY_URL" -o "$INSTALL_BIN"
elif command -v wget &>/dev/null; then
  wget -qO "$INSTALL_BIN" "$BINARY_URL"
else
  echo "XƏTA: curl və ya wget tapılmadı. Birini quraşdırın."
  exit 1
fi
chmod +x "$INSTALL_BIN"
echo "  ✓ Binary: $INSTALL_BIN"

# ── 2. Config qovluğu və fayl ────────────────────────────────────────────
echo ""
echo "▶ Konfiqurasiya faylı yaradılır..."
mkdir -p "$CONFIG_DIR"
chmod 750 "$CONFIG_DIR"

cat > "$CONFIG_FILE" << 'CONFIG'
server:
  url: "${serverUrl}"
  agent_key: "${agentKey}"
  tls_skip_verify: false
  connect_timeout_sec: 10
  request_timeout_sec: 30
  retry_max_attempts: 5
  retry_initial_delay_ms: 500
  retry_max_delay_sec: 60

collection:
  interval_sec: ${intervalSec}
  heartbeat_interval_sec: 60
  jitter_factor: 0.1
  collectors:
    cpu: true
    memory: true
    disk: true
    load: true
    network: true
  disk_include_mounts: []
  network_include_interfaces: []

logging:
  level: "info"
  format: "json"

agent:
  version: "auto"
  hostname: ""
CONFIG

chmod 640 "$CONFIG_FILE"
echo "  ✓ Config: $CONFIG_FILE"

# ── 3. Systemd service ────────────────────────────────────────────────────
echo ""
echo "▶ Systemd service yaradılır..."
cat > "$SERVICE_FILE" << 'SERVICE'
[Unit]
Description=VizEye Monitoring Agent
Documentation=https://github.com/vizeye/agent
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/vizeye-agent -config /etc/vizeye/config.yaml
Restart=on-failure
RestartSec=10s
TimeoutStopSec=15
KillMode=process
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vizeye-agent

[Install]
WantedBy=multi-user.target
SERVICE

# ── 4. Servisi aktiv et ────────────────────────────────────────────────
systemctl daemon-reload
systemctl enable vizeye-agent
systemctl start  vizeye-agent

sleep 2
STATUS=$(systemctl is-active vizeye-agent)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$STATUS" = "active" ]; then
  echo " ✓ VizEye Agent uğurla quraşdırıldı!"
  echo " Status : $STATUS"
else
  echo " ✗ Agent başlamadı — log-lara baxın"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Faydalı əmrlər:"
echo "  systemctl status  vizeye-agent    # Status"
echo "  journalctl -u vizeye-agent -f     # Log izlə"
echo "  systemctl restart vizeye-agent    # Yenidən başlat"
echo "  systemctl stop    vizeye-agent    # Dayandır"`;
}

// ── Əsas komponent ───────────────────────────────────────────────────────────
export default function DeployPage() {
  const { t } = useLang();
  const qc    = useQueryClient();

  const [step,       setStep]       = useState<1|2|3>(1);
  const [selectedOS, setSelectedOS] = useState<typeof OS_LIST[0] | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [agentToken, setAgentToken] = useState<any>(null);
  const [intervalSec, setIntervalSec] = useState(30);
  const [copied,     setCopied]     = useState(false);
  const [search,     setSearch]     = useState('');

  const serverUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:4000`)
    : 'http://localhost:4000';

  const { data } = useQuery({
    queryKey: ['assets'],
    queryFn:  () => apiGet<any>('/api/v1/assets'),
  });
  const assets = (Array.isArray(data) ? data : data?.data ?? [])
    .filter((a:any) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.ipAddress||'').includes(search));

  const tokenMut = useMutation({
    mutationFn: (id: string) => apiPost<any>(`/api/v1/assets/${id}/agent-token`),
    onSuccess: (d) => { setAgentToken(d); setStep(3); },
    onError:   () => toast.error('Token alınmadı'),
  });

  const script = selectedAsset && selectedOS && agentToken
    ? generateScript(selectedOS, agentToken.enrollmentKey, serverUrl, intervalSec, selectedAsset.name)
    : '';

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('Skript kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const ext  = selectedOS?.goOS === 'windows' ? '.ps1' : '.sh';
    const name = `install-vizeye-agent${ext}`;
    const blob = new Blob([script], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name; a.click();
  };

  const reset = () => {
    setStep(1); setSelectedOS(null); setSelectedAsset(null);
    setAgentToken(null); setCopied(false); setSearch('');
  };

  // ── Step indicator ─────────────────────────────────────────────────────────
  const steps = [
    { n:1, label:'Asset seç' },
    { n:2, label:'OS seç'    },
    { n:3, label:'Skripti al' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
          <Terminal size={20} className="text-cyan-400"/> Agent Quraşdırıcı
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Serverinizə uyğun quraşdırma skriptini generasiya edin
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              step === s.n
                ? 'bg-cyan-600 text-white'
                : step > s.n
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-edge/30 text-slate-500 border border-edge'
            )}>
              {step > s.n
                ? <CheckCircle size={14}/>
                : <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">{s.n}</span>
              }
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={16} className="text-slate-700 mx-1"/>
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1 — Asset seç ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-slate-200">
            Hansı assetə agent quraşdıracaqsınız?
          </h2>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Axtar: ad, IP..."
            className="w-full px-3 py-2 rounded-md text-sm bg-canvas-elevated border border-edge
                       text-slate-200 placeholder:text-slate-600
                       focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {assets.length === 0 && (
              <p className="text-sm text-slate-600 text-center py-8">
                Asset tapılmadı — əvvəlcə asset əlavə edin
              </p>
            )}
            {assets.map((a:any) => (
              <button key={a.id}
                onClick={() => { setSelectedAsset(a); setStep(2); }}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3 rounded-lg border transition-all text-left',
                  'hover:border-cyan-500/30 hover:bg-cyan-500/5',
                  selectedAsset?.id === a.id
                    ? 'border-cyan-500/40 bg-cyan-500/5'
                    : 'border-edge bg-canvas-elevated'
                )}>
                <div className="w-9 h-9 rounded-md bg-slate-700/50 border border-edge
                                flex items-center justify-center shrink-0">
                  <Server size={15} className="text-slate-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{a.name}</p>
                  <p className="text-xs font-mono text-slate-600">
                    {[a.ipAddress, a.hostname].filter(Boolean).join(' · ') || t(`type.${a.assetType}`)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-full
                                   bg-slate-700/40 text-slate-500 border border-edge">
                    {t(`env.${a.environment}`)}
                  </span>
                  {a.agentId && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded-full
                                     bg-green-500/10 text-green-400 border border-green-500/20">
                      Agent var
                    </span>
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-700"/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2 — OS seç ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Selected asset */}
          <div className="card p-4 flex items-center gap-3 border-cyan-500/20">
            <CheckCircle size={16} className="text-green-400 shrink-0"/>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">{selectedAsset?.name}</p>
              <p className="text-xs font-mono text-slate-600">{selectedAsset?.ipAddress || selectedAsset?.hostname}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-cyan-500 hover:text-cyan-400">Dəyiştir</button>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-slate-200">
              Serverinizin əməliyyat sistemini seçin
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OS_LIST.map(os => (
                <button key={os.id}
                  onClick={() => setSelectedOS(os)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                    'hover:border-cyan-500/30',
                    selectedOS?.id === os.id
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : 'border-edge bg-canvas-elevated hover:bg-edge/20'
                  )}>
                  <span className="text-2xl mt-0.5 shrink-0">{os.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{os.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{os.desc}</p>
                    <p className="text-xs font-mono text-slate-600 mt-1">{os.binaryName}</p>
                  </div>
                  {selectedOS?.id === os.id && (
                    <CheckCircle size={16} className="text-cyan-400 shrink-0 mt-0.5"/>
                  )}
                </button>
              ))}
            </div>

            {/* Interval seçimi */}
            <div className="border-t border-edge pt-4 space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Metrik toplama intervalı</h3>
              <div className="flex items-center gap-3 flex-wrap">
                {[15, 30, 60, 120, 300].map(sec => (
                  <button key={sec}
                    onClick={() => setIntervalSec(sec)}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-mono font-medium border transition-colors',
                      intervalSec === sec
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'bg-edge/30 border-edge text-slate-400 hover:border-slate-500'
                    )}>
                    {sec < 60 ? `${sec}s` : `${sec/60}d`}
                  </button>
                ))}
                <span className="text-xs text-slate-600">
                  {intervalSec < 60
                    ? `Hər ${intervalSec} saniyədə bir`
                    : `Hər ${intervalSec/60} dəqiqədə bir`}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => selectedOS && tokenMut.mutate(selectedAsset.id)}
                disabled={!selectedOS || tokenMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium
                           bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50">
                {tokenMut.isPending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Token alınır...</>
                  : <><Terminal size={15}/>Skripti Generasiya Et</>
                }
              </button>
              <button onClick={() => setStep(1)}
                className="px-4 py-2 rounded-md text-sm text-slate-400 hover:text-slate-300 hover:bg-edge/50 transition-colors">
                Geri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3 — Skript ────────────────────────────────────────────────── */}
      {step === 3 && selectedOS && agentToken && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 flex items-center gap-3">
              <Server size={16} className="text-cyan-400 shrink-0"/>
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-500 uppercase">Asset</p>
                <p className="text-sm font-medium text-slate-200 truncate">{selectedAsset?.name}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <Cpu size={16} className="text-purple-400 shrink-0"/>
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-500 uppercase">OS</p>
                <p className="text-sm font-medium text-slate-200 truncate">{selectedOS.label}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <HardDrive size={16} className="text-green-400 shrink-0"/>
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-500 uppercase">İnterval</p>
                <p className="text-sm font-medium text-slate-200">{intervalSec}s</p>
              </div>
            </div>
          </div>

          {/* Agent key */}
          <div className="card p-4 border-yellow-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                Enrollment Key (bir dəfə göstərilir — saxlayın)
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(agentToken.enrollmentKey); toast.success('Kopyalandı!'); }}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono
                           text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                <Copy size={11}/> Kopyala
              </button>
            </div>
            <code className="text-xs font-mono text-yellow-400 break-all block
                             bg-yellow-500/5 px-3 py-2 rounded border border-yellow-500/15">
              {agentToken.enrollmentKey}
            </code>
          </div>

          {/* Script */}
          <div className="card overflow-hidden">
            {/* Script header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-edge bg-canvas-elevated">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400"/>
                <span className="text-xs font-mono text-slate-400">
                  {selectedOS.goOS === 'windows' ? 'PowerShell (Administrator)' : 'Bash (root)'}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {selectedOS.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium
                             bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-edge transition-colors">
                  <Download size={12}/> Faylı yüklə
                </button>
                <button onClick={copyScript}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all',
                    copied
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  )}>
                  {copied ? <><CheckCircle size={12}/>Kopyalandı</> : <><Copy size={12}/>Kopyala</>}
                </button>
              </div>
            </div>

            {/* Script body */}
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto
                            bg-canvas max-h-96 overflow-y-auto leading-5 whitespace-pre-wrap">
              {script}
            </pre>
          </div>

          {/* İstifadə təlimatı */}
          <div className="card p-5 space-y-3 border-cyan-500/10">
            <h3 className="text-sm font-semibold text-slate-300">
              Serverinizə qoşulun və skripti işlədin:
            </h3>
            <div className="space-y-2">
              {selectedOS.goOS === 'windows' ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
                    <p className="text-sm text-slate-400">Yuxarıdakı skripti kopyalayın (<code className="text-cyan-400 bg-cyan-500/10 px-1 rounded">Kopyala</code> düyməsi)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
                    <p className="text-sm text-slate-400">Windows serverinizdə <strong className="text-slate-300">PowerShell</strong>-i Administrator olaraq açın</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
                    <p className="text-sm text-slate-400">Skripti yapışdırın və Enter basın</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Serverinizə SSH ilə qoşulun:</p>
                      <code className="text-xs font-mono text-cyan-400 bg-canvas-elevated px-3 py-1.5 rounded border border-edge block">
                        ssh root@{selectedAsset?.ipAddress || 'SERVER_IP'}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Skripti yükləyin və işlədin:</p>
                      <code className="text-xs font-mono text-cyan-400 bg-canvas-elevated px-3 py-1.5 rounded border border-edge block whitespace-pre">
{`curl -fsSL "${serverUrl}/agent/install-script/${selectedOS.binaryName}" | bash
# YA DA skripti kopyalayıb:
bash install-agent.sh`}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Agentin işlədiyini yoxlayın:</p>
                      <code className="text-xs font-mono text-cyan-400 bg-canvas-elevated px-3 py-1.5 rounded border border-edge block">
                        systemctl status vizeye-agent
                      </code>
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</span>
                <p className="text-sm text-slate-400">
                  Quraşdırma tamamlandıqdan sonra bu paneldə
                  <strong className="text-slate-300"> Assets → {selectedAsset?.name}</strong>
                  sətri <strong className="text-green-400">Online</strong> görünəcək (~30 saniyə)
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                         bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-edge transition-colors">
              <RefreshCw size={14}/> Yeni quraşdırma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
