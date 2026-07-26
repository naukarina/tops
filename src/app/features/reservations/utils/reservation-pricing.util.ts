import { Currency, CurrencyName } from '../../../core/models/currency.model';
import { Pricelist } from '../../pricelists/models/pricelist.model';
import { Product } from '../../products/models/product.model';

/** Normalizes a value that may be a JS Date, a Firestore Timestamp, or a string into a Date. */
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function convertMurTo(murAmount: number, currencyName: CurrencyName, currencies: Currency[]): number {
  if (!currencyName || currencyName === CurrencyName.MUR) return murAmount;
  const currency = currencies.find((c) => c.name === currencyName);
  if (currency && currency.exchangeRate) {
    return Number((murAmount / currency.exchangeRate).toFixed(2));
  }
  return murAmount;
}

export interface ResolveUnitPriceOptions {
  productId: string;
  tourOperatorId: string | null;
  date: Date | null;
  currencyName: CurrencyName;
  pricelists: Pricelist[];
  products: Product[];
  currencies: Currency[];
}

/**
 * Resolves the unit price for a product:
 * 1. The matching tour-operator pricelist (same currency) for the period covering `date`.
 * 2. Fallback: the product's latest validity price (MUR) converted to the target currency.
 * Returns 0 when nothing can be resolved (the user can then type it in).
 */
export function resolveUnitPrice(opts: ResolveUnitPriceOptions): number {
  const { productId, tourOperatorId, date, currencyName, pricelists, products, currencies } = opts;
  if (!productId) return 0;

  const refDate = date ?? new Date();

  // 1. Pricelist lookup (tour operator + currency + covering period).
  if (tourOperatorId) {
    const pricelist = pricelists.find(
      (p) =>
        Array.isArray(p.tourOperatorIds) &&
        p.tourOperatorIds.includes(tourOperatorId) &&
        p.currencyName === currencyName,
    );

    if (pricelist?.periods?.length) {
      const period = pricelist.periods.find((per) => {
        const from = toDate(per.validityFrom);
        const to = toDate(per.validityTo);
        if (!from || !to) return false;
        return refDate >= from && refDate <= to;
      });

      const match = period?.pricelistProducts?.find((pp) => pp.baseProductId === productId);
      if (match && typeof match.price === 'number') {
        return match.price;
      }
    }
  }

  // 2. Fallback to the product's latest validity price (stored in MUR).
  const product = products.find((p) => p.id === productId);
  if (product?.validities?.length) {
    const murPrice = product.validities[product.validities.length - 1].price ?? 0;
    return convertMurTo(murPrice, currencyName, currencies);
  }

  return 0;
}
