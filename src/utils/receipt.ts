/**
 * Receipt Generation Utility
 * Handles creation and printing of transaction receipts
 */

import { formatCurrency } from '../lib/format';

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  taxRate?: number;
}

export interface ReceiptData {
  ticketId: string;
  timestamp: string;
  cashier?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: ReceiptLineItem[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  payment: {
    method: string;
    amount: number;
    change?: number;
  };
  store?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Generate a formatted receipt as HTML string
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const {
    ticketId,
    timestamp,
    cashier,
    customer,
    items,
    totals,
    payment,
    store = { name: 'RMS v3 Restaurant' }
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${ticketId}</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
      max-width: 300px;
      background: white;
      color: black;
    }
    .receipt {
      text-align: center;
    }
    .header {
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .store-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .transaction-info {
      text-align: left;
      margin-bottom: 10px;
    }
    .items {
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      text-align: left;
    }
    .item-name {
      flex: 1;
    }
    .item-qty {
      margin: 0 10px;
    }
    .item-total {
      min-width: 60px;
      text-align: right;
    }
    .totals {
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .total-line.grand-total {
      font-weight: bold;
      font-size: 14px;
      border-top: 1px solid #000;
      padding-top: 5px;
      margin-top: 5px;
    }
    .payment-info {
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body { margin: 0; padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="store-name">${store.name}</div>
      ${store.address ? `<div>${store.address}</div>` : ''}
      ${store.phone ? `<div>Phone: ${store.phone}</div>` : ''}
      ${store.email ? `<div>Email: ${store.email}</div>` : ''}
    </div>

    <div class="transaction-info">
      <div>Ticket: ${ticketId}</div>
      <div>Date: ${new Date(timestamp).toLocaleString()}</div>
      ${cashier ? `<div>Cashier: ${cashier}</div>` : ''}
      ${customer ? `<div>Customer: ${customer.name}</div>` : ''}
    </div>

    <div class="items">
      ${items.map(item => `
        <div class="item">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity}x</span>
          <span class="item-total">${formatCurrency(item.total)}</span>
        </div>
      `).join('')}
    </div>

    <div class="totals">
      <div class="total-line">
        <span>Subtotal:</span>
        <span>${formatCurrency(totals.subtotal)}</span>
      </div>
      ${totals.discount > 0 ? `
        <div class="total-line">
          <span>Discount:</span>
          <span>-${formatCurrency(totals.discount)}</span>
        </div>
      ` : ''}
      <div class="total-line">
        <span>Tax:</span>
        <span>${formatCurrency(totals.tax)}</span>
      </div>
      <div class="total-line grand-total">
        <span>TOTAL:</span>
        <span>${formatCurrency(totals.total)}</span>
      </div>
    </div>

    <div class="payment-info">
      <div class="total-line">
        <span>Payment (${payment.method}):</span>
        <span>${formatCurrency(payment.amount)}</span>
      </div>
      ${payment.change ? `
        <div class="total-line">
          <span>Change:</span>
          <span>${formatCurrency(payment.change)}</span>
        </div>
      ` : ''}
    </div>

    <div class="footer">
      <div>Thank you for your business!</div>
      <div>Powered by RMS v3</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate a plain text receipt
 */
export function generateReceiptText(data: ReceiptData): string {
  const { ticketId, timestamp, cashier, customer, items, totals, payment, store = { name: 'RMS v3 Restaurant' } } = data;
  
  const lines: string[] = [];
  const width = 40;
  
  // Header
  lines.push(center(store.name, width));
  if (store.address) lines.push(center(store.address, width));
  if (store.phone) lines.push(center(`Phone: ${store.phone}`, width));
  if (store.email) lines.push(center(`Email: ${store.email}`, width));
  lines.push('-'.repeat(width));
  
  // Transaction info
  lines.push(`Ticket: ${ticketId}`);
  lines.push(`Date: ${new Date(timestamp).toLocaleString()}`);
  if (cashier) lines.push(`Cashier: ${cashier}`);
  if (customer) lines.push(`Customer: ${customer.name}`);
  lines.push('-'.repeat(width));
  
  // Items
  items.forEach(item => {
    const itemLine = `${item.name}`;
    const qtyPrice = `${item.quantity}x ${formatCurrency(item.total)}`;
    lines.push(itemLine);
    lines.push(`  ${' '.repeat(width - qtyPrice.length - 2)}${qtyPrice}`);
  });
  lines.push('-'.repeat(width));
  
  // Totals
  lines.push(padLine('Subtotal:', formatCurrency(totals.subtotal), width));
  if (totals.discount > 0) {
    lines.push(padLine('Discount:', `-${formatCurrency(totals.discount)}`, width));
  }
  lines.push(padLine('Tax:', formatCurrency(totals.tax), width));
  lines.push('='.repeat(width));
  lines.push(padLine('TOTAL:', formatCurrency(totals.total), width));
  lines.push('-'.repeat(width));
  
  // Payment
  lines.push(padLine(`Payment (${payment.method}):`, formatCurrency(payment.amount), width));
  if (payment.change) {
    lines.push(padLine('Change:', formatCurrency(payment.change), width));
  }
  lines.push('-'.repeat(width));
  
  // Footer
  lines.push(center('Thank you for your business!', width));
  lines.push(center('Powered by RMS v3', width));
  
  return lines.join('\n');
}

/**
 * Print receipt using browser print API
 */
export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
}

/**
 * Download receipt as HTML file
 */
export function downloadReceipt(data: ReceiptData, format: 'html' | 'txt' = 'html'): void {
  const content = format === 'html' ? generateReceiptHTML(data) : generateReceiptText(data);
  const mimeType = format === 'html' ? 'text/html' : 'text/plain';
  const extension = format === 'html' ? 'html' : 'txt';
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${data.ticketId}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy receipt to clipboard
 */
export async function copyReceiptToClipboard(data: ReceiptData): Promise<boolean> {
  try {
    const text = generateReceiptText(data);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy receipt to clipboard:', error);
    return false;
  }
}

// Helper functions
function center(text: string, width: number): string {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  return ' '.repeat(leftPad) + text;
}

function padLine(left: string, right: string, width: number): string {
  const padding = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(padding) + right;
}