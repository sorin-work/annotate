import { api, toQuery } from './client';
import type { ActivityPage } from './types';

export const activityApi = {
  list: (before?: string | null) =>
    api.get<ActivityPage>(`/activity${toQuery({ before, limit: 30 })}`),
};
