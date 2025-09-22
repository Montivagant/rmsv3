/**
 * Notification system that generates notifications from business events
 */

import { useEventStore } from '../events/context';
import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'order' | 'stock' | 'system' | 'payment' | 'transfer';
  message: string;
  time: string;
  timestamp: number;
  eventId?: string;
  read: boolean;
  actionUrl?: string; // URL to navigate when clicked
}

// Create notifications from events
function createNotificationFromEvent(event: any): Notification | null {
  const now = Date.now();
  const timeAgo = formatTimeAgo(now - event.at);

  switch (event.type) {
    case 'inventory.reorder_alert.created':
      return {
        id: `reorder-${event.id}`,
        type: 'stock',
        message: `Low stock alert: ${event.payload?.alert?.itemName || 'Item'}`,
        time: timeAgo,
        timestamp: event.at,
        eventId: event.id,
        read: false,
        actionUrl: '/inventory/items'
      };

    case 'inventory.expiration_alert.created':
      return {
        id: `expiry-${event.id}`,
        type: 'stock',
        message: `Items expiring in ${event.payload?.daysUntilExpiration} days`,
        time: timeAgo,
        timestamp: event.at,
        eventId: event.id,
        read: false,
        actionUrl: '/inventory/audit'
      };

    case 'payment.failed':
      return {
        id: `payment-${event.id}`,
        type: 'payment',
        message: `Payment failed for order #${event.payload?.orderId || 'N/A'}`,
        time: timeAgo,
        timestamp: event.at,
        eventId: event.id,
        read: false,
        actionUrl: '/orders/active'
      };

    case 'inventory.transfer.initiated':
      return {
        id: `transfer-${event.id}`,
        type: 'transfer',
        message: `Stock transfer initiated: ${event.payload?.fromLocation} → ${event.payload?.toLocation}`,
        time: timeAgo,
        timestamp: event.at,
        eventId: event.id,
        read: false,
        actionUrl: '/inventory/transfers'
      };

    case 'sale.recorded':
      if (event.payload?.total > 100) {
        return {
          id: `order-${event.id}`,
          type: 'order',
          message: `Large order completed: $${Number(event.payload.total).toFixed(2)}`,
          time: timeAgo,
          timestamp: event.at,
          eventId: event.id,
          read: false,
          actionUrl: '/orders/history'
        };
      }
      return null;

    case 'audit.logged':
      if (event.payload?.level === 'error') {
        return {
          id: `audit-${event.id}`,
          type: 'system',
          message: event.payload?.message || 'System error occurred',
          time: timeAgo,
          timestamp: event.at,
          eventId: event.id,
          read: false
        };
      }
      return null;

    default:
      return null;
  }
}

// Format time ago string
function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return 'Just now';
}

// Custom hook for notifications
export function useNotifications() {
  const eventStore = useEventStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const allEvents = eventStore.getAll();
      const events = allEvents
        .filter(event => event.at >= oneDayAgo)
        .slice(0, 50);
      const notifs = events
        .map(createNotificationFromEvent)
        .filter((n): n is Notification => !!n)
        .sort((a: Notification, b: Notification) => b.timestamp - a.timestamp)
        .slice(0, 20);
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
    } catch {
      // Silent fallback to no notifications
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [eventStore]);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: loadNotifications };
}
