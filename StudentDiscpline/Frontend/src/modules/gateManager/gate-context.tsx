'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { disciplineApi } from '@/services/discipline-api';
import type { Gate, GateOfficer } from '@/types/discipline';

const STORAGE_GATE = 'discipline_gate_id';
const STORAGE_OFFICER = 'discipline_gate_officer_id';

interface GateContextValue {
  ready: boolean;
  gates: Gate[];
  officers: GateOfficer[];
  selectedGate: Gate | null;
  selectedOfficer: GateOfficer | null;
  setSelectedGateId: (id: string) => void;
  setSelectedOfficerId: (id: string) => void;
  reload: () => Promise<void>;
}

const GateContext = createContext<GateContextValue | null>(null);

export function GateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [gates, setGates] = useState<Gate[]>([]);
  const [officers, setOfficers] = useState<GateOfficer[]>([]);
  const [selectedGateId, setSelectedGateIdState] = useState<string>('');
  const [selectedOfficerId, setSelectedOfficerIdState] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const [gatesRes, officersRes, meRes] = await Promise.all([
        disciplineApi.gates(),
        disciplineApi.gateOfficers(),
        disciplineApi.gateMe().catch(() => ({ data: { data: null } })),
      ]);
      const gateList = gatesRes.data.data ?? [];
      const officerList = officersRes.data.data ?? [];
      const me = meRes.data.data ?? null;
      setGates(gateList);
      setOfficers(officerList);

      const storedGate = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_GATE) : null;
      const storedOfficer = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_OFFICER) : null;

      const officer =
        (me && officerList.find((o) => o.id === me.id)) ??
        officerList.find((o) => o.id === storedOfficer) ??
        me ??
        officerList[0] ??
        null;

      const gate =
        (officer?.gateId && gateList.find((g) => g.id === officer.gateId)) ??
        gateList.find((g) => g.id === storedGate) ??
        gateList.find((g) => g.isDefault) ??
        gateList[0] ??
        null;

      if (gate) setSelectedGateIdState(gate.id);
      if (officer) setSelectedOfficerIdState(officer.id);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setSelectedGateId(id: string) {
    setSelectedGateIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_GATE, id);
  }

  function setSelectedOfficerId(id: string) {
    setSelectedOfficerIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_OFFICER, id);
  }

  const selectedGate = gates.find((g) => g.id === selectedGateId) ?? null;
  const selectedOfficer = officers.find((o) => o.id === selectedOfficerId) ?? null;

  const value = useMemo(
    () => ({
      ready,
      gates,
      officers,
      selectedGate,
      selectedOfficer,
      setSelectedGateId,
      setSelectedOfficerId,
      reload: load,
    }),
    [ready, gates, officers, selectedGate, selectedOfficer, load]
  );

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useGateContext() {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('useGateContext must be used within GateProvider');
  return ctx;
}
