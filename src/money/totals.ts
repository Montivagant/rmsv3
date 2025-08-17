import { round2 } from './round'

export type Line = { price: number; qty: number; taxRate: number }

export function computeTotals(lines: Line[], discount: number) {
  const lineSubs = lines.map(l => round2(l.price * l.qty))
  const subtotal = round2(lineSubs.reduce((s, n) => s + n, 0))
  const cap = Math.min(discount || 0, subtotal)

  let acc = { subtotal, discount: 0, tax: 0, total: 0 }

  lines.forEach((l, i) => {
    const lineSub = lineSubs[i]
    const share = subtotal ? lineSub / subtotal : 0
    const lineDiscount = round2(cap * share)
    const taxable = Math.max(0, lineSub - lineDiscount)
    const lineTax = round2(taxable * l.taxRate)
    acc = {
      subtotal,
      discount: round2(acc.discount + lineDiscount),
      tax: round2(acc.tax + lineTax),
      total: round2(acc.total + taxable + lineTax),
    }
  })

  return acc
}