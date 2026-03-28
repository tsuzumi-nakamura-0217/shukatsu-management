import { useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  enabled?: boolean;
  hasChanges: boolean;
  onSave: () => void | Promise<void>;
  delay?: number;
  deps?: ReadonlyArray<unknown>;
}

export function useAutoSave({
  enabled = true,
  hasChanges,
  onSave,
  delay = 1500,
  deps = [],
}: UseAutoSaveOptions): void {
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled || !hasChanges) return;

    const timer = setTimeout(() => {
      void onSaveRef.current();
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, hasChanges, delay, ...deps]);
}
