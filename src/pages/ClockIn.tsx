/**
 * Clock-in/Clock-out Page
 * Standalone page for staff to manage their shifts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../hooks/useToast';
import { useShiftService, getActiveShift } from '../shifts/service';
import { cn } from '../lib/utils';

export default function Clockin() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startShift, endShift } = useShiftService();
  const [activeShift, setActiveShift] = useState(getActiveShift());
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Refresh active shift state when component mounts
  useEffect(() => {
    setActiveShift(getActiveShift());
  }, []);

  const handleClockIn = async () => {
    if (!pin.trim()) {
      showToast({
        title: 'PIN Required',
        description: 'Please enter your 4-6 digit PIN',
        variant: 'error'
      });
      return;
    }

    if (pin.length < 4) {
      showToast({
        title: 'Invalid PIN',
        description: 'PIN must be at least 4 digits long',
        variant: 'error'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await startShift(pin);
      if (result.success) {
        setActiveShift(getActiveShift());
        setPin('');
        showToast({
          title: 'Shift Started',
          description: 'You are now clocked in. Have a great shift!',
          variant: 'success'
        });
      } else {
        showToast({
          title: 'Clock-in Failed',
          description: result.error || 'Failed to start shift. Please check your PIN.',
          variant: 'error'
        });
      }
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setIsProcessing(true);
    try {
      const result = await endShift();
      if (result.success) {
        setActiveShift(getActiveShift());
        showToast({
          title: 'Shift Ended',
          description: 'You have been clocked out. Thank you for your work!',
          variant: 'success'
        });
      } else {
        showToast({
          title: 'Clock-out Failed',
          description: result.error || 'Failed to end shift. Please try again.',
          variant: 'error'
        });
      }
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetupPin = () => {
    if (!newPin || newPin.length < 4) {
      showToast({
        title: 'Invalid PIN',
        description: 'PIN must be at least 4 digits long',
        variant: 'error'
      });
      return;
    }

    if (newPin !== confirmPin) {
      showToast({
        title: 'PIN Mismatch',
        description: 'PINs do not match. Please try again.',
        variant: 'error'
      });
      return;
    }

    try {
      localStorage.setItem('rms_user_pin', newPin);
      setShowPinSetup(false);
      setNewPin('');
      setConfirmPin('');
      showToast({
        title: 'PIN Set Successfully',
        description: 'Your PIN has been saved. You can now clock in.',
        variant: 'success'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to save PIN. Please try again.',
        variant: 'error'
      });
    }
  };

  const formatShiftTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getShiftDuration = (startTime: number) => {
    const now = Date.now();
    const duration = now - startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Clock-in / Clock-out
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your work shifts
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  activeShift ? "bg-green-500" : "bg-gray-400"
                )} />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeShift ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Currently Clocked In
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Since: {formatShiftTime(activeShift.startedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-800 dark:text-green-200">
                        {getShiftDuration(activeShift.startedAt)}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Duration
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Employee ID:</span>
                      <span className="font-medium">{activeShift.userId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shift Started:</span>
                      <span className="font-medium">{formatShiftTime(activeShift.startedAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">Restaurant</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">
                    Not Clocked In
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use the form on the right to start your shift
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clock-in/Clock-out Actions */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeShift ? 'Clock Out' : 'Clock In'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeShift ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      Ready to end your shift?
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Make sure all your tasks are completed before clocking out.
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleClockOut}
                    disabled={isProcessing}
                    className="w-full"
                    variant="destructive"
                  >
                    {isProcessing ? 'Processing...' : 'Clock Out'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="pin" className="text-sm font-medium">
                      Employee PIN
                    </label>
                    <Input
                      id="pin"
                      type="password"
                      placeholder="Enter your 4-6 digit PIN"
                      value={pin}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setPin(value);
                      }}
                      maxLength={6}
                      disabled={isProcessing}
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onKeyPress={(e) => {
                        // Block non-numeric keys except Enter and Backspace
                        if (!/[0-9]/.test(e.key) && e.key !== 'Enter' && e.key !== 'Backspace') {
                          e.preventDefault();
                        }
                        if (e.key === 'Enter') {
                          handleClockIn();
                        }
                      }}
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      Starting your shift
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Enter your PIN and click Clock In to start tracking your work hours.
                    </p>
                    {import.meta.env.DEV && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                        💡 Development: Use PIN "1234" for testing
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleClockIn}
                      disabled={isProcessing || !pin.trim()}
                      className="w-full"
                    >
                      {isProcessing ? 'Processing...' : 'Clock In'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowPinSetup(true)}
                      disabled={isProcessing}
                      className="w-full text-sm"
                    >
                      Set up / Change PIN
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PIN Setup Modal */}
        {showPinSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Set up your PIN</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newPin" className="text-sm font-medium">
                    New PIN (4-6 digits)
                  </label>
                  <Input
                    id="newPin"
                    type="password"
                    placeholder="Enter new PIN"
                    value={newPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setNewPin(value);
                    }}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key) && e.key !== 'Enter' && e.key !== 'Backspace') {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPin" className="text-sm font-medium">
                    Confirm PIN
                  </label>
                  <Input
                    id="confirmPin"
                    type="password"
                    placeholder="Confirm new PIN"
                    value={confirmPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setConfirmPin(value);
                    }}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key) && e.key !== 'Enter' && e.key !== 'Backspace') {
                        e.preventDefault();
                      }
                      if (e.key === 'Enter') {
                        handleSetupPin();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPinSetup(false);
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSetupPin}
                    disabled={!newPin || !confirmPin || newPin.length < 4}
                    className="flex-1"
                  >
                    Save PIN
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Shifts (placeholder for future enhancement) */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Shift history will be displayed here in a future update.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}