/**
 * Optimized Z-Report Engine
 * 
 * High-performance report generation using indexed queries and caching
 * Replaces linear event scanning with O(1) indexed lookups
 */

import type { ZReportData, ZReportRequest } from './types';
import type { ReportingQueries } from '../events/optimizedQueries';

export class OptimizedZReportEngine {
  private queries: ReportingQueries;
  
  constructor(queries: ReportingQueries) {
    this.queries = queries;
  }
  
  /**
   * Generate a Z-Report for a specific business date (OPTIMIZED)
   * Uses indexed queries instead of linear event scanning
   */
  generateZReport(
    request: ZReportRequest, 
    lastReportNumber = 0
  ): ZReportData {
    const { businessDate, operatorId, operatorName } = request;
    
    console.log(`📊 Generating optimized Z-Report for ${businessDate}...`);
    const startTime = performance.now();

    // Get comprehensive reporting data using optimized queries
    const reportData = this.queries.getBusinessDateReport(businessDate);
    
    const reportNumber = lastReportNumber + 1;
    const reportId = `Z${reportNumber.toString().padStart(3, '0')}-${businessDate}`;
    
    // Calculate start and end times from hourly data
    const nonZeroHours = reportData.hourlySales.filter(h => h.orders > 0);
    const startTime24h = nonZeroHours.length > 0 ? nonZeroHours[0].hour : '00:00';
    const endTime24h = nonZeroHours.length > 0 ? nonZeroHours[nonZeroHours.length - 1].hour : '23:59';
    
    // Convert to timestamps
    const startTimestamp = new Date(`${businessDate}T${startTime24h}:00.000Z`).getTime();
    const endTimestamp = new Date(`${businessDate}T${endTime24h}:59.999Z`).getTime();
    
    // Build comprehensive tax summary (placeholder - needs tax system)
    const taxSummary = this.buildTaxSummary(reportData.sales.totalRevenue);
    
    // Build discount summary (placeholder - needs discount system)
    const discountSummary = this.buildDiscountSummary();
    
    const result: ZReportData = {
      reportId,
      reportNumber,
      businessDate,
      startTime: new Date(startTimestamp).toISOString(),
      endTime: new Date(endTimestamp).toISOString(),
      operatorId,
      operatorName,
      salesSummary: {
        grossSales: reportData.sales.totalRevenue,
        totalDiscounts: 0, // Placeholder until discount system
        netSales: reportData.sales.totalRevenue, // Before tax implementation
        totalTax: 0, // Placeholder until tax system
        finalTotal: reportData.sales.totalRevenue,
        transactionCount: reportData.sales.totalOrders,
        itemCount: reportData.sales.totalItems,
        averageTicket: reportData.sales.averageOrderValue
      },
      paymentSummary: {
        cash: { count: 0, amount: 0 }, // Placeholder until payment system
        card: { count: 0, amount: 0 }, // Placeholder until payment system
        other: { count: 0, amount: 0 }, // Placeholder until payment system
        total: { count: reportData.payments.count, amount: reportData.payments.total }
      },
      taxSummary,
      topItems: reportData.topItems.map(item => ({
        name: `Item ${item.itemId}`, // Would be resolved from product catalog
        quantity: item.quantity,
        revenue: item.revenue
      })),
      discountSummary,
      status: 'draft' as const
    };
    
    const duration = performance.now() - startTime;
    console.log(`✅ Z-Report generated in ${duration.toFixed(2)}ms (optimized)`);
    
    // Log performance metrics
    const metrics = this.queries.getPerformanceMetrics();
    console.log(`📈 Query metrics: ${metrics.cacheHits} cache hits, ${metrics.cacheMisses} misses, avg: ${metrics.averageQueryTime.toFixed(2)}ms`);
    
    return result;
  }
  
  /**
   * Generate multiple reports efficiently (BATCH OPTIMIZED)
   */
  generateBatchReports(dates: string[], operatorId: string, operatorName: string): ZReportData[] {
    console.log(`📊 Generating ${dates.length} optimized reports in batch...`);
    const startTime = performance.now();
    
    const reports = dates.map((date, index) => 
      this.generateZReport({ businessDate: date, operatorId, operatorName }, index)
    );
    
    const duration = performance.now() - startTime;
    console.log(`✅ Batch reports generated in ${duration.toFixed(2)}ms (${(duration / dates.length).toFixed(2)}ms avg)`);
    
    return reports;
  }
  
  /**
   * Get sales trend data (OPTIMIZED)
   */
  getSalesTrend(startDate: string, endDate: string): Array<{ date: string; revenue: number; orders: number }> {
    const trend = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const reportData = this.queries.getBusinessDateReport(dateStr);
      
      trend.push({
        date: dateStr,
        revenue: reportData.sales.totalRevenue,
        orders: reportData.sales.totalOrders
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return trend;
  }
  
  /**
   * Get hourly sales breakdown (OPTIMIZED)
   */
  getHourlySalesBreakdown(businessDate: string) {
    const reportData = this.queries.getBusinessDateReport(businessDate);
    return reportData.hourlySales;
  }
  
  /**
   * Private helper methods
   */
  private buildTaxSummary(grossSales: number) {
    // Placeholder tax calculation until tax system is implemented
    const defaultTaxRate = 0.08; // 8% default
    const taxAmount = grossSales * defaultTaxRate;
    
    return [{
      rate: defaultTaxRate,
      taxableAmount: grossSales,
      taxAmount: taxAmount
    }];
  }
  
  private buildDiscountSummary() {
    // Placeholder discount calculation until discount system is implemented
    return {
      totalDiscounts: 0,
      discountCount: 0,
      loyaltyDiscounts: 0,
      manualDiscounts: 0
    };
  }
}

/**
 * Create optimized Z-Report engine
 */
export function createOptimizedZReportEngine(queries: ReportingQueries): OptimizedZReportEngine {
  return new OptimizedZReportEngine(queries);
}
