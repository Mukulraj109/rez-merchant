import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FormPersistenceOptions<T> {
  /** Unique storage key for this form */
  key: string;
  /** Form data to persist */
  formData: T;
  /** Callback when draft is loaded */
  onDraftLoaded?: (draft: T) => void;
  /** Auto-save interval in milliseconds (default: 30000 = 30s) */
  autoSaveInterval?: number;
  /** Debounce delay for saving on form changes in milliseconds (default: 2000 = 2s) */
  debounceDelay?: number;
  /** Number of days before draft expires (default: 7) */
  expiryDays?: number;
  /** Fields to exclude from persistence (e.g., sensitive data, computed values) */
  excludeFields?: (keyof T)[];
  /** Enable/disable persistence */
  enabled?: boolean;
}

export interface DraftMetadata {
  savedAt: string;
  expiresAt: string;
  version: string;
}

export interface PersistedDraft<T> {
  data: T;
  metadata: DraftMetadata;
}

const DRAFT_VERSION = '1.0.0';

/**
 * Hook for persisting form data to AsyncStorage with auto-save and draft management
 *
 * @example
 * ```typescript
 * const {
 *   hasDraft,
 *   draftSavedAt,
 *   loadDraft,
 *   clearDraft,
 *   isSaving,
 *   lastSavedAt
 * } = useFormPersistence({
 *   key: 'product-add-form',
 *   formData,
 *   onDraftLoaded: (draft) => setFormData(draft),
 *   excludeFields: ['images', 'videos'] // Don't persist image blobs
 * });
 * ```
 */
export function useFormPersistence<T extends Record<string, any>>({
  key,
  formData,
  onDraftLoaded,
  autoSaveInterval = 30000, // 30 seconds
  debounceDelay = 2000, // 2 seconds
  expiryDays = 7,
  excludeFields = [],
  enabled = true,
}: FormPersistenceOptions<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousFormDataRef = useRef<T | null>(null);
  const isInitializedRef = useRef(false);

  const STORAGE_KEY = `@form_draft:${key}`;

  /**
   * Filter out excluded fields and prepare data for storage
   */
  const prepareDataForStorage = useCallback((data: T): Partial<T> => {
    const filtered = { ...data };

    // Remove excluded fields
    excludeFields.forEach(field => {
      delete filtered[field];
    });

    // Remove image/video blob data but keep URIs
    Object.keys(filtered).forEach(key => {
      const value = filtered[key];

      // Handle array of objects (like images/videos)
      if (Array.isArray(value)) {
        filtered[key] = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            // Keep only URLs and metadata, remove blobs
            const { uri, url, id, altText, title, thumbnailUrl, sortOrder, isMain, duration } = item;
            return { uri, url, id, altText, title, thumbnailUrl, sortOrder, isMain, duration };
          }
          return item;
        }) as any;
      }
    });

    return filtered;
  }, [excludeFields]);

  /**
   * Save draft to AsyncStorage
   */
  const saveDraft = useCallback(async (data: T) => {
    if (!enabled) return;

    try {
      setIsSaving(true);

      const preparedData = prepareDataForStorage(data);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

      const draft: PersistedDraft<Partial<T>> = {
        data: preparedData,
        metadata: {
          savedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          version: DRAFT_VERSION,
        },
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(now);

      console.log(`[FormPersistence] Draft saved for key: ${key}`);
    } catch (error) {
      console.error(`[FormPersistence] Error saving draft for key ${key}:`, error);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, key, STORAGE_KEY, prepareDataForStorage, expiryDays]);

  /**
   * Load draft from AsyncStorage
   */
  const loadDraft = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (!stored) {
        console.log(`[FormPersistence] No draft found for key: ${key}`);
        return false;
      }

      const draft: PersistedDraft<Partial<T>> = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(draft.metadata.expiresAt);

      // Check if draft has expired
      if (now > expiresAt) {
        console.log(`[FormPersistence] Draft expired for key: ${key}`);
        await clearDraft();
        return false;
      }

      const savedAt = new Date(draft.metadata.savedAt);
      setDraftSavedAt(savedAt);
      setHasDraft(true);

      console.log(`[FormPersistence] Draft loaded for key: ${key}, saved at: ${savedAt.toLocaleString()}`);

      // Notify parent component
      if (onDraftLoaded) {
        onDraftLoaded(draft.data as T);
      }

      return true;
    } catch (error) {
      console.error(`[FormPersistence] Error loading draft for key ${key}:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [enabled, key, STORAGE_KEY, onDraftLoaded]);

  /**
   * Clear draft from AsyncStorage
   */
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);
      setDraftSavedAt(null);
      setLastSavedAt(null);
      console.log(`[FormPersistence] Draft cleared for key: ${key}`);
    } catch (error) {
      console.error(`[FormPersistence] Error clearing draft for key ${key}:`, error);
    }
  }, [key, STORAGE_KEY]);

  /**
   * Manually trigger a save
   */
  const saveNow = useCallback(() => {
    saveDraft(formData);
  }, [formData, saveDraft]);

  /**
   * Check if form data has changed
   */
  const hasFormDataChanged = useCallback((current: T, previous: T | null): boolean => {
    if (!previous) return false;
    return JSON.stringify(current) !== JSON.stringify(previous);
  }, []);

  /**
   * Initialize - check for existing draft on mount
   */
  useEffect(() => {
    if (!isInitializedRef.current && enabled) {
      isInitializedRef.current = true;
      loadDraft();
    }
  }, [enabled, loadDraft]);

  /**
   * Debounced save on form data change
   */
  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return;

    const hasChanged = hasFormDataChanged(formData, previousFormDataRef.current);

    if (hasChanged) {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        saveDraft(formData);
      }, debounceDelay);
    }

    previousFormDataRef.current = formData;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, enabled, hasFormDataChanged, saveDraft, debounceDelay]);

  /**
   * Auto-save interval
   */
  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return;

    // Set up auto-save interval
    autoSaveTimerRef.current = setInterval(() => {
      const hasChanged = hasFormDataChanged(formData, previousFormDataRef.current);
      if (hasChanged) {
        saveDraft(formData);
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [enabled, formData, autoSaveInterval, hasFormDataChanged, saveDraft]);

  /**
   * Cleanup expired drafts across all forms (utility)
   */
  const cleanupExpiredDrafts = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const draftKeys = allKeys.filter(k => k.startsWith('@form_draft:'));

      const now = new Date();
      let cleanedCount = 0;

      for (const key of draftKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) continue;

        try {
          const draft: PersistedDraft<any> = JSON.parse(stored);
          const expiresAt = new Date(draft.metadata.expiresAt);

          if (now > expiresAt) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // Invalid draft, remove it
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }

      console.log(`[FormPersistence] Cleaned up ${cleanedCount} expired drafts`);
      return cleanedCount;
    } catch (error) {
      console.error('[FormPersistence] Error cleaning up expired drafts:', error);
      return 0;
    }
  }, []);

  return {
    /** Whether a draft exists for this form */
    hasDraft,
    /** When the draft was saved */
    draftSavedAt,
    /** When data was last saved (during current session) */
    lastSavedAt,
    /** Whether a save operation is in progress */
    isSaving,
    /** Whether initial draft check is in progress */
    isLoading,
    /** Load existing draft */
    loadDraft,
    /** Clear the draft */
    clearDraft,
    /** Manually save now (bypasses debounce) */
    saveNow,
    /** Cleanup expired drafts (utility) */
    cleanupExpiredDrafts,
  };
}
