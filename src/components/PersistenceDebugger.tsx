/**
 * Debug component to show persistence status and stored events
 * Helps verify that orders are actually being saved
 */

import { useState, useContext } from 'react';
import { useEventStore } from '../events/context';
import { formatDateTime, formatCurrency } from '../lib/format';
import { isSaleRecorded } from '../events/guards';
import { Card, CardHeader, CardTitle, CardContent, Button } from './index';

export function PersistenceDebugger() {
  const [isOpen, setIsOpen] = useState(false);

  // Safely try to get the store - return null if not ready
  let store = null;
  try {
    store = useEventStore();
  } catch (error) {
    // Store not ready yet, show nothing
    return null;
  }

  const events = store.getAll();
  const salesEvents = events.filter(isSaleRecorded);
  
  // Get storage info if available
  const storageInfo = 'getStorageInfo' in store ? (store as any).getStorageInfo() : null;

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          🔍 Debug Persistence ({salesEvents.length} sales)
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="max-h-96 overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Persistence Debug</CardTitle>
          <Button 
            onClick={() => setIsOpen(false)}
            variant="outline"
            className="text-xs"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          {/* Storage Status */}
          <div className="border-b pb-2">
            <p className="font-semibold">📊 Storage Status:</p>
            <p>Total Events: {events.length}</p>
            <p>Sales Events: {salesEvents.length}</p>
            {storageInfo && (
              <>
                <p>Storage Used: {Math.round(storageInfo.used / 1024)}KB</p>
                <p>Items in Storage: {storageInfo.itemCount}</p>
              </>
            )}
          </div>

          {/* Recent Sales */}
          <div>
            <p className="font-semibold">💰 Recent Sales:</p>
            {salesEvents.length === 0 ? (
              <p className="text-gray-500 italic">No sales recorded yet</p>
            ) : (
              <div className="space-y-1">
                {salesEvents.slice(-3).reverse().map((event) => (
                  <div key={event.id} className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <p className="font-medium">
                      {formatCurrency(event.payload.totals.total)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {event.payload.lines.length} items • {formatDateTime(event.at)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Ticket: {event.payload.ticketId}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t pt-2 space-y-1">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full text-xs"
              variant="outline"
            >
              🔄 Test Persistence (Refresh Page)
            </Button>
            <Button 
              onClick={() => {
                console.log('All Events:', events);
                console.log('Sales Events:', salesEvents);
                if (storageInfo) console.log('Storage Info:', storageInfo);
              }}
              className="w-full text-xs"
              variant="outline"
            >
              📝 Log to Console
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
