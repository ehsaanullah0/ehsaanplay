import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

interface BackEntry {
  id: string;
  priority: number;
  seq: number;
  handler: () => void;
}

interface BackNavigationContextValue {
  hasRegisteredBackAction: boolean;
  registerEntry: (id: string, priority: number, handler: () => void) => void;
  unregisterEntry: (id: string) => void;
  triggerTopBackAction: () => boolean;
}

const BackNavigationContext = createContext<BackNavigationContextValue | null>(null);

export const BackNavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const entriesRef = useRef<Map<string, BackEntry>>(new Map());
  const seqCounterRef = useRef<number>(0);
  const [activeCount, setActiveCount] = useState<number>(0);

  const registerEntry = useCallback(
    (id: string, priority: number, handler: () => void) => {
      const existing = entriesRef.current.get(id);
      const seq = existing ? existing.seq : ++seqCounterRef.current;
      entriesRef.current.set(id, { id, priority, seq, handler });
      setActiveCount(entriesRef.current.size);
    },
    []
  );

  const unregisterEntry = useCallback((id: string) => {
    if (entriesRef.current.delete(id)) {
      setActiveCount(entriesRef.current.size);
    }
  }, []);

  const triggerTopBackAction = useCallback((): boolean => {
    if (entriesRef.current.size === 0) return false;
    let topEntry: BackEntry | null = null;
    for (const entry of entriesRef.current.values()) {
      if (
        !topEntry ||
        entry.priority > topEntry.priority ||
        (entry.priority === topEntry.priority && entry.seq > topEntry.seq)
      ) {
        topEntry = entry;
      }
    }
    if (!topEntry) return false;
    topEntry.handler();
    return true;
  }, []);

  return (
    <BackNavigationContext.Provider
      value={{
        hasRegisteredBackAction: activeCount > 0,
        registerEntry,
        unregisterEntry,
        triggerTopBackAction,
      }}
    >
      {children}
    </BackNavigationContext.Provider>
  );
};

export function useBackNavigation() {
  const ctx = useContext(BackNavigationContext);
  if (!ctx) {
    return {
      hasRegisteredBackAction: false,
      triggerTopBackAction: () => false,
    };
  }
  return {
    hasRegisteredBackAction: ctx.hasRegisteredBackAction,
    triggerTopBackAction: ctx.triggerTopBackAction,
  };
}

/**
 * Registers a modal/popup/sheet back handler onto the LIFO prioritized stack
 * whenever `isActive` is true, enabling the bottom-left FloatingBackButton
 * (and OS back / Escape gestures) to step back cleanly through overlays.
 */
export function useRegisterBackAction(
  isActive: boolean,
  onBack: () => void,
  priority: number = 30
) {
  const ctx = useContext(BackNavigationContext);
  const id = useId();
  const handlerRef = useRef(onBack);
  handlerRef.current = onBack;

  useEffect(() => {
    if (!ctx) return;
    if (isActive) {
      ctx.registerEntry(id, priority, () => handlerRef.current());
      return () => {
        ctx.unregisterEntry(id);
      };
    } else {
      ctx.unregisterEntry(id);
    }
  }, [ctx, id, isActive, priority]);
}
