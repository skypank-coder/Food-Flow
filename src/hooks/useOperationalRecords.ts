import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  saveOperationalRecord,
  watchOperationalRecords,
  type OperationalRecord,
} from "@/lib/operationalData";
import { firebaseErrorMessage } from "@/lib/firebase";

export function useOperationalRecords() {
  const { user } = useAuth();
  // Demo sessions (pitch mode) aren't a real Firebase user, so Firestore would
  // deny them. Keep their updates in local state instead — the buttons still
  // work, with no permission errors.
  const isDemo = user?.uid === "demo";
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    if (isDemo) {
      setRecords([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return watchOperationalRecords(
      user.uid,
      (nextRecords) => {
        setRecords(nextRecords);
        setError(null);
        setLoading(false);
      },
      (watchError) => {
        setError(firebaseErrorMessage(watchError));
        setLoading(false);
      },
    );
  }, [user, isDemo]);

  const save = useCallback(
    async (record: OperationalRecord) => {
      if (!user) {
        setError("Sign in to save operational updates.");
        return;
      }
      const key = `${record.kind}-${record.id}`;
      if (isDemo) {
        setRecords((prev) => [...prev.filter((r) => `${r.kind}-${r.id}` !== key), record]);
        return;
      }
      setSaving(key);
      setError(null);
      try {
        await saveOperationalRecord(record, user.uid);
      } catch (saveError) {
        setError(firebaseErrorMessage(saveError));
      } finally {
        setSaving(null);
      }
    },
    [user, isDemo],
  );

  return { records, loading, saving, error, save };
}
