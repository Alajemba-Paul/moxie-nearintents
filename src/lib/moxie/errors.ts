export const ErrorCodes = {
  EXPIRED: "EXPIRED",
  REPLAY: "REPLAY",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  SLIPPAGE_EXCEEDED: "SLIPPAGE_EXCEEDED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  PROOF_MISMATCH: "PROOF_MISMATCH",
  BAD_SIGNATURE: "BAD_SIGNATURE",
  INTENT_INCOMPLETE: "INTENT_INCOMPLETE",
  ZERO_SIZE: "ZERO_SIZE",
  UNAUTHORIZED: "UNAUTHORIZED",
  WRONG_MINT: "WRONG_MINT",
  OVERFLOW: "OVERFLOW",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class ProtocolError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
  }
}

export function asProtocolError(error: unknown): ProtocolError {
  if (error instanceof ProtocolError) return error;
  if (error instanceof Error) {
    return new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, error.message);
  }
  return new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Unknown protocol failure");
}
