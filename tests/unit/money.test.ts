import { describe, expect, it } from "vitest";
import {
    countDecimals,
    fromStripeAmount,
    isUnsupportedCurrency,
    toPayPalAmount,
    toStripeAmount,
} from "../../src/utils/money.js";

describe("isUnsupportedCurrency", () => {
    it("returns true for three-decimal BHD", () => {
        expect(isUnsupportedCurrency("BHD")).toBe(true);
    });

    it("returns true for three-decimal KWD", () => {
        expect(isUnsupportedCurrency("KWD")).toBe(true);
    });

    it("returns false for two-decimal USD", () => {
        expect(isUnsupportedCurrency("USD")).toBe(false);
    });

    it("returns false for zero-decimal JPY", () => {
        expect(isUnsupportedCurrency("JPY")).toBe(false);
    });

    it("normalizes currency case", () => {
        expect(isUnsupportedCurrency("bhd")).toBe(true);
    });
});

describe("countDecimals", () => {
    it("returns 0 for whole numbers", () => {
        expect(countDecimals(10)).toBe(0);
    });

    it("returns 1 for one decimal place", () => {
        expect(countDecimals(10.5)).toBe(1);
    });

    it("returns 2 for two decimal places", () => {
        expect(countDecimals(10.99)).toBe(2);
    });

    it("returns 3 for three decimal places", () => {
        expect(countDecimals(10.567)).toBe(3);
    });
});

describe("fromStripeAmount", () => {
    it("converts zero-decimal JPY minor units to major units", () => {
        expect(fromStripeAmount(100, "JPY")).toBe(100);
    });

    it("converts two-decimal USD minor units to major units", () => {
        expect(fromStripeAmount(1099, "USD")).toBe(10.99);
    });

    it("converts zero-decimal CLP minor units to major units", () => {
        expect(fromStripeAmount(500, "CLP")).toBe(500);
    });

    it("converts Stripe backward-compat ISK minor units to major units", () => {
        expect(fromStripeAmount(500, "ISK")).toBe(5);
    });
});

describe("toStripeAmount", () => {
    it("returns the amount unchanged for zero-decimal JPY", () => {
        expect(toStripeAmount(100, "JPY")).toBe(100);
    });

    it("multiplies by 100 for two-decimal USD", () => {
        expect(toStripeAmount(10.99, "USD")).toBe(1099);
    });

    it("normalizes currency case", () => {
        expect(toStripeAmount(100, "jpy")).toBe(100);
    });

    it("rounds two-decimal amounts with EPSILON", () => {
        expect(toStripeAmount(10.995, "USD")).toBe(1100);
    });

    it("returns the amount unchanged for another zero-decimal currency", () => {
        expect(toStripeAmount(500, "CLP")).toBe(500);
    });

    it("multiplies by 100 for Stripe backward-compat ISK", () => {
        expect(toStripeAmount(5, "ISK")).toBe(500);
    });
});

describe("toPayPalAmount", () => {
    it("formats zero-decimal JPY without decimals", () => {
        expect(toPayPalAmount(100, "JPY")).toBe("100");
    });

    it("formats two-decimal USD with cents", () => {
        expect(toPayPalAmount(10.99, "USD")).toBe("10.99");
    });

    it("formats zero-decimal CLP without decimals", () => {
        expect(toPayPalAmount(500, "CLP")).toBe("500");
    });

    it("normalizes currency case", () => {
        expect(toPayPalAmount(100, "jpy")).toBe("100");
    });
});
