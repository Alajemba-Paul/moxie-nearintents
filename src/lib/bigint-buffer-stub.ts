// Pure JS stub for bigint-buffer
export function toBufferBE(num: bigint, width: number): Buffer {
  const hex = num.toString(16).padStart(width * 2, "0");
  return Buffer.from(hex, "hex");
}

export function toBufferLE(num: bigint, width: number): Buffer {
  return toBufferBE(num, width).reverse();
}

export function toBigIntBE(buf: Buffer): bigint {
  return BigInt("0x" + buf.toString("hex"));
}

export function toBigIntLE(buf: Buffer): bigint {
  return toBigIntBE(Buffer.from(buf).reverse());
}

export default {
  toBufferBE,
  toBufferLE,
  toBigIntBE,
  toBigIntLE,
};
