import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Network } from '@/types/defi';
import { DEFAULT_RISK_CONFIG, quoteStaleness, type PaperOpportunity, type RiskConfig } from '@/lib/arbitrage/engine';
import { scanNetworkOnChain } from '@/lib/arbitrage/onChainScanner';

export function usePaperScanner() {
  const [risk, setRiskState] = useState<RiskConfig>(DEFAULT_RISK_CONFIG);
  const [opportunities, setOpportunities] = useState<PaperOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [lastBlock, setLastBlock] = useState<number | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const riskRef = useRef(risk);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationRef = useRef(0);
  const inFlightRef = useRef(false);
  const activeRef = useRef(false);
  riskRef.current = risk;
  activeRef.current = isActive;

  const scanNext = useCallback(async () => {
    if (inFlightRef.current || (riskRef.current.circuitBreakerEnabled && circuitOpen)) return;
    const allowed = riskRef.current.networks;
    if (!allowed.length) {
      setErrors(['Select at least one allowed chain.']);
      return;
    }
    inFlightRef.current = true;
    setIsScanning(true);
    const network = allowed[rotationRef.current % allowed.length];
    rotationRef.current += 1;
    try {
      const result = await scanNetworkOnChain(network, riskRef.current);
      setOpportunities((previous) => [
        ...previous.filter((item) => item.sourceNetwork !== network),
        ...result.opportunities,
      ].sort((a, b) => b.netProfit - a.netProfit).slice(0, 60));
      setErrors(result.errors.slice(0, 8));
      setLastScanTime(Date.now());
      setLastBlock(result.blockNumber);
      setTotalScanned((count) => count + result.opportunities.length);
      if (result.errors.length && result.opportunities.length === 0) {
        setFailureCount((count) => {
          const next = count + 1;
          if (riskRef.current.circuitBreakerEnabled && next >= riskRef.current.dailyFailureBudget) {
            setCircuitOpen(true);
            setIsActive(false);
          }
          return next;
        });
      }
    } finally {
      inFlightRef.current = false;
      setIsScanning(false);
    }
  }, [circuitOpen]);

  const stopScanning = useCallback(() => {
    setIsActive(false);
    activeRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const startScanning = useCallback(async () => {
    if (riskRef.current.circuitBreakerEnabled && circuitOpen) {
      setErrors(['Circuit breaker is open. Reset it after reviewing the failures.']);
      return;
    }
    setIsActive(true);
    activeRef.current = true;
    await scanNext();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (activeRef.current) void scanNext();
    }, riskRef.current.scanIntervalMs);
  }, [circuitOpen, scanNext]);

  const updateRisk = useCallback((updates: Partial<RiskConfig>) => {
    setRiskState((current) => ({ ...current, ...updates }));
  }, []);

  const resetCircuitBreaker = useCallback(() => {
    setFailureCount(0);
    setCircuitOpen(false);
    setErrors([]);
  }, []);

  const runPreflight = useCallback(async (id: string): Promise<PaperOpportunity | null> => {
    const current = opportunities.find((item) => item.id === id);
    if (!current) return null;
    const reasons = [...current.evidence.rejectionReasons];
    const stale = quoteStaleness(current.timestamp, Date.now(), riskRef.current.maxQuoteAgeMs);
    if (stale && !reasons.includes(stale)) reasons.push(stale);
    reasons.push('Live preparation stopped: no verified executor address and exact calldata are configured.');
    const checked: PaperOpportunity = {
      ...current,
      evidence: { ...current.evidence, simulation: 'preflight_rejected', rejectionReasons: [...new Set(reasons)] },
    };
    setOpportunities((items) => items.map((item) => item.id === id ? checked : item));
    return checked;
  }, [opportunities]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const visibleOpportunities = useMemo(() => opportunities.map((opportunity) => {
    const stale = quoteStaleness(opportunity.timestamp, Date.now(), risk.maxQuoteAgeMs);
    if (!stale || opportunity.evidence.rejectionReasons.includes(stale)) return opportunity;
    return { ...opportunity, evidence: { ...opportunity.evidence, rejectionReasons: [...opportunity.evidence.rejectionReasons, stale] } };
  }), [opportunities, risk.maxQuoteAgeMs, lastScanTime]);

  return {
    opportunities: visibleOpportunities,
    risk,
    updateRisk,
    isScanning,
    isActive,
    errors,
    lastScanTime,
    lastBlock,
    totalScanned,
    failureCount,
    circuitOpen,
    startScanning,
    stopScanning,
    scanNext,
    runPreflight,
    resetCircuitBreaker,
  };
}
