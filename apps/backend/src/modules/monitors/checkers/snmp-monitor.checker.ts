import * as net   from 'net';
import * as dgram from 'dgram';
import * as crypto from 'crypto';

export interface SnmpMonitorResult {
  status:        'up' | 'down' | 'timeout';
  responseTimeMs:number | null;
  value?:        string;
  error?:        string;
}

export interface SnmpConfig {
  community?:   string;
  oid?:         string;
  port?:        number;
  timeoutMs?:   number;
  version?:     '1' | '2c' | '3';
  // SNMPv3
  securityName?:     string;
  securityLevel?:    'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  authProtocol?:     'MD5' | 'SHA1' | 'SHA256';
  authPassphrase?:   string;
  privProtocol?:     'DES' | 'AES128' | 'AES256';
  privPassphrase?:   string;
  contextName?:      string;
}

export async function runSnmpCheck(
  host: string,
  config: SnmpConfig = {}
): Promise<SnmpMonitorResult> {
  const version   = config.version || '2c';
  const port      = config.port    || 161;
  const timeoutMs = config.timeoutMs || 5000;
  const oid       = config.oid || '1.3.6.1.2.1.1.1.0';
  const start     = Date.now();

  if (version === '3') {
    return runSnmpV3Check(host, port, oid, config, timeoutMs, start);
  }

  // v1 / v2c
  return runUdpSnmpCheck(
    host, port,
    config.community || 'public',
    oid, version, timeoutMs, start
  );
}

// ── SNMPv3 ────────────────────────────────────────────────────────────────────
async function runSnmpV3Check(
  host: string, port: number, oid: string,
  cfg: SnmpConfig, timeoutMs: number, start: number
): Promise<SnmpMonitorResult> {
  return new Promise(resolve => {
    const socket = dgram.createSocket('udp4');
    const timer  = setTimeout(() => {
      try { socket.close(); } catch {}
      resolve({ status:'timeout', responseTimeMs:null, error:'SNMPv3 timeout' });
    }, timeoutMs);

    try {
      const packet = buildSnmpV3Packet(oid, cfg);

      socket.on('message', (msg) => {
        clearTimeout(timer);
        try { socket.close(); } catch {}
        const value = parseSnmpValue(msg);
        resolve({ status:'up', responseTimeMs:Date.now()-start, value });
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        try { socket.close(); } catch {}
        resolve({ status:'down', responseTimeMs:null, error:err.message });
      });

      socket.send(packet, port, host, (err) => {
        if (err) {
          clearTimeout(timer);
          try { socket.close(); } catch {}
          resolve({ status:'down', responseTimeMs:null, error:err.message });
        }
      });
    } catch (e: any) {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve({ status:'down', responseTimeMs:null, error:e.message });
    }
  });
}

function buildSnmpV3Packet(oid: string, cfg: SnmpConfig): Buffer {
  const secLevel  = cfg.securityLevel  || 'noAuthNoPriv';
  const secName   = Buffer.from(cfg.securityName || 'admin');
  const contextName = Buffer.from(cfg.contextName || '');

  const msgFlags  = secLevel === 'authPriv'   ? Buffer.from([0x07]) :
                    secLevel === 'authNoPriv'  ? Buffer.from([0x05]) :
                                                 Buffer.from([0x04]);

  const msgId      = crypto.randomBytes(4);
  const reqId      = crypto.randomBytes(4);
  const engineId   = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
  const engineBoots = Buffer.from([0x02, 0x01, 0x00]);
  const engineTime  = Buffer.from([0x02, 0x01, 0x00]);

  // USM Security params
  const usmParams = buildUsmParams(engineId, secName, cfg);

  // PDU
  const varBind = buildVarBind(oid);
  const pdu = tlvWrap(0xa0, Buffer.concat([
    tlvWrap(0x02, reqId),
    Buffer.from([0x02, 0x01, 0x00]),
    Buffer.from([0x02, 0x01, 0x00]),
    tlvWrap(0x30, tlvWrap(0x30, varBind)),
  ]));

  // Scoped PDU
  const scopedPdu = tlvWrap(0x30, Buffer.concat([
    tlvWrap(0x04, engineId),
    tlvWrap(0x04, contextName),
    pdu,
  ]));

  // Header
  const msgGlobalData = tlvWrap(0x30, Buffer.concat([
    tlvWrap(0x02, msgId),
    Buffer.from([0x02, 0x02, 0x10, 0x00]),
    tlvWrap(0x04, msgFlags),
    Buffer.from([0x02, 0x01, 0x03]),
  ]));

  const msg = tlvWrap(0x30, Buffer.concat([
    Buffer.from([0x02, 0x01, 0x03]),
    msgGlobalData,
    tlvWrap(0x04, usmParams),
    scopedPdu,
  ]));

  return msg;
}

