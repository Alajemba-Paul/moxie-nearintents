import { a as aexists, f as swap32IfBE, i as abytes, l as clean, m as split, o as anumber, p as u32, r as abool, s as aoutput, u as createHasher } from "./noble__curves+noble__hashes.mjs";
//#region node_modules/@noble/hashes/sha3.js
/**
* SHA3 (keccak) hash function, based on a new "Sponge function" design.
* Different from older hashes, the internal state is bigger than output size.
*
* Check out
* {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf | FIPS-202},
* {@link https://keccak.team/keccak.html | Website}, and
* {@link https://crypto.stackexchange.com/q/15727 | the differences between
* SHA-3 and Keccak}.
*
* Check out `sha3-addons` module for cSHAKE, k12, and others.
* @module
*/
var _0n = BigInt(0);
var _1n = BigInt(1);
var _2n = BigInt(2);
var _7n = BigInt(7);
var _256n = BigInt(256);
var _0x71n = BigInt(113);
var SHA3_PI = [];
var SHA3_ROTL = [];
var _SHA3_IOTA = [];
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
	[x, y] = [y, (2 * x + 3 * y) % 5];
	SHA3_PI.push(2 * (5 * y + x));
	SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
	let t = _0n;
	for (let j = 0; j < 7; j++) {
		R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
		if (R & _2n) t ^= _1n << (_1n << BigInt(j)) - _1n;
	}
	_SHA3_IOTA.push(t);
}
var IOTAS = split(_SHA3_IOTA, true);
var SHA3_IOTA_H = IOTAS[0];
var SHA3_IOTA_L = IOTAS[1];
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
var rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
var rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
var B = /* @__PURE__ */ new Uint32Array(10);
/**
* `keccakf1600` internal permutation, additionally allows adjusting the round count.
* @param s - 5x5 Keccak state encoded as 25 lanes split into 50 uint32 words
*   in this file's local little-endian lane-word order
* @param rounds - number of rounds to execute
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If `rounds` is outside the supported `1..24` range. {@link Error}
* @example
* Permute a Keccak state with the default 24 rounds.
* ```ts
* keccakP(new Uint32Array(50));
* ```
*/
function keccakP(s, rounds = 24) {
	if (!(s instanceof Uint32Array)) throw new TypeError("\"s\" expected Uint32Array(50), got type=" + typeof s);
	if (s.length !== 50) throw new RangeError("\"s\" expected Uint32Array(50), got length=" + s.length);
	anumber(rounds, "rounds");
	if (rounds < 1 || rounds > 24) throw new Error("\"rounds\" expected integer 1..24");
	for (let round = 24 - rounds; round < 24; round++) {
		for (let x = 0; x < 10; x++) B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
		for (let x = 0; x < 10; x += 2) {
			const idx1 = (x + 8) % 10;
			const idx0 = (x + 2) % 10;
			const B0 = B[idx0];
			const B1 = B[idx0 + 1];
			const Th = rotlH(B0, B1, 1) ^ B[idx1];
			const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
			for (let y = 0; y < 50; y += 10) {
				s[x + y] ^= Th;
				s[x + y + 1] ^= Tl;
			}
		}
		let curH = s[2];
		let curL = s[3];
		for (let t = 0; t < 24; t++) {
			const shift = SHA3_ROTL[t];
			const Th = rotlH(curH, curL, shift);
			const Tl = rotlL(curH, curL, shift);
			const PI = SHA3_PI[t];
			curH = s[PI];
			curL = s[PI + 1];
			s[PI] = Th;
			s[PI + 1] = Tl;
		}
		for (let y = 0; y < 50; y += 10) {
			const b0 = s[y], b1 = s[y + 1], b2 = s[y + 2], b3 = s[y + 3];
			s[y] ^= ~s[y + 2] & s[y + 4];
			s[y + 1] ^= ~s[y + 3] & s[y + 5];
			s[y + 2] ^= ~s[y + 4] & s[y + 6];
			s[y + 3] ^= ~s[y + 5] & s[y + 7];
			s[y + 4] ^= ~s[y + 6] & s[y + 8];
			s[y + 5] ^= ~s[y + 7] & s[y + 9];
			s[y + 6] ^= ~s[y + 8] & b0;
			s[y + 7] ^= ~s[y + 9] & b1;
			s[y + 8] ^= ~b0 & b2;
			s[y + 9] ^= ~b1 & b3;
		}
		s[0] ^= SHA3_IOTA_H[round];
		s[1] ^= SHA3_IOTA_L[round];
	}
	clean(B);
}
/**
* Keccak sponge function.
* @param blockLen - absorb/squeeze rate in bytes
* @param suffix - domain separation suffix byte
* @param outputLen - default digest length in bytes. This base sponge only
*   requires a non-negative integer; wrappers that need positive output
*   lengths must enforce that themselves.
* @param enableXOF - whether XOF output is allowed
* @param rounds - number of Keccak-f rounds
* @example
* Build a sponge state, absorb bytes, then finalize a digest.
* ```ts
* const hash = new Keccak(136, 0x06, 32);
* hash.update(new Uint8Array([1, 2, 3]));
* hash.digest();
* ```
*/
var Keccak = class Keccak {
	state;
	pos = 0;
	posOut = 0;
	finished = false;
	state32;
	destroyed = false;
	blockLen;
	suffix;
	outputLen;
	canXOF;
	enableXOF = false;
	rounds;
	constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
		anumber(blockLen, "blockLen");
		anumber(suffix, "suffix");
		anumber(rounds, "rounds");
		abool(enableXOF, "enableXOF");
		this.blockLen = blockLen;
		this.suffix = suffix;
		this.outputLen = outputLen;
		this.enableXOF = enableXOF;
		this.canXOF = enableXOF;
		this.rounds = rounds;
		anumber(outputLen, "outputLen");
		if (!(0 < blockLen && blockLen < 200)) throw new Error("\"blockLen\" must be 1..199");
		this.state = /* @__PURE__ */ new Uint8Array(200);
		this.state32 = u32(this.state);
	}
	clone() {
		return this._cloneInto();
	}
	keccak() {
		swap32IfBE(this.state32);
		keccakP(this.state32, this.rounds);
		swap32IfBE(this.state32);
		this.posOut = 0;
		this.pos = 0;
	}
	update(data) {
		aexists(this);
		abytes(data);
		const { blockLen, state, state32 } = this;
		const len = data.length;
		const canUseU32 = blockLen % 4 === 0 && data.byteOffset % 4 === 0;
		const blockLen32 = blockLen / 4;
		const data32 = canUseU32 && len >= blockLen ? u32(data) : void 0;
		for (let pos = 0; pos < len;) {
			if (data32 !== void 0 && this.pos === 0 && pos % 4 === 0 && len - pos >= blockLen) {
				for (let i = 0, o = pos / 4; i < blockLen32; i++) state32[i] ^= data32[o + i];
				pos += blockLen;
				this.pos = blockLen;
				this.keccak();
				continue;
			}
			const take = Math.min(blockLen - this.pos, len - pos);
			for (let i = 0; i < take; i++) state[this.pos++] ^= data[pos++];
			if (this.pos === blockLen) this.keccak();
		}
		return this;
	}
	finish() {
		if (this.finished) return;
		this.finished = true;
		const { state, suffix, pos, blockLen } = this;
		state[pos] ^= suffix;
		if ((suffix & 128) !== 0 && pos === blockLen - 1) this.keccak();
		state[blockLen - 1] ^= 128;
		this.keccak();
	}
	writeInto(out) {
		aexists(this, false);
		abytes(out);
		this.finish();
		const bufferOut = this.state;
		const { blockLen } = this;
		for (let pos = 0, len = out.length; pos < len;) {
			if (this.posOut >= blockLen) this.keccak();
			const take = Math.min(blockLen - this.posOut, len - pos);
			out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
			this.posOut += take;
			pos += take;
		}
		return out;
	}
	xofInto(out) {
		if (!this.enableXOF) throw new Error("XOF is not enabled");
		return this.writeInto(out);
	}
	xof(bytes) {
		anumber(bytes);
		return this.xofInto(new Uint8Array(bytes));
	}
	digestInto(out) {
		aoutput(out, this);
		if (this.finished) throw new Error("digest() was already called");
		this.writeInto(out.length === this.outputLen ? out : out.subarray(0, this.outputLen));
		this.destroy();
	}
	digest() {
		const out = new Uint8Array(this.outputLen);
		this.digestInto(out);
		return out;
	}
	destroy() {
		this.destroyed = true;
		clean(this.state);
	}
	_cloneInto(to) {
		const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
		to ||= new Keccak(blockLen, suffix, outputLen, enableXOF, rounds);
		to.blockLen = blockLen;
		to.state32.set(this.state32);
		to.pos = this.pos;
		to.posOut = this.posOut;
		to.finished = this.finished;
		to.rounds = rounds;
		to.suffix = suffix;
		to.outputLen = outputLen;
		to.enableXOF = enableXOF;
		to.canXOF = this.canXOF;
		to.destroyed = this.destroyed;
		return to;
	}
};
var genKeccak = (suffix, blockLen, outputLen, info = {}) => createHasher(() => new Keccak(blockLen, suffix, outputLen), info);
/**
* Keccak-256 hash function. Different from SHA3-256.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with Keccak-256.
* ```ts
* keccak_256(new Uint8Array([97, 98, 99]));
* ```
*/
var keccak_256 = /* @__PURE__ */ genKeccak(1, 136, 32);
//#endregion
export { keccak_256 as t };
