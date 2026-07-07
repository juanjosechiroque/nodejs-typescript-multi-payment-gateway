export const ZERO_DECIMAL_CURRENCIES = [
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
] as const;

// Stripe/PayPal do not document confirmed support for these currencies; reject explicitly instead of assuming a conversion format.
export const THREE_DECIMAL_CURRENCIES = ["BHD", "KWD", "OMR", "JOD", "TND", "LYD"] as const;

const ZERO_DECIMAL_SET = new Set<string>(ZERO_DECIMAL_CURRENCIES);
const THREE_DECIMAL_SET = new Set<string>(THREE_DECIMAL_CURRENCIES);
const STRIPE_BACKWARD_COMPAT_CURRENCIES = new Set(["ISK", "UGX"]);

export function isUnsupportedCurrency(currency: string): boolean {
    return THREE_DECIMAL_SET.has(currency.toUpperCase());
}

export function currencyDecimals(currency: string): 0 | 2 {
    if (ZERO_DECIMAL_SET.has(currency.toUpperCase())) {
        return 0;
    }
    return 2;
}

export function countDecimals(amount: number): number {
    const str = amount.toString();
    const eIndex = str.indexOf("e-");
    if (eIndex !== -1) {
        return Number(str.slice(eIndex + 2));
    }
    const dotIndex = str.indexOf(".");
    if (dotIndex === -1) {
        return 0;
    }
    return str.length - dotIndex - 1;
}

export function toStripeAmount(amount: number, currency: string): number {
    const code = currency.toUpperCase();
    if (STRIPE_BACKWARD_COMPAT_CURRENCIES.has(code)) {
        return Math.round((amount + Number.EPSILON) * 100);
    }
    if (currencyDecimals(code) === 0) {
        return Math.round(amount);
    }
    return Math.round((amount + Number.EPSILON) * 100);
}

export function fromStripeAmount(minorUnits: number, currency: string): number {
    const code = currency.toUpperCase();
    if (STRIPE_BACKWARD_COMPAT_CURRENCIES.has(code) || currencyDecimals(code) === 2) {
        return Number((minorUnits / 100).toFixed(2));
    }
    return minorUnits;
}

export function toPayPalAmount(amount: number, currency: string): string {
    return amount.toFixed(currencyDecimals(currency));
}
