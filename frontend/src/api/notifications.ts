import { API_BASE, authHeader } from './headers';

export interface NotificationItem {
  id: string;
  caseId: string;
  orderId: string;
  type: string;
  title: string;
  detail: string;
  amountPaise: number;
  target: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export const getNotifications = async (token?: string): Promise<NotificationsResponse> => {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('finathon_jwt_token') || '' : '');
  const res = await fetch(`${API_BASE}/api/notifications`, {
    headers: authHeader(authToken),
  });
  if (!res.ok) {
    if (res.status === 401) {
      return { unreadCount: 0, notifications: [] };
    }
    throw new Error(`Failed to fetch notifications: HTTP ${res.status}`);
  }
  return res.json();
};

export const markNotificationsRead = async (id?: string, token?: string): Promise<{ success: boolean; readCount: number }> => {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('finathon_jwt_token') || '' : '');
  const res = await fetch(`${API_BASE}/api/notifications/read`, {
    method: 'POST',
    headers: authHeader(authToken),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    throw new Error(`Failed to mark notifications read: HTTP ${res.status}`);
  }
  return res.json();
};
