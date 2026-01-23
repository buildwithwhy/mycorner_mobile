import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  syncComparison,
  getComparison,
  syncNeighborhoodStatus,
  getUserNeighborhoodStatuses,
} from '../services/supabase';
import { useSyncToSupabase, useSyncRecordToSupabase } from '../hooks/useSyncToSupabase';
import logger from '../utils/logger';

export type NeighborhoodStatus = 'shortlist' | 'want_to_visit' | 'visited' | 'living_here' | 'ruled_out' | null;

interface NeighborhoodStatusRow {
  neighborhood_id: string;
  status: string;
}

interface StatusComparisonContextType {
  status: Record<string, NeighborhoodStatus>;
  setNeighborhoodStatus: (id: string, status: NeighborhoodStatus) => void;
  getNeighborhoodsByStatus: (status: NeighborhoodStatus) => string[];
  comparison: string[];
  toggleComparison: (id: string) => void;
  isInComparison: (id: string) => boolean;
  clearComparison: () => void;
}

const StatusComparisonContext = createContext<StatusComparisonContextType | undefined>(undefined);

export function StatusComparisonProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Record<string, NeighborhoodStatus>>({});
  const [comparison, setComparison] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const isSyncingRef = useRef(false);

  // Load data from Supabase when user logs in
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setDataLoaded(false);
          setStatus({});
          setComparison([]);
        }
        return;
      }

      isSyncingRef.current = true;
      logger.log('Loading status/comparison data...');

      try {
        // Load comparison list
        const { data: compData, error: compError } = await getComparison(user.id);
        if (!isMounted) return;
        if (!compError && compData?.neighborhood_ids) {
          setComparison(compData.neighborhood_ids);
        }

        // Load neighborhood statuses
        const { data: statusData, error: statusError } = await getUserNeighborhoodStatuses(user.id);
        if (!isMounted) return;
        if (!statusError && statusData) {
          const statusMap: Record<string, NeighborhoodStatus> = {};
          (statusData as NeighborhoodStatusRow[]).forEach((item) => {
            statusMap[item.neighborhood_id] = item.status as NeighborhoodStatus;
          });
          setStatus(statusMap);
        }

        if (isMounted) {
          setDataLoaded(true);
          logger.log('Status/comparison data loaded');
        }
      } catch (error) {
        logger.error('Error loading status/comparison data:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user?.id]);

  const syncOptions = {
    userId: user?.id,
    dataLoaded,
    isSyncing: isSyncingRef,
  };

  // Sync comparison to Supabase
  useSyncToSupabase(
    comparison,
    useCallback(async () => syncComparison(user?.id ?? '', comparison), [user?.id, comparison]),
    'comparison',
    syncOptions
  );

  // Sync neighborhood statuses to Supabase
  useSyncRecordToSupabase(
    status,
    useCallback(
      async (neighborhoodId: string, statusValue: NeighborhoodStatus) =>
        syncNeighborhoodStatus(user?.id ?? '', neighborhoodId, statusValue ?? ''),
      [user?.id]
    ),
    'statuses',
    syncOptions
  );

  const setNeighborhoodStatus = useCallback((id: string, newStatus: NeighborhoodStatus) => {
    setStatus((prev) => {
      if (newStatus === null) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newStatus };
    });
  }, []);

  const getNeighborhoodsByStatus = useCallback((filterStatus: NeighborhoodStatus) => {
    return Object.entries(status)
      .filter(([_, s]) => s === filterStatus)
      .map(([id]) => id);
  }, [status]);

  const toggleComparison = useCallback((id: string) => {
    setComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((compId) => compId !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const isInComparison = useCallback((id: string) => comparison.includes(id), [comparison]);

  const clearComparison = useCallback(() => setComparison([]), []);

  return (
    <StatusComparisonContext.Provider
      value={{
        status,
        setNeighborhoodStatus,
        getNeighborhoodsByStatus,
        comparison,
        toggleComparison,
        isInComparison,
        clearComparison,
      }}
    >
      {children}
    </StatusComparisonContext.Provider>
  );
}

export function useStatusComparison() {
  const context = useContext(StatusComparisonContext);
  if (!context) {
    throw new Error('useStatusComparison must be used within StatusComparisonProvider');
  }
  return context;
}
