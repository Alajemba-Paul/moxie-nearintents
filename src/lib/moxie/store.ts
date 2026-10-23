import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  base58,
  bytesToHex,
  ed25519,
  hexToBytes,
  PAPER_SECRET_HEX,
  publicKeyFromSecret,
} from "./codec.ts";
import { asProtocolError } from "./errors.ts";
import { OPENING_BALANCE } from "./format.ts";
import { refundEscrow } from "./machine.ts";
import type { DeskOrder, Ledger, RouteEvent } from "./types.ts";

function identity(secretHex: string): { secretKeyHex: string; publicKeyB58: string } {
  return {
    secretKeyHex: secretHex,
    publicKeyB58: base58.encode(publicKeyFromSecret(hexToBytes(secretHex))),
  };
}

const paper = identity(PAPER_SECRET_HEX);

function upsert(orders: DeskOrder[], order: DeskOrder): DeskOrder[] {
  return [order, ...orders.filter((item) => item.id !== order.id)].slice(0, 30);
}

interface DeskState {
  secretKeyHex: string;
  publicKeyB58: string;
  available: number;
  locked: number;
  nextNonce: number;
  consumed: string[];
  orders: DeskOrder[];
  pinnedId: string | null;
  connected: boolean;
  connectLabel: string | null;
  connect: (label: string) => void;
  disconnect: () => void;
  apply: (event: RouteEvent) => void;
  refundOrder: (id: string, now: number) => void;
  resetBook: () => void;
  rotateKey: () => void;
  ledger: () => Ledger;
}

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      ...paper,
      available: OPENING_BALANCE,
      locked: 0,
      nextNonce: 0,
      consumed: [],
      orders: [],
      pinnedId: null,
      connected: false,
      connectLabel: null,
      connect: (label: string) => set({ connected: true, connectLabel: label }),
      disconnect: () => set({ connected: false, connectLabel: null }),
      ledger: () => {
        const state = get();
        return { available: state.available, locked: state.locked, consumed: state.consumed };
      },
      apply: (event) => {
        set((state) => ({
          available: event.ledger.available,
          locked: event.ledger.locked,
          consumed: event.ledger.consumed,
          nextNonce:
            event.type === "locked"
              ? Math.max(state.nextNonce, event.order.intent.nonce + 1)
              : state.nextNonce,
          orders: upsert(state.orders, event.order),
          pinnedId: event.order.id,
        }));
      },
      refundOrder: (id, now) => {
        const state = get();
        const order = state.orders.find((item) => item.id === id);
        if (!order) return;
        try {
          const result = refundEscrow({
            ledger: { available: state.available, locked: state.locked, consumed: state.consumed },
            escrow: {
              phase: order.phase,
              commitmentHex: order.commitmentHex,
              sizeMicro: order.intent.sizeMicro,
              expiryUnix: order.intent.expiryUnix,
              nonce: order.intent.nonce,
              taker: order.intent.taker,
              solverPubkey: order.solverPubkey,
              fillMicro: order.fillMicro,
              sharesMicro: order.sharesMicro,
            },
            now,
          });
          const pastExpiry = order.phase === "solver_matched";
          const next: DeskOrder = {
            ...order,
            phase: "refunded",
            error: undefined,
            logs: [
              ...order.logs,
              {
                title: "Refunded",
                detail: pastExpiry
                  ? "Clock moved past expiry. The vault returned the USDC. The nonce stays spent."
                  : "Lock cancelled before a solver was bound. The nonce stays spent.",
              },
            ],
          };
          set({
            available: result.ledger.available,
            locked: result.ledger.locked,
            consumed: result.ledger.consumed,
            orders: upsert(state.orders, next),
            pinnedId: id,
          });
        } catch (error) {
          const protocol = asProtocolError(error);
          set({
            orders: upsert(state.orders, {
              ...order,
              error: { code: protocol.code, message: protocol.message },
              logs: [...order.logs, { title: "Refund refused", detail: protocol.message }],
            }),
            pinnedId: id,
          });
        }
      },
      resetBook: () => {
        set({
          available: OPENING_BALANCE,
          locked: 0,
          nextNonce: 0,
          consumed: [],
          orders: [],
          pinnedId: null,
        });
      },
      rotateKey: () => {
        const secret = ed25519.utils.randomSecretKey();
        set({
          ...identity(bytesToHex(secret)),
          available: OPENING_BALANCE,
          locked: 0,
          nextNonce: 0,
          consumed: [],
          orders: [],
          pinnedId: null,
        });
      },
    }),
    {
      name: "moxie-desk-v2",
      skipHydration: true,
      partialize: (state) => ({
        secretKeyHex: state.secretKeyHex,
        publicKeyB58: state.publicKeyB58,
        available: state.available,
        locked: state.locked,
        nextNonce: state.nextNonce,
        consumed: state.consumed,
        orders: state.orders,
        pinnedId: state.pinnedId,
        connected: state.connected,
        connectLabel: state.connectLabel,
      }),
    },
  ),
);
