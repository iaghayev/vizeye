import * as net from 'net';
import * as dgram from 'dgram';

export interface SnmpResult {
  status:        'up' | 'down';
  responseTimeMs:number | null;
  value?:        string;
  error?:        string;
  deviceInfo?:   Record<string, string>;
}

// UDP SNMP GET (sadə implementasiya — net-snmp olmadan)
export async function checkSnmpUdp(
  host: string,
  community = 'public',
  oid = '1.3.6.1.2.1.1.1.0',
  timeoutMs = 5000,
): Promise<SnmpResult> {
  const start = Date.now();

  return new Promise(resolve => {
    const socket = dgram.createSocket('udp4');
    const timer  = setTimeout(() => {
      socket.close();
      resolve({ status:'down', responseTimeMs:null, error:'SNMP timeout' });
    }, timeoutMs);

    // Sadə SNMP v1 GET packet — sysDescr üçün
    const packet = buildSnmpGetPacket(community, oid);

    socket.on('message', (msg) => {
      clearTimeout(timer);
      socket.close();
      const ms    = Date.now() - start;
      const value = parseSnmpResponse(msg);
      resolve({ status:'up', responseTimeMs:ms, value });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.close();
      resolve({ status:'down', responseTimeMs:null, error:err.message });
    });

    socket.send(packet, 161, host, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        resolve({ status:'down', responseTimeMs:null, error:err.message });
      }
    });
  });
}

// TCP port 161 yoxla (SNMP əlçatanlıq testi)
export async function checkSnmpTcp(
  host: string,
  timeoutMs = 5000,
): Promise<SnmpResult> {
  const start = Date.now();
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(161, host, () => {
      socket.destroy();
      resolve({ status:'up', responseTimeMs: Date.now()-start });
    });
    socket.on('error',   () => { socket.destroy(); resolve({ status:'down', responseTimeMs:null, error:'Port 161 closed' }); });
    socket.on('timeout', () => { socket.destroy(); resolve({ status:'down', responseTimeMs:null, error:'Timeout' }); });
  });
}

// SNMP v1 GET packet builder
function buildSnmpGetPacket(community: string, oid: string): Buffer {
  const comm   = Buffer.from(community);
  const oidBuf = encodeOid(oid);
  const reqId  = Buffer.from([0x02, 0x04, 0x00, 0x00, 0x00, 0x01]); // INTEGER requestId=1
  const errSt  = Buffer.from([0x02, 0x01, 0x00]);                    // error-status=0
  const errIdx = Buffer.from([0x02, 0x01, 0x00]);                    // error-index=0
  const varBind = Buffer.concat([
    Buffer.from([0x30]), tlv(Buffer.concat([
      Buffer.concat([Buffer.from([0x06]), tlv(oidBuf)]),
      Buffer.from([0x05, 0x00]),
    ])),
  ]);
  const pdu = Buffer.concat([reqId, errSt, errIdx, varBind]);
  const getReq = Buffer.concat([Buffer.from([0xa0]), tlv(pdu)]);
  const msg = Buffer.concat([
    Buffer.from([0x02, 0x01, 0x00]),
    Buffer.concat([Buffer.from([0x04]), tlv(comm)]),
    getReq,
  ]);
  return Buffer.concat([Buffer.from([0x30]), tlv(msg)]);
}

function tlv(buf: Buffer): Buffer {
  if (buf.length < 128) return Buffer.concat([Buffer.from([buf.length]), buf]);
  if (buf.length < 256) return Buffer.concat([Buffer.from([0x81, buf.length]), buf]);
  return Buffer.concat([Buffer.from([0x82, buf.length >> 8, buf.length & 0xff]), buf]);
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

function parseSnmpResponse(buf: Buffer): string {
  try {
    // Sadə parser — value string-i tap
    const str = buf.toString('latin1');
    const printable = str.replace(/[^\x20-\x7E]/g, ' ').trim();
    const words = printable.split(/\s+/).filter(w => w.length > 2);
    return words.slice(0, 10).join(' ') || 'SNMP response received';
  } catch { return 'SNMP OK'; }
}
