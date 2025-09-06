import type { Event } from '../events/types';
import type { ZReportData, ZReportRequest } from './types';
import { isSaleRecorded, isPaymentSucceeded } from '../events/guards';

/**
 * Z-Report Engine - Generates End of Day reports from event data
 */
export class ZReportEngine {
  
  /**
   * Generate a Z-Report for a specific business date
   */
  generateZReport(
    events: Event[], 
    request: ZReportRequest, 
    lastReportNumber = 0
  ): ZReportData {
    const { businessDate, operatorId, operatorName } = request;
    
    // Filter events for the business date
    const dayEvents = this.filterEventsByDate(events, businessDate);
    const saleEvents = dayEvents.filter(isSaleRecorded);
    const paymentEvents = dayEvents.filter(isPaymentSucceeded);
    
    // Calculate sales summary
    const salesSummary = this.calculateSalesSummary(saleEvents);
    
    // Calculate payment summary
    const paymentSummary = this.calculatePaymentSummary(paymentEvents);
    
    // Calculate tax breakdown
    const taxSummary = this.calculateTaxSummary(saleEvents);
    
    // Calculate top items
    const topItems = this.calculateTopItems(saleEvents);
    
    // Calculate discount summary
    const discountSummary = this.calculateDiscountSummary(saleEvents);
    
    const reportNumber = lastReportNumber + 1;
    const reportId = `Z${reportNumber.toString().padStart(3, '0')}-${businessDate}`;
    
    return {
      reportId,
      reportNumber,
      businessDate,
      startTime: this.getStartTime(dayEvents),
      endTime: this.getEndTime(dayEvents),
      operatorId,
      operatorName,
      salesSummary,
      paymentSummary,
      taxSummary,
      topItems,
      discountSummary,
      status: 'draft'
    };
  }
  
  /**
   * Filter events by business date (handles day boundaries)
   */
  private filterEventsByDate(events: Event[], businessDate: string): Event[] {
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`).getTime();
    const endOfDay = new Date(`${businessDate}T23:59:59.999Z`).getTime();
    
    return events.filter(event => 
      event.at >= startOfDay && event.at <= endOfDay
    );
  }
  
  /**
   * Calculate sales summary from sale events
   */
  private calculateSalesSummary(saleEvents: Event[]) {
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    const transactionCount = saleEvents.length;
    let itemCount = 0;
    
    for (const event of saleEvents) {
      const payload = event.payload as any;
      if (payload.totals) {
        grossSales += payload.totals.subtotal || 0;
        totalDiscounts += payload.totals.discount || 0;
        totalTax += payload.totals.tax || 0;
      }
      
      if (payload.lines) {
        itemCount += payload.lines.reduce((sum: number, line: any) => sum + (line.qty || 0), 0);
      }
    }
    
    const netSales = grossSales - totalDiscounts;
    const finalTotal = netSales + totalTax;
    const averageTicket = transactionCount > 0 ? finalTotal / transactionCount : 0;
    
    return {
      grossSales: Math.round(grossSales * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      transactionCount,
      itemCount,
      averageTicket: Math.round(averageTicket * 100) / 100
    };
  }
  
  /**
   * Calculate payment method breakdown
   */
  private calculatePaymentSummary(paymentEvents: Event[]) {
    let cashCount = 0, cashAmount = 0;
    let cardCount = 0, cardAmount = 0;
    let otherCount = 0, otherAmount = 0;
    
    for (const event of paymentEvents) {
      const payload = event.payload as any;
      const amount = payload.amount || 0;
      const provider = payload.provider || 'unknown';
      
      // Classify payment method (simplified logic)
      if (provider.toLowerCase().includes('cash')) {
        cashCount++;
        cashAmount += amount;
      } else if (provider.toLowerCase().includes('card') || provider.toLowerCase().includes('stripe')) {
        cardCount++;
        cardAmount += amount;
      } else {
        otherCount++;
        otherAmount += amount;
      }
    }
    
    return {
      cash: { count: cashCount, amount: Math.round(cashAmount * 100) / 100 },
      card: { count: cardCount, amount: Math.round(cardAmount * 100) / 100 },
      other: { count: otherCount, amount: Math.round(otherAmount * 100) / 100 },
      total: { 
        count: cashCount + cardCount + otherCount, 
        amount: Math.round((cashAmount + cardAmount + otherAmount) * 100) / 100 
      }
    };
  }
  
  /**
   * Calculate tax summary by rate
   */
  private calculateTaxSummary(saleEvents: Event[]) {
    const taxRates = new Map<number, { taxableAmount: number; taxAmount: number }>();
    
    for (const event of saleEvents) {
      const payload = event.payload as any;
      if (payload.lines) {
        for (const line of payload.lines) {
          const rate = line.taxRate || 0;
          const lineTotal = (line.price || 0) * (line.qty || 0);
          const taxAmount = lineTotal * rate;
          
          const existing = taxRates.get(rate) || { taxableAmount: 0, taxAmount: 0 };
          existing.taxableAmount += lineTotal;
          existing.taxAmount += taxAmount;
          taxRates.set(rate, existing);
        }
      }
    }
    
    return Array.from(taxRates.entries()).map(([rate, data]) => ({
      rate,
      taxableAmount: Math.round(data.taxableAmount * 100) / 100,
      taxAmount: Math.round(data.taxAmount * 100) / 100
    }));
  }
  
  /**
   * Calculate top selling items
   */
  private calculateTopItems(saleEvents: Event[]) {
    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    
    for (const event of saleEvents) {
      const payload = event.payload as any;
      if (payload.lines) {
        for (const line of payload.lines) {
          const name = line.name || 'Unknown Item';
          const qty = line.qty || 0;
          const revenue = (line.price || 0) * qty;
          
          const existing = itemMap.get(name) || { quantity: 0, revenue: 0 };
          existing.quantity += qty;
          existing.revenue += revenue;
          itemMap.set(name, existing);
        }
      }
    }
    
    return Array.from(itemMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 items
  }
  
  /**
   * Calculate discount summary
   */
  private calculateDiscountSummary(saleEvents: Event[]) {
    let totalDiscounts = 0;
    let discountCount = 0;
    const loyaltyDiscounts = 0;
    let manualDiscounts = 0;
    
    for (const event of saleEvents) {
      const payload = event.payload as any;
      if (payload.totals?.discount > 0) {
        discountCount++;
        totalDiscounts += payload.totals.discount;
        // Simplified classification - in real system, track discount types
        manualDiscounts += payload.totals.discount;
      }
    }
    
    return {
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      discountCount,
      loyaltyDiscounts: Math.round(loyaltyDiscounts * 100) / 100,
      manualDiscounts: Math.round(manualDiscounts * 100) / 100
    };
  }
  
  private getStartTime(events: Event[]): string {
    if (events.length === 0) return new Date().toISOString();
    const earliest = Math.min(...events.map(e => e.at));
    return new Date(earliest).toISOString();
  }
  
  private getEndTime(events: Event[]): string {
    if (events.length === 0) return new Date().toISOString();
    const latest = Math.max(...events.map(e => e.at));
    return new Date(latest).toISOString();
  }
}

// Singleton instance
export const zReportEngine = new ZReportEngine();
