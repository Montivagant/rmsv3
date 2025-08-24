import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../components';
import { zReportEngine } from './engine';
import { useEventStore } from '../events/context';
import { getRole } from '../rbac/roles';
import type { ZReportData, CashReconciliation } from './types';

interface ZReportProps {
  onReportGenerated?: (report: ZReportData) => void;
}

export function ZReport({ onReportGenerated }: ZReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentReport, setCurrentReport] = useState<ZReportData | null>(null);
  const [cashReconciliation, setCashReconciliation] = useState<CashReconciliation>({
    expectedCash: 0,
    actualCash: 0,
    variance: 0,
    notes: ''
  });

  // Get the event store at component level to avoid hook violations
  const eventStore = useEventStore();
  
  const currentUser = getRole(); // In real app, get from auth context
  
  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Get all events from the event store
      const events = eventStore.getAll();
      
      // Generate the Z-Report
      const report = zReportEngine.generateZReport(events, {
        businessDate: selectedDate,
        operatorId: 'current-user', // In real app, get from auth
        operatorName: currentUser,
        cashReconciliation
      }, 0); // In real app, get last report number from storage
      
      setCurrentReport(report);
      onReportGenerated?.(report);
      
    } catch (error) {
      console.error('Failed to generate Z-Report:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const finalizeReport = () => {
    if (!currentReport) return;
    
    try {
      
      // 1. Store the Z-report finalization event
      const finalizedAt = new Date().toISOString();
      const finalizedBy = currentUser;
      
      const result = eventStore.append('z-report.finalized', {
        reportId: currentReport.reportId,
        reportNumber: currentReport.reportNumber,
        businessDate: currentReport.businessDate,
        operatorId: currentReport.operatorId,
        operatorName: currentReport.operatorName,
        salesSummary: currentReport.salesSummary,
        paymentSummary: currentReport.paymentSummary,
        taxSummary: currentReport.taxSummary,
        topItems: currentReport.topItems,
        discountSummary: currentReport.discountSummary,
        finalizedAt,
        finalizedBy,
        cashReconciliation
      }, {
        key: `z-report:${currentReport.businessDate}`,
        params: { reportId: currentReport.reportId, businessDate: currentReport.businessDate },
        aggregate: { id: currentReport.reportId, type: 'z-report' }
      });
      
      // Update local state
      const finalizedReport: ZReportData = {
        ...currentReport,
        status: 'finalized',
        finalizedAt,
        finalizedBy
      };
      
      setCurrentReport(finalizedReport);
      
      if (result.isNew) {
        console.log('✅ Z-Report finalized and stored as event:', finalizedReport.reportId);
        
        // 2. Business date is now locked (implicit - no more sales events should be allowed for this date)
        // 3. Daily counters reset (handled by next day's report generation)
        // 4. Export to accounting system (could trigger external webhook here)
        
        onReportGenerated?.(finalizedReport);
      } else {
        console.log('ℹ️ Z-Report already finalized (deduped):', finalizedReport.reportId);
      }
      
    } catch (error) {
      console.error('Failed to finalize Z-Report:', error);
      // Could show toast notification here
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };
  
  const updateCashReconciliation = (field: keyof CashReconciliation, value: number | string) => {
    const updated = { ...cashReconciliation, [field]: value };
    if (field === 'expectedCash' || field === 'actualCash') {
      updated.variance = (updated.actualCash || 0) - (updated.expectedCash || 0);
    }
    setCashReconciliation(updated);
  };
  
  return (
    <div className="space-y-6">
      {/* Report Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>End of Day Report (Z-Report)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Operator</label>
              <Input
                value={currentUser}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Z-Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cash Reconciliation */}
      {currentReport && (
        <Card>
          <CardHeader>
            <CardTitle>Cash Reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expected Cash</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashReconciliation.expectedCash}
                  onChange={(e) => updateCashReconciliation('expectedCash', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actual Cash</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashReconciliation.actualCash}
                  onChange={(e) => updateCashReconciliation('actualCash', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Variance</label>
                <Input
                  value={formatCurrency(cashReconciliation.variance)}
                  disabled
                  className={`${
                    cashReconciliation.variance === 0 
                      ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : cashReconciliation.variance > 0
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input
                value={cashReconciliation.notes}
                onChange={(e) => updateCashReconciliation('notes', e.target.value)}
                placeholder="Optional notes about cash reconciliation..."
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Z-Report Display */}
      {currentReport && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Z-Report #{currentReport.reportId}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateTime(currentReport.startTime)} - {formatDateTime(currentReport.endTime)}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentReport.status === 'finalized' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {currentReport.status === 'finalized' ? 'Finalized' : 'Draft'}
                </span>
                {currentReport.status === 'draft' && (
                  <Button onClick={finalizeReport} variant="outline">
                    Finalize Report
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
          
          {/* Sales Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(currentReport.salesSummary.finalTotal)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Sales</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {currentReport.salesSummary.transactionCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {currentReport.salesSummary.itemCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Items Sold</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(currentReport.salesSummary.averageTicket)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Average Ticket</div>
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex justify-between">
                  <span>Gross Sales:</span>
                  <span className="font-medium">{formatCurrency(currentReport.salesSummary.grossSales)}</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Total Discounts:</span>
                  <span className="font-medium">-{formatCurrency(currentReport.salesSummary.totalDiscounts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Sales:</span>
                  <span className="font-medium">{formatCurrency(currentReport.salesSummary.netSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span className="font-medium">{formatCurrency(currentReport.salesSummary.totalTax)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Final Total:</span>
                  <span>{formatCurrency(currentReport.salesSummary.finalTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Cash:</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(currentReport.paymentSummary.cash.amount)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentReport.paymentSummary.cash.count} transactions
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Card:</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(currentReport.paymentSummary.card.amount)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentReport.paymentSummary.card.count} transactions
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Other:</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(currentReport.paymentSummary.other.amount)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentReport.paymentSummary.other.count} transactions
                    </div>
                  </div>
                </div>
                <hr />
                <div className="flex justify-between items-center font-bold">
                  <span>Total:</span>
                  <div className="text-right">
                    <div>{formatCurrency(currentReport.paymentSummary.total.amount)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentReport.paymentSummary.total.count} transactions
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tax Summary */}
          {currentReport.taxSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tax Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentReport.taxSummary.map((tax, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{(tax.rate * 100).toFixed(1)}% Tax:</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(tax.taxAmount)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          on {formatCurrency(tax.taxableAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Items */}
          {currentReport.topItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentReport.topItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.revenue)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.quantity} sold
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
