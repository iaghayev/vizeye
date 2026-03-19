import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';

const execAsync = promisify(exec);

export interface ConnectivityResult {
  reachable:     boolean;
  pingMs:        number | null;
  openPorts:     number[];
  hostname:      string | null;
  method:        string;
  error?:        string;
}

@Injectable()
export class AssetsPingService {

  async checkConnectivity(ip: string, timeoutMs = 3000): Promise<ConnectivityResult> {
    const [pingResult, portsResult, hostname] = await Promise.all([
      this.ping(ip, timeoutMs),
      this.checkCommonPorts(ip, timeoutMs),
      this.resolveHostname(ip),
    ]);

    return {
      reachable: pingResult.reachable || portsResult.length > 0,
      pingMs:    pingResult.ms,
      openPorts: portsResult,
      hostname,
      method:    pingResult.reachable ? 'icmp' : portsResult.length > 0 ? 'tcp' : 'none',
      error:     !pingResult.reachable && portsResult.length === 0
        ? 'Host əlçatılan deyil' : undefined,
    };
  }

  private async ping(ip: string, timeoutMs: number): Promise<{ reachable: boolean; ms: number | null }> {
    try {
      const start = Date.now();
      await execAsync(`ping -c 1 -W ${Math.ceil(timeoutMs/1000)} ${ip}`);
      return { reachable: true, ms: Date.now() - start };
    } catch {
      return { reachable: false, ms: null };
    }
  }

  private checkPort(ip: string, port: number, timeoutMs: number): Promise<boolean> {
    return new Promise(resolve => {
      const s = new net.Socket();
      s.setTimeout(timeoutMs);
      s.connect(port, ip, () => { s.destroy(); resolve(true); });
      s.on('error',   () => { s.destroy(); resolve(false); });
      s.on('timeout', () => { s.destroy(); resolve(false); });
    });
  }

  private async checkCommonPorts(ip: string, timeoutMs: number): Promise<number[]> {
    const ports = [22, 80, 443, 3389, 8080, 5432, 3306, 161];
    const results = await Promise.all(
      ports.map(p => this.checkPort(ip, p, timeoutMs).then(ok => ok ? p : null))
    );
    return results.filter(Boolean) as number[];
  }

  private async resolveHostname(ip: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`host ${ip} 2>/dev/null || nslookup ${ip} 2>/dev/null | grep 'name =' | awk '{print $4}'`);
      const match = stdout.match(/pointer\s+(\S+)/i) || stdout.match(/name\s*=\s*(\S+)/i);
      return match ? match[1].replace(/\.$/, '') : null;
    } catch { return null; }
  }
}
