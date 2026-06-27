// src/lib/brokers.ts
// Shared broker registry + per-broker API/query-key dispatch.
// Used by the Brokers list page and the per-broker detail page.

import { brokersApi } from "@/api/endpoints/alpaca";
import { tradierApi } from "@/api/endpoints/tradier";
import { binanceApi } from "@/api/endpoints/binance";
import { coinbaseApi } from "@/api/endpoints/coinbase";
import { krakenApi } from "@/api/endpoints/kraken";
import { publicApi } from "@/api/endpoints/public";
import { robinhoodApi } from "@/api/endpoints/robinhood";
import { mt5Api } from "@/api/endpoints/mt5";
import { qk } from "@/api/queryKeys";
import type { BrokerType } from "@/types/broker";

// ── Broker registry ───────────────────────────────────────────────────────────

export interface BrokerInfo {
  id: string;
  name: string;
  description: string;
  symbol: string;
  logo?: string;
  integrated: boolean;
}

export const BROKERS: BrokerInfo[] = [
  { id: "alpaca",    name: "Alpaca",    description: "Commission-free stocks + API access.",         symbol: "α", logo: "/alpaca-logo.png", integrated: true  },
  { id: "tradier",   name: "Tradier",   description: "Options, equities, and API trading.",           symbol: "T", integrated: true  },
  { id: "binance",   name: "Binance",   description: "Crypto spot trading with HMAC & Ed25519.",     symbol: "B", integrated: true  },
  { id: "public",    name: "Public",    description: "Stocks, options, crypto & bonds.",              symbol: "P", integrated: true  },
  { id: "robinhood", name: "Robinhood", description: "Commission-free crypto investing platform.",    symbol: "R", integrated: true  },
  { id: "kraken",    name: "Kraken",    description: "Advanced cryptocurrency trading.",              symbol: "K", integrated: true  },
  { id: "coinbase",  name: "Coinbase",  description: "Trusted crypto investing and exchange.",        symbol: "C", integrated: true  },
  { id: "mt5",       name: "MT5",       description: "MetaTrader 5 multi-asset FX & CFD trading.",    symbol: "5", logo: "/mt5-logo.jpg", integrated: true  },
];

export function getBrokerInfo(brokerId: string): BrokerInfo | undefined {
  return BROKERS.find((b) => b.id === brokerId);
}

// ── Unified broker API dispatch ───────────────────────────────────────────────

export type SharedBrokerApi = typeof brokersApi;

export const CRYPTO_BROKERS = new Set<BrokerType>(["binance", "coinbase", "kraken", "robinhood"]);

export function getBrokerApi(broker: BrokerType): SharedBrokerApi {
  if (broker === "alpaca")    return brokersApi;
  if (broker === "binance")   return binanceApi    as unknown as SharedBrokerApi;
  if (broker === "coinbase")  return coinbaseApi   as unknown as SharedBrokerApi;
  if (broker === "kraken")    return krakenApi     as unknown as SharedBrokerApi;
  if (broker === "public")    return publicApi     as unknown as SharedBrokerApi;
  if (broker === "robinhood") return robinhoodApi  as unknown as SharedBrokerApi;
  if (broker === "mt5")       return mt5Api        as unknown as SharedBrokerApi;
  return tradierApi as unknown as SharedBrokerApi;
}

// Alias kept for call sites that read like a hook (it is a plain dispatcher).
export const useBrokerApi = getBrokerApi;

// ── Per-broker query keys ───────────────────────────────────────────────────

export function accountKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaAccount(cid);
  if (broker === "binance")   return qk.binanceAccount(cid);
  if (broker === "coinbase")  return qk.coinbaseAccount(cid);
  if (broker === "kraken")    return qk.krakenAccount(cid);
  if (broker === "public")    return qk.publicAccount(cid);
  if (broker === "robinhood") return qk.robinhoodAccount(cid);
  if (broker === "mt5")       return qk.mt5Account(cid);
  return qk.tradierAccount(cid);
}
export function clockKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaClock(cid);
  if (broker === "binance")   return qk.binanceClock(cid);
  if (broker === "coinbase")  return qk.coinbaseClock(cid);
  if (broker === "kraken")    return qk.krakenClock(cid);
  if (broker === "public")    return qk.publicClock(cid);
  if (broker === "robinhood") return qk.robinhoodClock(cid);
  if (broker === "mt5")       return qk.mt5Clock(cid);
  return qk.tradierClock(cid);
}
export function positionsKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaPositions(cid);
  if (broker === "binance")   return qk.binancePositions(cid);
  if (broker === "coinbase")  return qk.coinbasePositions(cid);
  if (broker === "kraken")    return qk.krakenPositions(cid);
  if (broker === "public")    return qk.publicPositions(cid);
  if (broker === "robinhood") return qk.robinhoodPositions(cid);
  if (broker === "mt5")       return qk.mt5Positions(cid);
  return qk.tradierPositions(cid);
}
export function ordersKey(broker: BrokerType, cid: string, status?: string) {
  if (broker === "alpaca")    return qk.alpacaOrders(cid, status);
  if (broker === "binance")   return qk.binanceOrders(cid, status);
  if (broker === "coinbase")  return qk.coinbaseOrders(cid, status);
  if (broker === "kraken")    return qk.krakenOrders(cid, status);
  if (broker === "public")    return qk.publicOrders(cid, status);
  if (broker === "robinhood") return qk.robinhoodOrders(cid, status);
  if (broker === "mt5")       return qk.mt5Orders(cid, status);
  return qk.tradierOrders(cid, status);
}
export function fillsKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaFills(cid);
  if (broker === "binance")   return qk.binanceFills(cid);
  if (broker === "coinbase")  return qk.coinbaseFills(cid);
  if (broker === "kraken")    return qk.krakenFills(cid);
  if (broker === "public")    return qk.publicFills(cid);
  if (broker === "robinhood") return qk.robinhoodFills(cid);
  if (broker === "mt5")       return qk.mt5Fills(cid);
  return qk.tradierFills(cid);
}
