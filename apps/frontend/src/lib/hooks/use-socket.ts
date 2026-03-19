'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/lib/api';
import { toast } from 'sonner';

type EventHandler = (data: any) => void;

export function useSocket() {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
    const token = tokenStore.getAccess();
    if (!token) return;

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('[WS] connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[WS] disconnected');
    });

    // Auto-invalidate queries on server events
    socket.on('alert:fired', (data) => {
      qc.invalidateQueries({ queryKey: ['alert-events'] });
      qc.invalidateQueries({ queryKey: ['alert-summary'] });
      qc.invalidateQueries({ queryKey: ['alert-events-dash'] });
      toast.error(`🔴 ${data.ruleName || 'Alert'}: ${data.assetName || ''}`, { duration: 8000 });
    });

    socket.on('alert:resolved', () => {
      qc.invalidateQueries({ queryKey: ['alert-events'] });
      qc.invalidateQueries({ queryKey: ['alert-summary'] });
    });

    socket.on('incident:created', (data) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incident-stats'] });
      toast.warning(`⚠️ Yeni hadisə: ${data.title || ''}`, { duration: 6000 });
    });

    socket.on('incident:updated', () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['incident-stats'] });
    });

    socket.on('asset:online', () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['org-stats'] });
    });

    socket.on('asset:offline', (data) => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      toast.warning(`📡 ${data.name || 'Asset'} offline oldu`);
    });

    socket.on('monitor:status_changed', (data) => {
      qc.invalidateQueries({ queryKey: ['monitors'] });
      qc.invalidateQueries({ queryKey: ['monitors-dash'] });
      if (data.status === 'down') {
        toast.error(`📡 ${data.name} DOWN`, { duration: 10000 });
      }
    });

    socket.on('metric:received', () => {
      qc.invalidateQueries({ queryKey: ['top-metrics'] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [qc]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { connected, emit, on, socket: socketRef.current };
}