function buildUsmParams(engineId: Buffer, secName: Buffer, cfg: SnmpConfig): Buffer {
  const boots = Buffer.alloc(4);
  const time  = Buffer.alloc(4);
  const authParam = cfg.securityLevel !== 'noAuthNoPriv' && cfg.authPassphrase
    ? computeAuthParam(cfg)
    : Buffer.alloc(12);
  const privParam = cfg.securityLevel === 'authPriv' && cfg.privPassphrase
    ? crypto.randomBytes(8)
    : Buffer.alloc(8);

  return tlvWrap(0x30, Buffer.concat([
    tlvWrap(0x04, engineId),
    tlvWrap(0x02, boots),
    tlvWrap(0x02, time),
    tlvWrap(0x04, secName),
    tlvWrap(0x04, authParam),
    tlvWrap(0x04, privParam),
  ]));
}

function computeAuthParam(cfg: SnmpConfig): Buffer {
  if (!cfg.authPassphrase) return Buffer.alloc(12);
  const proto = cfg.authProtocol || 'SHA1';
  const hashAlgo = proto === 'MD5' ? 'md5' : proto === 'SHA256' ? 'sha256' : 'sha1';
  const key = deriveKey(cfg.authPassphrase, hashAlgo, proto === 'MD5' ? 16 : proto === 'SHA256' ? 32 : 20);
  return key.slice(0, 12);
}

function deriveKey(passphrase: string, algo: string, keyLen: number): Buffer {
  const buf    = Buffer.from(passphrase);
  const repeat = Math.ceil(1048576 / buf.length);
  const mega   = Buffer.concat(Array(repeat).fill(buf)).slice(0, 1048576);
  return crypto.createHash(algo).update(mega).digest().slice(0, keyLen);
}

function buildVarBind(oid: string): Buffer {
  const oidBuf = encodeOid(oid);
  return tlvWrap(0x30, Buffer.concat([
    tlvWrap(0x06, oidBuf),
    Buffer.from([0x05, 0x00]),
  ]));
}

// ── SNMPv1/v2c ────────────────────────────────────────────────────────────────
async function runUdpSnmpCheck(
  host: string, port: number, community: string,
  oid: string, version: string, timeoutMs: number, start: number
): Promise<SnmpMonitorResult> {
  return new Promise(resolve => {
    const socket = dgram.createSocket('udp4');
    const timer  = setTimeout(() => {
      try { socket.close(); } catch {}
      resolve({ status:'timeout', responseTimeMs:null, error:'SNMP timeout' });
    }, timeoutMs);

    const packet = buildSnmpGetPacket(community, oid, version === '2c' ? 1 : 0);

    socket.on('message', (msg) => {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve({ status:'up', responseTimeMs:Date.now()-start, value:parseSnmpValue(msg) });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve({ status:'down', responseTimeMs:null, error:err.message });
    });

    socket.send(packet, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        try { socket.close(); } catch {}
        resolve({ status:'down', responseTimeMs:null, error:err.message });
      }
    });
  });
}

function buildSnmpGetPacket(community: string, oid: string, version: number): Buffer {
  const commBuf = Buffer.from(community, 'ascii');
  const oidBuf  = encodeOid(oid);
  const varBind = tlvWrap(0x30, tlvWrap(0x30, Buffer.concat([
    tlvWrap(0x06, oidBuf),
    Buffer.from([0x05, 0x00]),
  ])));
  const pdu = tlvWrap(0xa0, Buffer.concat([
    Buffer.from([0x02, 0x04, 0x00, 0x00, 0x00, 0x01]),
    Buffer.from([0x02, 0x01, 0x00]),
    Buffer.from([0x02, 0x01, 0x00]),
    varBind,
  ]));
  const msg = Buffer.concat([
    Buffer.from([0x02, 0x01, version]),
    tlvWrap(0x04, commBuf),
    pdu,
  ]);
  return tlvWrap(0x30, msg);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function tlvWrap(tag: number, value: Buffer): Buffer {
  const len = value.length;
  let lenBuf: Buffer;
  if      (len < 128)  lenBuf = Buffer.from([len]);
  else if (len < 256)  lenBuf = Buffer.from([0x81, len]);
  else                 lenBuf = Buffer.from([0x82, len >> 8, len & 0xff]);
  return Buffer.concat([Buffer.from([tag]), lenBuf, value]);
}

function encodeOid(oid: string): Buffer {
  const parts = oid.replace(/^\./, '').split('.').map(Number);
  const bytes: number[] = [40 * parts[0] + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    if (v < 128) { bytes.push(v); continue; }
    const tmp: number[] = [];
    while (v > 0) { tmp.unshift((v & 0x7f) | (tmp.length ? 0x80 : 0)); v >>= 7; }
    bytes.push(...tmp);
  }
  return Buffer.from(bytes);
}

function parseSnmpValue(buf: Buffer): string {
  try {
    const str = buf.toString('latin1');
    const printable = str.replace(/[^\x20-\x7E]/g, ' ').trim();
    const words = printable.split(/\s+/).filter(w => w.length > 2 && /[a-zA-Z0-9]/.test(w));
    return words.slice(0, 15).join(' ') || 'SNMP OK';
  } catch { return 'SNMP response received'; }
}
