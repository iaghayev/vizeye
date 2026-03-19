import { redirect } from 'next/navigation';

// SNMP artıq Monitorlar səhifəsinin bir hissəsidir
// Monitors → Yeni Monitor → SNMP tipini seçin
export default function SnmpDevicesPage() {
  redirect('/monitors');
}
