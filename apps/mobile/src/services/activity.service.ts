import { api } from './api';
import { storage } from '../utils/storage';
import {
  SyncActivityInput,
  ActivityQueryInput,
  SportActivityType,
  ActivityVisibility,
} from '@sportup/shared';

const OFFLINE_QUEUE_KEY = '@sportup_offline_activities';
const ACTIVE_WORKOUT_KEY = '@sportup_active_workout_backup';

export interface ActivitySummaryStats {
  totalDistanceKm: number;
  totalDurationSec: number;
  totalElevationGainM: number;
  totalCalories: number;
  totalActivities: number;
}

export interface ActivityListResponse {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: ActivitySummaryStats;
}

export const activityService = {
  /**
   * Syncs an activity to the backend with idempotency support.
   */
  async syncActivity(payload: SyncActivityInput): Promise<{ data: any; isDuplicate: boolean }> {
    try {
      const response = await api.post('/runs/sync', payload);
      return {
        data: response.data.data,
        isDuplicate: Boolean(response.data.isDuplicate),
      };
    } catch (error) {
      // If network failure, queue locally for later sync
      await activityService.queueOfflineActivity(payload);
      throw error;
    }
  },

  /**
   * Fetches paginated user activities with optional sport filter.
   */
  async getMyActivities(params?: ActivityQueryInput): Promise<ActivityListResponse> {
    const response = await api.get('/runs/my-runs', { params });
    return response.data;
  },

  /**
   * Fetches full details for a specific activity (including complete route and splits).
   */
  async getActivityDetails(id: string) {
    const response = await api.get(`/runs/${id}`);
    return response.data.data;
  },

  /**
   * Exports an activity to a GPX XML string.
   */
  async getGpxData(id: string): Promise<string> {
    const response = await api.get(`/runs/${id}/gpx`, {
      responseType: 'text',
    });
    return response.data;
  },

  /**
   * Imports a GPX XML file as a new activity.
   */
  async importGpx(gpxXml: string, title?: string, sportType?: SportActivityType) {
    const response = await api.post('/runs/import-gpx', {
      gpxXml,
      title,
      sportType: sportType || SportActivityType.RUN,
    });
    return response.data.data;
  },

  // ─── Offline Queue Management ────────────────────────────

  async queueOfflineActivity(activity: SyncActivityInput): Promise<void> {
    try {
      const existingQueueRaw = await storage.getItem(OFFLINE_QUEUE_KEY);
      const queue: SyncActivityInput[] = existingQueueRaw ? JSON.parse(existingQueueRaw) : [];
      
      // Avoid duplicate queue entries if same clientSessionId
      const alreadyQueued = queue.some(
        (item) => item.clientSessionId && item.clientSessionId === activity.clientSessionId
      );

      if (!alreadyQueued) {
        queue.push(activity);
        await storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (err) {
      console.warn('Failed to save offline activity to queue', err);
    }
  },

  async getOfflineQueue(): Promise<SyncActivityInput[]> {
    try {
      const existingQueueRaw = await storage.getItem(OFFLINE_QUEUE_KEY);
      return existingQueueRaw ? JSON.parse(existingQueueRaw) : [];
    } catch {
      return [];
    }
  },

  async syncPendingOfflineActivities(): Promise<{ syncedCount: number; errors: number }> {
    const queue = await activityService.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0, errors: 0 };

    const remainingQueue: SyncActivityInput[] = [];
    let syncedCount = 0;
    let errors = 0;

    for (const item of queue) {
      try {
        await api.post('/runs/sync', item);
        syncedCount++;
      } catch (err) {
        errors++;
        remainingQueue.push(item);
      }
    }

    await storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    return { syncedCount, errors };
  },

  // ─── Crash Recovery Persistence ──────────────────────────

  async saveActiveSessionSnapshot(snapshot: any): Promise<void> {
    try {
      await storage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('Failed to save workout backup snapshot', err);
    }
  },

  async getActiveSessionSnapshot(): Promise<any | null> {
    try {
      const raw = await storage.getItem(ACTIVE_WORKOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async clearActiveSessionSnapshot(): Promise<void> {
    try {
      await storage.deleteItem(ACTIVE_WORKOUT_KEY);
    } catch {
      // silent
    }
  },
};
