import { r as __exportAll } from "../_runtime.mjs";
import * as nc from "node:crypto";
//#region node_modules/@noble/hashes/_u64.js
var U32_MASK64$1 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
var _32n$1 = /* @__PURE__ */ BigInt(32);
function fromBig$1(n, le = false) {
	if (le) return {
		h: Number(n & U32_MASK64$1),
		l: Number(n >> _32n$1 & U32_MASK64$1)
	};
	return {
		h: Number(n >> _32n$1 & U32_MASK64$1) | 0,
		l: Number(n & U32_MASK64$1) | 0
	};
}
function split$1(lst, le = false) {
	const len = lst.length;
	let Ah = new Uint32Array(len);
	let Al = new Uint32Array(len);
	for (let i = 0; i < len; i++) {
		const { h, l } = fromBig$1(lst[i], le);
		[Ah[i], Al[i]] = [h, l];
	}
	return [Ah, Al];
}
var fromNumH = (n) => n / 2 ** 32 | 0;
var fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
	const h = fromNumH(n);
	const l = fromNumL(n);
	view.setUint32(byteOffset, isLE ? l : h, isLE);
	view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
var shrSH$1 = (h, _l, s) => h >>> s;
var shrSL$1 = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH$1 = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL$1 = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH$1 = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL$1 = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add$1(Ah, Al, Bh, Bl) {
	const l = (Al >>> 0) + (Bl >>> 0);
	return {
		h: Ah + Bh + (l / 2 ** 32 | 0) | 0,
		l: l | 0
	};
}
var add3L$1 = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H$1 = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L$1 = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H$1 = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L$1 = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H$1 = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
//#endregion
//#region node_modules/@noble/hashes/utils.js
/**
* Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
* @param a - value to test
* @returns `true` when the value is a Uint8Array-compatible view.
* @example
* Check whether a value is a Uint8Array-compatible view.
* ```ts
* isBytes(new Uint8Array([1, 2, 3]));
* ```
*/
function isBytes$2(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle$1 = (title) => title ? `"${title}" ` : "";
/**
* Asserts something is a non-negative integer.
* @param n - number to validate
* @param title - label included in thrown errors
* @returns The validated number.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a non-negative integer option.
* ```ts
* anumber(32, 'length');
* ```
*/
function anumber$2(n, title = "") {
	if (typeof n !== "number") throw new TypeError(atitle$1(title) + "expected number, got " + typeof n);
	if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle$1(title) + "expected integer >= 0, got " + n);
	return n;
}
/**
* Asserts something is Uint8Array.
* @param value - value to validate
* @param length - optional exact length constraint
* @param title - label included in thrown errors
* @returns The validated byte array.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate that a value is a byte array.
* ```ts
* abytes(new Uint8Array([1, 2, 3]));
* ```
*/
function abytes$2(value, length, title = "") {
	if (isBytes$2(value) && (length === void 0 || value.length === length)) return value;
	if (length !== void 0) anumber$2(length, "length");
	const bytes = isBytes$2(value);
	const ofLen = length !== void 0 ? ` of length ${length}` : "";
	const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
	const message = atitle$1(title) + "expected Uint8Array" + ofLen + ", got " + got;
	if (!bytes) throw new TypeError(message);
	throw new RangeError(message);
}
var aobject$1 = (value, label) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
var aopts = (value, label) => {
	aobject$1(value, label);
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) throw new TypeError(`"${label}" expected plain object`);
	if (Object.hasOwn(value, "__proto__")) throw new TypeError(`"${label}.__proto__" is not allowed`);
};
/**
* Asserts a hash instance has not been destroyed or finished.
* @param instance - hash instance to validate
* @param checkFinished - whether to reject finalized instances
* @throws If the hash instance has already been destroyed or finalized. {@link Error}
* @example
* Validate that a hash instance is still usable.
* ```ts
* import { aexists } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aexists(hash);
* ```
*/
function aexists$1(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("hash was destroyed");
	if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
* Asserts output is a sufficiently-sized byte array.
* @param out - destination buffer
* @param instance - hash instance providing output length
* Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a caller-provided digest buffer.
* ```ts
* import { aoutput } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aoutput(new Uint8Array(hash.outputLen), hash);
* ```
*/
function aoutput$1(out, instance) {
	abytes$2(out, void 0, "output");
	const min = instance.outputLen;
	if (!(out.length >= min)) throw new RangeError("\"output\" expected length >= " + min);
}
/**
* Zeroizes typed arrays in place. Warning: JS provides no guarantees.
* @param arrays - arrays to overwrite with zeros
* @example
* Zeroize sensitive buffers in place.
* ```ts
* clean(new Uint8Array([1, 2, 3]));
* ```
*/
function clean$1(...arrays) {
	for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
* Creates a DataView for byte-level manipulation.
* @param arr - source typed array
* @returns DataView over the same buffer region.
* @example
* Create a DataView over an existing buffer.
* ```ts
* createView(new Uint8Array(4));
* ```
*/
function createView$2(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/**
* Rotate-right operation for uint32 values.
* @param word - source word
* @param shift - shift amount in bits
* @returns Rotated word.
* @example
* Rotate a 32-bit word to the right.
* ```ts
* rotr(0x12345678, 8);
* ```
*/
function rotr$2(word, shift) {
	return word << 32 - shift | word >>> shift;
}
var hasHexBuiltin$1 = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function")();
var hexes$2 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
* Convert byte array to hex string.
* Uses the built-in function when available and assumes it matches the tested
* fallback semantics.
* @param bytes - bytes to encode
* @returns Lowercase hexadecimal string.
* @throws On wrong argument types. {@link TypeError}
* @example
* Convert bytes to lowercase hexadecimal.
* ```ts
* bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])); // 'cafe0123'
* ```
*/
function bytesToHex$3(bytes) {
	abytes$2(bytes);
	if (hasHexBuiltin$1) return bytes.toHex();
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += hexes$2[bytes[i]];
	return hex;
}
function asciiToBase16$1(ch) {
	return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - 55 : ch >= 97 && ch <= 102 ? ch - 87 : void 0;
}
/**
* Convert hex string to byte array. Uses built-in function, when available.
* @param hex - hexadecimal string to decode
* @returns Decoded bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Decode lowercase hexadecimal into bytes.
* ```ts
* hexToBytes('cafe0123'); // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
* ```
*/
function hexToBytes$3(hex) {
	if (typeof hex !== "string") throw new TypeError("hex string expected, got " + typeof hex);
	if (hasHexBuiltin$1) try {
		return Uint8Array.fromHex(hex);
	} catch (error) {
		if (error instanceof SyntaxError) throw new RangeError(error.message);
		throw error;
	}
	const hl = hex.length;
	const al = hl / 2;
	if (hl % 2) throw new RangeError("hex string expected, got unpadded hex of length " + hl);
	const array = new Uint8Array(al);
	for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
		const n1 = asciiToBase16$1(hex.charCodeAt(hi));
		const n2 = asciiToBase16$1(hex.charCodeAt(hi + 1));
		if (n1 === void 0 || n2 === void 0) {
			const char = hex[hi] + hex[hi + 1];
			throw new RangeError("hex string expected, got non-hex character \"" + char + "\" at index " + hi);
		}
		array[ai] = n1 * 16 + n2;
	}
	return array;
}
/**
* Copies several Uint8Arrays into one.
* @param arrays - arrays to concatenate
* @returns Concatenated byte array.
* @throws On wrong argument types. {@link TypeError}
* @example
* Concatenate multiple byte arrays.
* ```ts
* concatBytes(new Uint8Array([1]), new Uint8Array([2]));
* ```
*/
function concatBytes$4(...arrays) {
	let sum = 0;
	for (let i = 0; i < arrays.length; i++) {
		const a = arrays[i];
		abytes$2(a);
		sum += a.length;
	}
	const res = new Uint8Array(sum);
	for (let i = 0, pad = 0; i < arrays.length; i++) {
		const a = arrays[i];
		res.set(a, pad);
		pad += a.length;
	}
	return res;
}
/**
* Merges default options and passed options.
* @param defaults - base option object
* @param opts - user overrides
* @param title - label included in thrown override errors
* @returns Fresh merged option object with a null prototype.
* @throws On wrong argument types. {@link TypeError}
* @example
* Merge user overrides onto default options.
* ```ts
* checkOpts({ dkLen: 32 }, { asyncTick: 10 });
* ```
*/
function checkOpts$1(defaults, opts, title = "opts") {
	aopts(defaults, "defaults");
	if (opts !== void 0) aopts(opts, title);
	return Object.assign(Object.create(null), defaults, opts);
}
/**
* Creates a callable hash function from a stateful class constructor.
* @param hashCons - hash constructor or factory
* @param info - optional metadata such as DER OID
* @returns Frozen callable hash wrapper with `.create()`.
*   Wrapper construction eagerly calls `hashCons(undefined)` once to read
*   `outputLen` / `blockLen`, so constructor side effects happen at module
*   init time.
* @throws On wrong argument types. {@link TypeError}
* @example
* Wrap a stateful hash constructor into a callable helper.
* ```ts
* import { createHasher } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const wrapped = createHasher(sha256.create, { oid: sha256.oid });
* wrapped(new Uint8Array([1]));
* ```
*/
function createHasher$1(hashCons, info = {}) {
	if (typeof hashCons !== "function") throw new TypeError("\"hashCons\" expected function, got type=" + typeof hashCons);
	info = checkOpts$1({}, info, "info");
	const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
	const tmp = hashCons(void 0);
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.canXOF = tmp.canXOF;
	hashC.create = (opts) => hashCons(opts);
	Object.assign(hashC, info);
	return Object.freeze(hashC);
}
/**
* Cryptographically secure PRNG backed by `crypto.getRandomValues`.
* @param bytesLength - number of random bytes to generate
* @returns Random bytes.
* The platform `getRandomValues()` implementation still defines any
* single-call length cap, and this helper rejects oversize requests
* with a stable library `RangeError` instead of host-specific errors.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If the current runtime does not provide `crypto.getRandomValues`. {@link Error}
* @example
* Generate a fresh random key or nonce.
* ```ts
* const key = randomBytes(16);
* ```
*/
function randomBytes$3(bytesLength = 32) {
	anumber$2(bytesLength, "bytesLength");
	const cr = typeof globalThis === "object" ? globalThis.crypto : null;
	if (typeof cr?.getRandomValues !== "function") throw new Error("crypto.getRandomValues must be defined");
	if (bytesLength > 65536) throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
	return cr.getRandomValues(new Uint8Array(bytesLength));
}
/**
* Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
* @param suffix - final OID byte for the selected hash.
*   The helper accepts any byte even though only the documented NIST hash
*   suffixes are meaningful downstream.
* @returns Object containing the DER-encoded OID.
* @example
* Build OID metadata for a NIST hash.
* ```ts
* oidNist(0x01);
* ```
*/
var oidNist = (suffix) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	suffix
]) });
//#endregion
//#region node_modules/@noble/hashes/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/**
* Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
* Returns bits from `b` when `a` is set, otherwise from `c`.
* The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
* set the same bit.
* @param a - selector word
* @param b - word chosen when selector bit is set
* @param c - word chosen when selector bit is clear
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit choice primitive.
* ```ts
* Chi(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Chi$2(a, b, c) {
	return a & b ^ ~a & c;
}
/**
* Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
* Returns bits shared by at least two inputs.
* @param a - first input word
* @param b - second input word
* @param c - third input word
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit majority primitive.
* ```ts
* Maj(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Maj$2(a, b, c) {
	return a & b ^ a & c ^ b & c;
}
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
* Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
* strings with partial-byte tails.
* @param blockLen - internal block size in bytes
* @param outputLen - digest size in bytes
* @param padOffset - trailing length field size in bytes
* @param isLE - whether length and state words are encoded in little-endian
* @example
* Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
* ```ts
* import { _SHA1 } from '@noble/hashes/legacy.js';
* const hash = new _SHA1();
* hash.update(new Uint8Array([97, 98, 99]));
* hash.digest();
* ```
*/
var HashMD$1 = class {
	blockLen;
	outputLen;
	canXOF = false;
	padOffset;
	isLE;
	buffer;
	view;
	finished = false;
	length = 0;
	pos = 0;
	destroyed = false;
	constructor(blockLen, outputLen, padOffset, isLE) {
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView$2(this.buffer);
	}
	update(data) {
		aexists$1(this);
		abytes$2(data);
		const { view, buffer, blockLen } = this;
		const len = data.length;
		let processed = false;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView$2(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				processed = true;
				continue;
			}
			buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
				processed = true;
			}
		}
		this.length += data.length;
		if (processed) this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists$1(this);
		aoutput$1(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		buffer.fill(0, pos);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			buffer.fill(0);
		}
		setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
		this.process(view, 0);
		this.roundClean();
		const oview = out === buffer ? view : createView$2(out);
		const len = this.outputLen;
		const outLen = len / 4;
		const state = this.get();
		if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneIntoMeta(to) {
		const { buffer, length, finished, destroyed, pos } = this;
		to.destroyed = destroyed;
		to.finished = finished;
		to.length = length;
		to.pos = pos;
		if (pos) to.buffer.set(buffer);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
};
/**
* Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
* Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
*/
/** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
* square roots of the first eight prime numbers. Exported as a shared table; callers must treat
* it as read-only because constructors copy words from it by index. */
var SHA256_IV$1 = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]);
/** Initial SHA512 state from RFC 6234 §6.3: eight RFC 64-bit `H(0)` words stored as sixteen
* big-endian 32-bit halves. Derived from the fractional parts of the square roots of the first
* eight prime numbers. Exported as a shared table; callers must treat it as read-only because
* constructors copy halves from it by index. */
var SHA512_IV$1 = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	4089235720,
	3144134277,
	2227873595,
	1013904242,
	4271175723,
	2773480762,
	1595750129,
	1359893119,
	2917565137,
	2600822924,
	725511199,
	528734635,
	4215389547,
	1541459225,
	327033209
]);
//#endregion
//#region node_modules/@noble/hashes/sha2.js
/**
* SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
* SHA256 is the fastest hash implementable in JS, even faster than Blake3.
* Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
* {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
* @module
*/
/**
* SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
* of the cube roots of the first 64 primes (2..311).
*/
var SHA256_K$2 = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */
var SHA256_W$2 = /* @__PURE__ */ new Uint32Array(64);
/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
var SHA2_32B = class extends HashMD$1 {
	A = 0;
	B = 0;
	C = 0;
	D = 0;
	E = 0;
	F = 0;
	G = 0;
	H = 0;
	constructor(outputLen, IV) {
		super(64, outputLen, 8, false);
		this.A = IV[0] | 0;
		this.B = IV[1] | 0;
		this.C = IV[2] | 0;
		this.D = IV[3] | 0;
		this.E = IV[4] | 0;
		this.F = IV[5] | 0;
		this.G = IV[6] | 0;
		this.H = IV[7] | 0;
	}
	get() {
		const { A, B, C, D, E, F, G, H } = this;
		return [
			A,
			B,
			C,
			D,
			E,
			F,
			G,
			H
		];
	}
	set(A, B, C, D, E, F, G, H) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
		this.F = F | 0;
		this.G = G | 0;
		this.H = H | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA256_W$2[i] = view.getUint32(offset, false);
		for (let i = 16; i < 64; i++) {
			const W15 = SHA256_W$2[i - 15];
			const W2 = SHA256_W$2[i - 2];
			const s0 = rotr$2(W15, 7) ^ rotr$2(W15, 18) ^ W15 >>> 3;
			const s1 = rotr$2(W2, 17) ^ rotr$2(W2, 19) ^ W2 >>> 10;
			SHA256_W$2[i] = s1 + SHA256_W$2[i - 7] + s0 + SHA256_W$2[i - 16] | 0;
		}
		let { A, B, C, D, E, F, G, H } = this;
		for (let i = 0; i < 64; i++) {
			const sigma1 = rotr$2(E, 6) ^ rotr$2(E, 11) ^ rotr$2(E, 25);
			const T1 = H + sigma1 + Chi$2(E, F, G) + SHA256_K$2[i] + SHA256_W$2[i] | 0;
			const T2 = (rotr$2(A, 2) ^ rotr$2(A, 13) ^ rotr$2(A, 22)) + Maj$2(A, B, C) | 0;
			H = G;
			G = F;
			F = E;
			E = D + T1 | 0;
			D = C;
			C = B;
			B = A;
			A = T1 + T2 | 0;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		F = F + this.F | 0;
		G = G + this.G | 0;
		H = H + this.H | 0;
		this.set(A, B, C, D, E, F, G, H);
	}
	roundClean() {
		clean$1(SHA256_W$2);
	}
	destroy() {
		this.destroyed = true;
		this.set(0, 0, 0, 0, 0, 0, 0, 0);
		clean$1(this.buffer);
	}
};
/** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
var _SHA256 = class extends SHA2_32B {
	constructor() {
		super(32, SHA256_IV$1);
	}
};
var K512$1 = /* @__PURE__ */ (() => split$1([
	"0x428a2f98d728ae22",
	"0x7137449123ef65cd",
	"0xb5c0fbcfec4d3b2f",
	"0xe9b5dba58189dbbc",
	"0x3956c25bf348b538",
	"0x59f111f1b605d019",
	"0x923f82a4af194f9b",
	"0xab1c5ed5da6d8118",
	"0xd807aa98a3030242",
	"0x12835b0145706fbe",
	"0x243185be4ee4b28c",
	"0x550c7dc3d5ffb4e2",
	"0x72be5d74f27b896f",
	"0x80deb1fe3b1696b1",
	"0x9bdc06a725c71235",
	"0xc19bf174cf692694",
	"0xe49b69c19ef14ad2",
	"0xefbe4786384f25e3",
	"0x0fc19dc68b8cd5b5",
	"0x240ca1cc77ac9c65",
	"0x2de92c6f592b0275",
	"0x4a7484aa6ea6e483",
	"0x5cb0a9dcbd41fbd4",
	"0x76f988da831153b5",
	"0x983e5152ee66dfab",
	"0xa831c66d2db43210",
	"0xb00327c898fb213f",
	"0xbf597fc7beef0ee4",
	"0xc6e00bf33da88fc2",
	"0xd5a79147930aa725",
	"0x06ca6351e003826f",
	"0x142929670a0e6e70",
	"0x27b70a8546d22ffc",
	"0x2e1b21385c26c926",
	"0x4d2c6dfc5ac42aed",
	"0x53380d139d95b3df",
	"0x650a73548baf63de",
	"0x766a0abb3c77b2a8",
	"0x81c2c92e47edaee6",
	"0x92722c851482353b",
	"0xa2bfe8a14cf10364",
	"0xa81a664bbc423001",
	"0xc24b8b70d0f89791",
	"0xc76c51a30654be30",
	"0xd192e819d6ef5218",
	"0xd69906245565a910",
	"0xf40e35855771202a",
	"0x106aa07032bbd1b8",
	"0x19a4c116b8d2d0c8",
	"0x1e376c085141ab53",
	"0x2748774cdf8eeb99",
	"0x34b0bcb5e19b48a8",
	"0x391c0cb3c5c95a63",
	"0x4ed8aa4ae3418acb",
	"0x5b9cca4f7763e373",
	"0x682e6ff3d6b2b8a3",
	"0x748f82ee5defb2fc",
	"0x78a5636f43172f60",
	"0x84c87814a1f0ab72",
	"0x8cc702081a6439ec",
	"0x90befffa23631e28",
	"0xa4506cebde82bde9",
	"0xbef9a3f7b2c67915",
	"0xc67178f2e372532b",
	"0xca273eceea26619c",
	"0xd186b8c721c0c207",
	"0xeada7dd6cde0eb1e",
	"0xf57d4f7fee6ed178",
	"0x06f067aa72176fba",
	"0x0a637dc5a2c898a6",
	"0x113f9804bef90dae",
	"0x1b710b35131c471b",
	"0x28db77f523047d84",
	"0x32caab7b40c72493",
	"0x3c9ebe0a15c9bebc",
	"0x431d67c49c100d4c",
	"0x4cc5d4becb3e42b6",
	"0x597f299cfc657e2a",
	"0x5fcb6fab3ad6faec",
	"0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh$1 = /* @__PURE__ */ (() => K512$1[0])();
var SHA512_Kl$1 = /* @__PURE__ */ (() => K512$1[1])();
var SHA512_W_H$1 = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L$1 = /* @__PURE__ */ new Uint32Array(80);
/** Internal SHA-384 / SHA-512 compression engine from RFC 6234 §6.4. */
var SHA2_64B = class extends HashMD$1 {
	Ah = 0;
	Al = 0;
	Bh = 0;
	Bl = 0;
	Ch = 0;
	Cl = 0;
	Dh = 0;
	Dl = 0;
	Eh = 0;
	El = 0;
	Fh = 0;
	Fl = 0;
	Gh = 0;
	Gl = 0;
	Hh = 0;
	Hl = 0;
	constructor(outputLen, IV) {
		super(128, outputLen, 16, false);
		this.Ah = IV[0] | 0;
		this.Al = IV[1] | 0;
		this.Bh = IV[2] | 0;
		this.Bl = IV[3] | 0;
		this.Ch = IV[4] | 0;
		this.Cl = IV[5] | 0;
		this.Dh = IV[6] | 0;
		this.Dl = IV[7] | 0;
		this.Eh = IV[8] | 0;
		this.El = IV[9] | 0;
		this.Fh = IV[10] | 0;
		this.Fl = IV[11] | 0;
		this.Gh = IV[12] | 0;
		this.Gl = IV[13] | 0;
		this.Hh = IV[14] | 0;
		this.Hl = IV[15] | 0;
	}
	get() {
		const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		return [
			Ah,
			Al,
			Bh,
			Bl,
			Ch,
			Cl,
			Dh,
			Dl,
			Eh,
			El,
			Fh,
			Fl,
			Gh,
			Gl,
			Hh,
			Hl
		];
	}
	set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
		this.Ah = Ah | 0;
		this.Al = Al | 0;
		this.Bh = Bh | 0;
		this.Bl = Bl | 0;
		this.Ch = Ch | 0;
		this.Cl = Cl | 0;
		this.Dh = Dh | 0;
		this.Dl = Dl | 0;
		this.Eh = Eh | 0;
		this.El = El | 0;
		this.Fh = Fh | 0;
		this.Fl = Fl | 0;
		this.Gh = Gh | 0;
		this.Gl = Gl | 0;
		this.Hh = Hh | 0;
		this.Hl = Hl | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) {
			SHA512_W_H$1[i] = view.getUint32(offset);
			SHA512_W_L$1[i] = view.getUint32(offset += 4);
		}
		for (let i = 16; i < 80; i++) {
			const W15h = SHA512_W_H$1[i - 15] | 0;
			const W15l = SHA512_W_L$1[i - 15] | 0;
			const s0h = rotrSH$1(W15h, W15l, 1) ^ rotrSH$1(W15h, W15l, 8) ^ shrSH$1(W15h, W15l, 7);
			const s0l = rotrSL$1(W15h, W15l, 1) ^ rotrSL$1(W15h, W15l, 8) ^ shrSL$1(W15h, W15l, 7);
			const W2h = SHA512_W_H$1[i - 2] | 0;
			const W2l = SHA512_W_L$1[i - 2] | 0;
			const s1h = rotrSH$1(W2h, W2l, 19) ^ rotrBH$1(W2h, W2l, 61) ^ shrSH$1(W2h, W2l, 6);
			const SUMl = add4L$1(s0l, rotrSL$1(W2h, W2l, 19) ^ rotrBL$1(W2h, W2l, 61) ^ shrSL$1(W2h, W2l, 6), SHA512_W_L$1[i - 7], SHA512_W_L$1[i - 16]);
			const SUMh = add4H$1(SUMl, s0h, s1h, SHA512_W_H$1[i - 7], SHA512_W_H$1[i - 16]);
			SHA512_W_H$1[i] = SUMh | 0;
			SHA512_W_L$1[i] = SUMl | 0;
		}
		let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		for (let i = 0; i < 80; i++) {
			const sigma1h = rotrSH$1(Eh, El, 14) ^ rotrSH$1(Eh, El, 18) ^ rotrBH$1(Eh, El, 41);
			const sigma1l = rotrSL$1(Eh, El, 14) ^ rotrSL$1(Eh, El, 18) ^ rotrBL$1(Eh, El, 41);
			const CHIh = Eh & Fh ^ ~Eh & Gh;
			const CHIl = El & Fl ^ ~El & Gl;
			const T1ll = add5L$1(Hl, sigma1l, CHIl, SHA512_Kl$1[i], SHA512_W_L$1[i]);
			const T1h = add5H$1(T1ll, Hh, sigma1h, CHIh, SHA512_Kh$1[i], SHA512_W_H$1[i]);
			const T1l = T1ll | 0;
			const sigma0h = rotrSH$1(Ah, Al, 28) ^ rotrBH$1(Ah, Al, 34) ^ rotrBH$1(Ah, Al, 39);
			const sigma0l = rotrSL$1(Ah, Al, 28) ^ rotrBL$1(Ah, Al, 34) ^ rotrBL$1(Ah, Al, 39);
			const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
			const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
			Hh = Gh | 0;
			Hl = Gl | 0;
			Gh = Fh | 0;
			Gl = Fl | 0;
			Fh = Eh | 0;
			Fl = El | 0;
			({h: Eh, l: El} = add$1(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
			Dh = Ch | 0;
			Dl = Cl | 0;
			Ch = Bh | 0;
			Cl = Bl | 0;
			Bh = Ah | 0;
			Bl = Al | 0;
			const All = add3L$1(T1l, sigma0l, MAJl);
			Ah = add3H$1(All, T1h, sigma0h, MAJh);
			Al = All | 0;
		}
		({h: Ah, l: Al} = add$1(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
		({h: Bh, l: Bl} = add$1(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
		({h: Ch, l: Cl} = add$1(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
		({h: Dh, l: Dl} = add$1(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
		({h: Eh, l: El} = add$1(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
		({h: Fh, l: Fl} = add$1(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
		({h: Gh, l: Gl} = add$1(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
		({h: Hh, l: Hl} = add$1(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
		this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
	}
	roundClean() {
		clean$1(SHA512_W_H$1, SHA512_W_L$1);
	}
	destroy() {
		this.destroyed = true;
		clean$1(this.buffer);
		this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
};
/** Internal SHA-512 hash class grounded in RFC 6234 §6.3 and §6.4. */
var _SHA512 = class extends SHA2_64B {
	constructor() {
		super(64, SHA512_IV$1);
	}
};
/**
* SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
*
* - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
* - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
* - Each sha256 hash is executing 2^18 bit operations.
* - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-256.
* ```ts
* sha256(new Uint8Array([97, 98, 99]));
* ```
*/
var sha256$2 = /* @__PURE__ */ createHasher$1(() => new _SHA256(), /* @__PURE__ */ oidNist(1));
/**
* SHA2-512 hash function from RFC 4634.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-512.
* ```ts
* sha512(new Uint8Array([97, 98, 99]));
* ```
*/
var sha512$1 = /* @__PURE__ */ createHasher$1(() => new _SHA512(), /* @__PURE__ */ oidNist(3));
//#endregion
//#region node_modules/@noble/curves/utils.js
/**
* Hex, bytes and number utilities.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/**
* Validates that a value is an array, optionally validating each element.
* @param item - Value to validate.
* @param title - Label included in thrown errors.
* @param inner - Optional per-element validator, called with the element and its label.
* @returns The validated array.
* @example
* Validate an array of points before batch processing.
*
* ```ts
* aarray([1n, 2n], 'scalars');
* ```
*/
function aarray(item, title, inner = () => {}) {
	if (!Array.isArray(item)) throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
	for (let i = 0; i < item.length; i++) inner(item[i], `${title}[${i}]`);
	return item;
}
/**
* Validates that a value is a byte array.
* @param value - Value to validate.
* @param length - Optional exact byte length.
* @param title - Optional field name.
* @returns Original byte array.
* @example
* Reject non-byte input before passing data into curve code.
*
* ```ts
* abytes(new Uint8Array(1));
* ```
*/
var abytes$1 = (value, length, title) => abytes$2(value, length, title);
/**
* Validates that a value is a non-negative safe integer.
* @param n - Value to validate.
* @param title - Optional field name.
* @returns The validated number.
* @example
* Validate a numeric length before allocating buffers.
*
* ```ts
* anumber(1);
* ```
*/
var anumber$1 = anumber$2;
/**
* Asserts something is a plain object-ish value, not null or array.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated object.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate an options object before checking fields.
*
* ```ts
* aobject({ flag: true });
* ```
*/
function aobject(value, title = "object") {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
	return value;
}
/**
* Asserts something is a function.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated function.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate a required method before calling it.
*
* ```ts
* afunction(() => true, 'predicate');
* ```
*/
function afunction(value, title) {
	if (typeof value !== "function") throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
	return value;
}
/**
* Encodes bytes as lowercase hex.
* @param bytes - Bytes to encode.
* @returns Lowercase hex string.
* @example
* Serialize bytes as hex for logging or fixtures.
*
* ```ts
* bytesToHex(Uint8Array.of(1, 2, 3));
* ```
*/
var bytesToHex$2 = bytesToHex$3;
/**
* Concatenates byte arrays.
* @param arrays - Byte arrays to join.
* @returns Concatenated bytes.
* @example
* Join domain-separated chunks into one buffer.
*
* ```ts
* concatBytes(Uint8Array.of(1), Uint8Array.of(2));
* ```
*/
var concatBytes$3 = (...arrays) => concatBytes$4(...arrays);
/**
* Decodes lowercase or uppercase hex into bytes.
* @param hex - Hex string to decode.
* @returns Decoded bytes.
* @example
* Parse fixture hex into bytes before hashing.
*
* ```ts
* hexToBytes('0102');
* ```
*/
var hexToBytes$2 = (hex) => hexToBytes$3(hex);
/**
* Checks whether a value is a Uint8Array.
* @param a - Value to inspect.
* @returns `true` when `a` is a Uint8Array.
* @example
* Branch on byte input before decoding it.
*
* ```ts
* isBytes(new Uint8Array(1));
* ```
*/
var isBytes$1 = isBytes$2;
/**
* Reads random bytes from the platform CSPRNG.
* @param bytesLength - Number of random bytes to read.
* @returns Fresh random bytes.
* @example
* Generate a random seed for a keypair.
*
* ```ts
* randomBytes(2);
* ```
*/
var randomBytes$2 = (bytesLength) => randomBytes$3(bytesLength);
var _0n$13 = /* @__PURE__ */ BigInt(0);
var _1n$15 = /* @__PURE__ */ BigInt(1);
var atitle = (title) => title ? `"${title}" ` : "";
/**
* Validates that a flag is boolean.
* @param value - Value to validate.
* @param title - Optional field name.
* @returns Original value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Reject non-boolean option flags early.
*
* ```ts
* abool(true);
* ```
*/
function abool(value, title = "") {
	if (typeof value !== "boolean") throw new TypeError(atitle(title) + "expected boolean, got type=" + typeof value);
	return value;
}
/**
* Validates that a value is a non-negative bigint or safe integer.
* @param n - Value to validate.
* @returns The same validated value.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate one integer-like value before serializing it.
*
* ```ts
* abignumber(1n);
* ```
*/
function abignumber(n) {
	if (typeof n === "bigint") {
		if (!isPosBig$1(n)) throw new RangeError("positive bigint expected, got " + n);
	} else anumber$1(n);
	return n;
}
/**
* Validates that a value is a safe integer.
* @param value - Integer to validate.
* @param title - Optional field name.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a window size before scalar arithmetic uses it.
*
* ```ts
* asafenumber(1);
* ```
*/
function asafenumber(value, title = "") {
	if (typeof value !== "number") {
		const prefix = title && `"${title}" `;
		throw new TypeError(prefix + "expected number, got type=" + typeof value);
	}
	if (!Number.isSafeInteger(value)) {
		const prefix = title && `"${title}" `;
		throw new RangeError(prefix + "expected safe integer, got " + value);
	}
}
/**
* Parses a big-endian hex string into bigint.
* Accepts odd-length hex through the native `BigInt('0x' + hex)` parser and currently surfaces the
* same native `SyntaxError` for malformed hex instead of wrapping it in a library-specific error.
* @param hex - Hex string without `0x`.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Parse a scalar from fixture hex.
*
* ```ts
* hexToNumber('ff');
* ```
*/
function hexToNumber$2(hex) {
	if (typeof hex !== "string") throw new TypeError("hex string expected, got " + typeof hex);
	return hex === "" ? _0n$13 : BigInt("0x" + hex);
}
/**
* Parses big-endian bytes into bigint.
* @param bytes - Bytes in big-endian order.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Read a scalar encoded in network byte order.
*
* ```ts
* bytesToNumberBE(Uint8Array.of(1, 0));
* ```
*/
function bytesToNumberBE$2(bytes) {
	return hexToNumber$2(bytesToHex$3(bytes));
}
/**
* Parses little-endian bytes into bigint.
* @param bytes - Bytes in little-endian order.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Read a scalar encoded in little-endian form.
*
* ```ts
* bytesToNumberLE(Uint8Array.of(1, 0));
* ```
*/
function bytesToNumberLE$2(bytes) {
	return hexToNumber$2(bytesToHex$3(copyBytes$1(abytes$2(bytes)).reverse()));
}
/**
* Encodes a bigint into fixed-length big-endian bytes.
* @param n - Number to encode.
* @param len - Output length in bytes. Must be greater than zero.
* @returns Big-endian byte array.
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If a documented runtime validation or state check fails. {@link Error}
* @example
* Serialize a scalar into a 32-byte field element.
*
* ```ts
* numberToBytesBE(255n, 2);
* ```
*/
function numberToBytesBE$2(n, len) {
	anumber$2(len);
	if (len === 0) throw new Error("zero output length is invalid");
	n = abignumber(n);
	const expectedLen = len * 2;
	const hex = n.toString(16);
	if (hex.length > expectedLen) throw new RangeError("number is too large");
	return hexToBytes$3(hex.padStart(expectedLen, "0"));
}
/**
* Encodes a bigint into fixed-length little-endian bytes.
* @param n - Number to encode.
* @param len - Output length in bytes.
* @returns Little-endian byte array.
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If a documented runtime validation or state check fails. {@link Error}
* @example
* Serialize a scalar for little-endian protocols.
*
* ```ts
* numberToBytesLE(255n, 2);
* ```
*/
function numberToBytesLE$2(n, len) {
	return numberToBytesBE$2(n, len).reverse();
}
/**
* Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
* and Buffer#slice creates mutable copy. Never use Buffers!
* @param bytes - Bytes to copy.
* @returns Detached copy.
* @example
* Make an isolated copy before mutating serialized bytes.
*
* ```ts
* copyBytes(Uint8Array.of(1, 2, 3));
* ```
*/
function copyBytes$1(bytes) {
	return Uint8Array.from(abytes$1(bytes));
}
/**
* Checks whether n is non-negative bigint. Historical name.
* @param n - candidate value
* @returns `true` when the value is bigint and 0 or larger
* @example
* Check a candidate scalar before range validation.
*
* ```ts
* isPosBig(2n);
* ```
*/
function isPosBig$1(n) {
	return typeof n === "bigint" && _0n$13 <= n;
}
/**
* Checks whether a bigint lies inside a half-open range.
* @param n - Candidate value.
* @param min - Inclusive lower bound.
* @param max - Exclusive upper bound.
* @returns `true` when the value is inside the range.
* @example
* Check whether a candidate scalar fits the field order.
*
* ```ts
* inRange(2n, 1n, 3n);
* ```
*/
function inRange$1(n, min, max) {
	return isPosBig$1(n) && isPosBig$1(min) && isPosBig$1(max) && min <= n && n < max;
}
/**
* Asserts `min <= n < max`. NOTE: upper bound is exclusive.
* @param title - Value label for error messages.
* @param n - Candidate value.
* @param min - Inclusive lower bound.
* @param max - Exclusive upper bound.
* Wrong-type inputs are not separated from out-of-range values here: they still flow through the
* shared `RangeError` path because this is only a throwing wrapper around `inRange(...)`.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Assert that a bigint stays within one half-open range.
*
* ```ts
* aInRange('x', 2n, 1n, 256n);
* ```
*/
function aInRange$1(title, n, min, max) {
	if (!inRange$1(n, min, max)) throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
/**
* Calculates amount of bits in a bigint.
* Same as `n.toString(2).length`
* TODO: merge with nLength in modular
* @param n - Value to inspect.
* @returns Bit length.
* @throws If the value is negative. {@link Error}
* @example
* Measure the bit length of a scalar before serialization.
*
* ```ts
* bitLen(8n);
* ```
*/
function bitLen$2(n) {
	if (n < _0n$13) throw new Error("expected non-negative bigint, got " + n);
	return n === _0n$13 ? 0 : n.toString(2).length;
}
/**
* Calculate mask for N bits. Not using ** operator with bigints because of old engines.
* Same as BigInt(`0b${Array(i).fill('1').join('')}`)
* @param n - Number of bits. Negative widths are currently passed through to raw bigint shift
*   semantics and therefore produce `-1n`.
* @returns Bitmask value.
* @example
* Calculate mask for N bits.
*
* ```ts
* bitMask(4);
* ```
*/
var bitMask$2 = (n) => {
	asafenumber(n, "n");
	return (_1n$15 << BigInt(n)) - _1n$15;
};
/**
* Validates declared required and optional field types on a plain object.
* Extra keys are intentionally ignored because many callers validate only the subset they use from
* richer option bags or runtime objects.
* This walks field schemas and formats detailed errors, so avoid it on hot paths; use direct
* one-line guards such as `aobject()`, `afunction()`, `abool()`, or `asafenumber()` instead.
* @param object - Object to validate.
* @param fields - Required field types.
* @param optFields - Optional field types.
* @param title - Object label included in thrown errors.
* @throws On wrong argument types. {@link TypeError}
* @example
* Check user options before building a curve helper.
*
* ```ts
* validateObject({ flag: true }, { flag: 'boolean' });
* ```
*/
function validateObject$1(object, fields = {}, optFields = {}, title = "object") {
	aobject(object, title);
	aobject(fields, "fields");
	aobject(optFields, "optFields");
	function checkField(fieldName, expectedType, isOpt) {
		const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
		const val = object[fieldName];
		if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) throw new TypeError(`${label} is invalid: expected own property`);
		if (isOpt && val === void 0) return;
		const current = typeof val;
		if (current !== expectedType || val === null) throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
	}
	const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
	iter(fields, false);
	iter(optFields, true);
}
//#endregion
//#region node_modules/@noble/curves/abstract/modular.js
/**
* Utils for modular division and fields.
* Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
* There is no division: it is replaced by modular multiplicative inverse.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$12 = /* @__PURE__ */ BigInt(0);
var _1n$14 = /* @__PURE__ */ BigInt(1);
var _2n$10 = /* @__PURE__ */ BigInt(2);
var _3n$4 = /* @__PURE__ */ BigInt(3);
var _4n$5 = /* @__PURE__ */ BigInt(4);
var _5n$4 = /* @__PURE__ */ BigInt(5);
var _7n$1 = /* @__PURE__ */ BigInt(7);
var _8n$6 = /* @__PURE__ */ BigInt(8);
var _9n$2 = /* @__PURE__ */ BigInt(9);
var _15n = /* @__PURE__ */ BigInt(15);
var _16n$2 = /* @__PURE__ */ BigInt(16);
var POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
/**
* @param a - Dividend value.
* @param b - Positive modulus.
* @returns Reduced value in `[0, b)` only when `b` is positive.
* @throws If the modulus is not positive. {@link Error}
* @example
* Normalize a bigint into one field residue.
*
* ```ts
* mod(-1n, 5n);
* ```
*/
function mod$2(a, b) {
	if (b <= _0n$12) throw new Error("mod: expected positive modulus, got " + b);
	const result = a % b;
	return result >= _0n$12 ? result : b + result;
}
/**
* Efficiently raise num to a power with modular reduction.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
* Low-level helper: callers that need canonical residues must pass a valid `num` for the chosen
* modulus instead of relying on the `power===0/1` fast paths to normalize it.
* @param num - Base value.
* @param power - Exponent value.
* @param modulo - Reduction modulus.
* @returns Modular exponentiation result.
* @throws If the modulus or exponent is invalid. {@link Error}
* @example
* Raise one bigint to a modular power.
*
* ```ts
* pow(2n, 6n, 11n) // 64n % 11n == 9n
* ```
*/
function pow$1(num, power, modulo) {
	if (modulo <= _1n$14) throw new Error("pow: expected modulus > 1, got " + modulo);
	if (typeof power !== "bigint") throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
	if (power < _0n$12) throw new Error("invalid exponent, negatives unsupported");
	if (power === _0n$12) return _1n$14;
	if (power === _1n$14) return num;
	let d = num % modulo;
	if (d < _0n$12) d += modulo;
	if (power < POW_WINDOWED_MIN) {
		let p = _1n$14;
		while (power > _0n$12) {
			if (power & _1n$14) p = p * d % modulo;
			d = d * d % modulo;
			power >>= _1n$14;
		}
		return p;
	}
	const digits = [];
	while (power > _0n$12) {
		digits.push(Number(power & _15n));
		power >>= _4n$5;
	}
	const table = new Array(16);
	table[0] = _1n$14;
	table[1] = d;
	for (let i = 2; i < 16; i++) table[i] = table[i - 1] * d % modulo;
	let p = table[digits[digits.length - 1]];
	for (let w = digits.length - 2; w >= 0; w--) {
		p = p * p % modulo;
		p = p * p % modulo;
		p = p * p % modulo;
		p = p * p % modulo;
		const digit = digits[w];
		if (digit !== 0) p = p * table[digit] % modulo;
	}
	return p;
}
/**
* Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)`.
* Low-level helper: callers that need canonical residues must pass a valid `x` for the chosen
* modulus; the `power===0` fast path intentionally returns the input unchanged.
* @param x - Base value.
* @param power - Number of squarings.
* @param modulo - Reduction modulus.
* @returns Repeated-squaring result.
* @throws If the exponent is negative. {@link Error}
* @example
* Apply repeated squaring inside one field.
*
* ```ts
* pow2(3n, 2n, 11n);
* ```
*/
function pow2$2(x, power, modulo) {
	if (modulo <= _1n$14) throw new Error("pow2: expected modulus > 1, got " + modulo);
	if (power < _0n$12) throw new Error("pow2: expected non-negative exponent, got " + power);
	let res = x;
	while (power-- > _0n$12) {
		res *= res;
		res %= modulo;
	}
	return res;
}
/**
* Inverses number over modulo.
* Implemented using the {@link https://brilliant.org/wiki/extended-euclidean-algorithm/ | extended Euclidean algorithm}.
* @param number - Value to invert.
* @param modulo - Modulus greater than 1.
* @returns Multiplicative inverse.
* @throws If the modulus is invalid or the inverse does not exist. {@link Error}
* @example
* Compute one modular inverse with the extended Euclidean algorithm.
*
* ```ts
* invert(3n, 11n);
* ```
*/
function invert$2(number, modulo) {
	if (number === _0n$12) throw new Error("invert: expected non-zero number");
	if (modulo <= _1n$14) throw new Error("invert: expected modulus > 1, got " + modulo);
	let a = mod$2(number, modulo);
	let b = modulo;
	let x = _0n$12, u = _1n$14;
	while (a !== _0n$12) {
		const q = b / a;
		const r = b - a * q;
		const m = x - u * q;
		b = a, a = r, x = u, u = m;
	}
	if (b !== _1n$14) throw new Error("invert: does not exist");
	return mod$2(x, modulo);
}
function assertIsSquare$1(Fp, root, n) {
	const F = Fp;
	if (!F.eql(F.sqr(root), n)) throw new Error("Cannot find square root");
}
function aoddModulus(order, fnName) {
	if ((order & _1n$14) === _0n$12) throw new Error(fnName + ": expected odd modulus, got " + order);
}
function sqrt3mod4$1(Fp, n) {
	const F = Fp;
	const p1div4 = (F.ORDER + _1n$14) / _4n$5;
	const root = F.pow(n, p1div4);
	assertIsSquare$1(F, root, n);
	return root;
}
function sqrt5mod8$1(Fp, n) {
	const F = Fp;
	const p5div8 = (F.ORDER - _5n$4) / _8n$6;
	const n2 = F.mul(n, _2n$10);
	const v = F.pow(n2, p5div8);
	const nv = F.mul(n, v);
	const i = F.mul(F.mul(nv, _2n$10), v);
	const root = F.mul(nv, F.sub(i, F.ONE));
	assertIsSquare$1(F, root, n);
	return root;
}
function sqrt9mod16$1(P) {
	const Fp_ = Field$2(P);
	const tn = tonelliShanks$2(P);
	const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
	const c2 = tn(Fp_, c1);
	const c3 = tn(Fp_, Fp_.neg(c1));
	const c4 = (P + _7n$1) / _16n$2;
	return ((Fp, n) => {
		const F = Fp;
		let tv1 = F.pow(n, c4);
		let tv2 = F.mul(tv1, c1);
		const tv3 = F.mul(tv1, c2);
		const tv4 = F.mul(tv1, c3);
		const e1 = F.eql(F.sqr(tv2), n);
		const e2 = F.eql(F.sqr(tv3), n);
		tv1 = F.cmov(tv1, tv2, e1);
		tv2 = F.cmov(tv4, tv3, e2);
		const e3 = F.eql(F.sqr(tv2), n);
		const root = F.cmov(tv1, tv2, e3);
		assertIsSquare$1(F, root, n);
		return root;
	});
}
/**
* Tonelli-Shanks square root search algorithm.
* This implementation is variable-time: it searches data-dependently for the first non-residue `Z`
* and for the smallest `i` in the main loop, unlike RFC 9380 Appendix I.4's constant-time shape.
* 1. {@link https://eprint.iacr.org/2012/685.pdf | eprint 2012/685}, page 12
* 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
* @param P - field order
* @returns function that takes field Fp (created from P) and number n
* @throws If the field is too small, non-prime, or the square root does not exist. {@link Error}
* @example
* Construct a square-root helper for primes that need Tonelli-Shanks.
*
* ```ts
* import { Field, tonelliShanks } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const sqrt = tonelliShanks(17n)(Fp, 4n);
* ```
*/
function tonelliShanks$2(P) {
	if (P < _3n$4) throw new Error("sqrt is not defined for small field");
	aoddModulus(P, "tonelliShanks");
	let Q = P - _1n$14;
	let S = 0;
	while (Q % _2n$10 === _0n$12) {
		Q /= _2n$10;
		S++;
	}
	let Z = _2n$10;
	const _Fp = Field$2(P);
	while (FpLegendre$1(_Fp, Z) === 1) if (Z++ > 1e3) throw new Error("Cannot find square root: probably non-prime P");
	if (S === 1) return sqrt3mod4$1;
	let cc = _Fp.pow(Z, Q);
	const Q1div2 = (Q + _1n$14) / _2n$10;
	return function tonelliSlow(Fp, n) {
		const F = Fp;
		if (F.is0(n)) return n;
		if (FpLegendre$1(F, n) !== 1) throw new Error("Cannot find square root");
		let M = S;
		let c = F.mul(F.ONE, cc);
		let t = F.pow(n, Q);
		let R = F.pow(n, Q1div2);
		while (!F.eql(t, F.ONE)) {
			if (F.is0(t)) throw new Error("Cannot find square root: probably non-prime P");
			let i = 1;
			let t_tmp = F.sqr(t);
			while (!F.eql(t_tmp, F.ONE)) {
				i++;
				t_tmp = F.sqr(t_tmp);
				if (i === M) throw new Error("Cannot find square root");
			}
			const exponent = _1n$14 << BigInt(M - i - 1);
			const b = F.pow(c, exponent);
			M = i;
			c = F.sqr(b);
			t = F.mul(t, c);
			R = F.mul(R, b);
		}
		return R;
	};
}
/**
* Square root for a finite field. Will try optimized versions first:
*
* 1. P ≡ 3 (mod 4)
* 2. P ≡ 5 (mod 8)
* 3. P ≡ 9 (mod 16)
* 4. Tonelli-Shanks algorithm
*
* Different algorithms can give different roots, it is up to user to decide which one they want.
* For example there is FpSqrtOdd/FpSqrtEven to choose a root by oddness
* (used for hash-to-curve).
* @param P - Field order.
* @returns Square-root helper. The generic fallback inherits Tonelli-Shanks' variable-time
*   behavior and this selector assumes prime-field-style integer moduli.
* @throws If the field is unsupported or the square root does not exist. {@link Error}
* @example
* Choose the square-root helper appropriate for one field modulus.
*
* ```ts
* import { Field, FpSqrt } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const sqrt = FpSqrt(17n)(Fp, 4n);
* ```
*/
function FpSqrt$2(P) {
	aoddModulus(P, "Fp.sqrt");
	if (P % _4n$5 === _3n$4) return sqrt3mod4$1;
	if (P % _8n$6 === _5n$4) return sqrt5mod8$1;
	if (P % _16n$2 === _9n$2) return sqrt9mod16$1(P);
	return tonelliShanks$2(P);
}
/**
* @param num - Value to inspect.
* @param modulo - Field modulus.
* @returns `true` when the least-significant little-endian bit is set.
* @throws If the modulus is invalid for `mod(...)`. {@link Error}
* @example
* Inspect the low bit used by little-endian sign conventions.
*
* ```ts
* isNegativeLE(3n, 11n);
* ```
*/
var isNegativeLE$1 = (num, modulo) => (mod$2(num, modulo) & _1n$14) === _1n$14;
var FIELD_FIELDS$2 = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
/**
* @param field - Field implementation.
* @returns Validated field. This only checks the arithmetic subset needed by generic helpers; it
*   does not guarantee full runtime-method coverage for serialization, batching, `cmov`, or
*   field-specific extras beyond positive `BYTES` / `BITS`.
* @throws If the field shape or numeric metadata are invalid. {@link Error}
* @example
* Check that a field implementation exposes the operations curve code expects.
*
* ```ts
* import { Field, validateField } from '@noble/curves/abstract/modular.js';
* const Fp = validateField(Field(17n));
* ```
*/
function validateField$2(field) {
	aobject(field, "field");
	if (typeof field.ORDER !== "bigint") throw new TypeError("param \"ORDER\" is invalid: expected bigint, got " + typeof field.ORDER);
	asafenumber(field.BYTES, "BYTES");
	asafenumber(field.BITS, "BITS");
	for (const name of FIELD_FIELDS$2) afunction(field[name], "field." + name);
	if (field.BYTES < 1 || field.BITS < 1) throw new Error("invalid field: expected BYTES/BITS > 0");
	if (field.ORDER <= _1n$14) throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
	return field;
}
function FpInvertBatch$2(Fp, nums, passZero = false) {
	validateField$2(Fp);
	aarray(nums, "nums");
	abool(passZero, "passZero");
	const F = Fp;
	const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
	const multipliedAcc = nums.reduce((acc, num, i) => {
		if (F.is0(num)) return acc;
		inverted[i] = acc;
		return F.mul(acc, num);
	}, F.ONE);
	const invertedAcc = F.inv(multipliedAcc);
	nums.reduceRight((acc, num, i) => {
		if (F.is0(num)) return acc;
		inverted[i] = F.mul(acc, inverted[i]);
		return F.mul(acc, num);
	}, invertedAcc);
	return inverted;
}
/**
* Legendre symbol.
* Legendre constant is used to calculate Legendre symbol (a | p)
* which denotes the value of a^((p-1)/2) (mod p).
*
* * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
* * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
* * (a | p) ≡ 0    if a ≡ 0 (mod p)
* @param Fp - Field implementation.
* @param n - Value to inspect.
* @returns Legendre symbol.
* @throws If the powered value does not match a valid Legendre symbol. {@link Error}
* @example
* Compute the Legendre symbol of one field element.
*
* ```ts
* import { Field, FpLegendre } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const symbol = FpLegendre(Fp, 4n);
* ```
*/
function FpLegendre$1(Fp, n) {
	validateField$2(Fp);
	const F = Fp;
	aoddModulus(F.ORDER, "FpLegendre");
	const p1mod2 = (F.ORDER - _1n$14) / _2n$10;
	const powered = F.pow(n, p1mod2);
	const yes = F.eql(powered, F.ONE);
	const zero = F.eql(powered, F.ZERO);
	const no = F.eql(powered, F.neg(F.ONE));
	if (!yes && !zero && !no) throw new Error("invalid Legendre symbol result");
	return yes ? 1 : zero ? 0 : -1;
}
/**
* @param n - Curve order. Callers are expected to pass a positive order.
* @param nBitLength - Optional cached bit length. Callers are expected to pass a positive cached
*   value when overriding the derived bit length.
* @returns Byte and bit lengths.
* @throws If the order or cached bit length is invalid. {@link Error}
* @example
* Measure the encoding sizes needed for one modulus.
*
* ```ts
* nLength(255n);
* ```
*/
function nLength$2(n, nBitLength) {
	if (nBitLength !== void 0) anumber$1(nBitLength);
	if (n <= _0n$12) throw new Error("invalid n length: expected positive n, got " + n);
	if (nBitLength !== void 0 && nBitLength < 1) throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
	const bits = bitLen$2(n);
	if (nBitLength !== void 0 && nBitLength < bits) throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
	const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
	return {
		nBitLength: _nBitLength,
		nByteLength: Math.ceil(_nBitLength / 8)
	};
}
var FIELD_SQRT = /* @__PURE__ */ new WeakMap();
var _Field = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = _0n$12;
	ONE = _1n$14;
	_lengths;
	_mod;
	constructor(ORDER, opts = {}) {
		if (ORDER <= _1n$14) throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
		let _nbitLength = void 0;
		this.isLE = false;
		if (opts != null && typeof opts === "object") {
			if (typeof opts.BITS === "number") _nbitLength = opts.BITS;
			if (typeof opts.sqrt === "function") Object.defineProperty(this, "sqrt", {
				value: opts.sqrt,
				enumerable: true
			});
			if (typeof opts.isLE === "boolean") this.isLE = opts.isLE;
			if (opts.allowedLengths) this._lengths = Object.freeze(opts.allowedLengths.slice());
			if (typeof opts.modFromBytes === "boolean") this._mod = opts.modFromBytes;
		}
		const { nBitLength, nByteLength } = nLength$2(ORDER, _nbitLength);
		if (nByteLength > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = ORDER;
		this.BITS = nBitLength;
		this.BYTES = nByteLength;
		Object.freeze(this);
	}
	create(num) {
		return mod$2(num, this.ORDER);
	}
	isValid(num) {
		if (typeof num !== "bigint") throw new TypeError("invalid field element: expected bigint, got " + typeof num);
		return _0n$12 <= num && num < this.ORDER;
	}
	is0(num) {
		return num === _0n$12;
	}
	isValidNot0(num) {
		return !this.is0(num) && this.isValid(num);
	}
	isOdd(num) {
		return (num & _1n$14) === _1n$14;
	}
	neg(num) {
		return mod$2(-num, this.ORDER);
	}
	eql(lhs, rhs) {
		return lhs === rhs;
	}
	sqr(num) {
		return mod$2(num * num, this.ORDER);
	}
	add(lhs, rhs) {
		return mod$2(lhs + rhs, this.ORDER);
	}
	sub(lhs, rhs) {
		return mod$2(lhs - rhs, this.ORDER);
	}
	mul(lhs, rhs) {
		return mod$2(lhs * rhs, this.ORDER);
	}
	pow(num, power) {
		return pow$1(num, power, this.ORDER);
	}
	div(lhs, rhs) {
		return mod$2(lhs * invert$2(rhs, this.ORDER), this.ORDER);
	}
	sqrN(num) {
		return num * num;
	}
	addN(lhs, rhs) {
		return lhs + rhs;
	}
	subN(lhs, rhs) {
		return lhs - rhs;
	}
	mulN(lhs, rhs) {
		return lhs * rhs;
	}
	inv(num) {
		return invert$2(num, this.ORDER);
	}
	sqrt(num) {
		let sqrt = FIELD_SQRT.get(this);
		if (!sqrt) FIELD_SQRT.set(this, sqrt = FpSqrt$2(this.ORDER));
		return sqrt(this, num);
	}
	toBytes(num) {
		return this.isLE ? numberToBytesLE$2(num, this.BYTES) : numberToBytesBE$2(num, this.BYTES);
	}
	fromBytes(bytes, skipValidation = false) {
		abytes$1(bytes);
		const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
		if (allowedLengths) {
			if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
			const padded = new Uint8Array(BYTES);
			padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
			bytes = padded;
		}
		if (bytes.length !== BYTES) throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
		let scalar = isLE ? bytesToNumberLE$2(bytes) : bytesToNumberBE$2(bytes);
		if (modFromBytes) scalar = mod$2(scalar, ORDER);
		if (!skipValidation) {
			if (!this.isValid(scalar)) throw new Error("invalid field element: outside of range 0..ORDER");
		}
		return scalar;
	}
	invertBatch(lst) {
		return FpInvertBatch$2(this, lst, true);
	}
	cmov(a, b, condition) {
		abool(condition, "condition");
		return condition ? b : a;
	}
};
/**
* Creates a finite field. Major performance optimizations:
* * 1. Denormalized operations like mulN instead of mul.
* * 2. Identical object shape: never add or remove keys.
* * 3. Frozen stable object shape; the lazy sqrt cache lives in a module-level `WeakMap`.
* Fragile: always run a benchmark on a change.
* Security note: operations and low-level serializers like `toBytes` don't check `isValid` for
* all elements for performance and protocol-flexibility reasons; callers are responsible for
* supplying valid elements when they need canonical field behavior.
* This is low-level code, please make sure you know what you're doing.
*
* Note about field properties:
* * CHARACTERISTIC p = prime number, number of elements in main subgroup.
* * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
*
* @param ORDER - field order, probably prime, or could be composite
* @param opts - Field options such as bit length or endianness. See {@link FieldOpts}.
* @returns Frozen field instance with a stable object shape. This wrapper forwards `opts` straight
*   into `_Field`, so it inherits `_Field`'s assumptions about cached sizes and `allowedLengths`.
* @example
* Construct one prime field with optional overrides.
*
* ```ts
* Field(11n);
* ```
*/
function Field$2(ORDER, opts = {}) {
	Object.freeze(_Field.prototype);
	return new _Field(ORDER, opts);
}
//#endregion
//#region node_modules/@noble/curves/abstract/curve.js
/**
* Methods for elliptic curve multiplication by scalars.
* Contains wNAF-based ScalarMultiplier, pippenger.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$11 = /* @__PURE__ */ BigInt(0);
var _1n$13 = /* @__PURE__ */ BigInt(1);
var _4n$4 = /* @__PURE__ */ BigInt(4);
var BLIND_BYTES = 16;
var BLIND_BITS = 128;
var FW_WINDOW = 5;
var TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
/**
* Validates the static surface of a point constructor.
* This is only a cheap sanity check for the constructor hooks and fields consumed by generic
* factories; it does not certify `BASE`/`ZERO` semantics or prove the curve implementation itself.
* @param Point - Runtime point constructor.
* @throws On missing constructor hooks or malformed field metadata. {@link TypeError}
* @example
* Check that one point constructor exposes the static hooks generic helpers need.
*
* ```ts
* import { ed25519 } from '@noble/curves/ed25519.js';
* import { validatePointCons } from '@noble/curves/abstract/curve.js';
* validatePointCons(ed25519.Point);
* ```
*/
function validatePointCons(Point) {
	const pc = Point;
	if (typeof pc !== "function") throw new TypeError("\"Point\" expected constructor, got type=" + typeof Point);
	afunction(pc.fromAffine, "Point.fromAffine");
	afunction(pc.fromBytes, "Point.fromBytes");
	afunction(pc.fromHex, "Point.fromHex");
	aobject(pc.BASE, "Point.BASE");
	aobject(pc.ZERO, "Point.ZERO");
	validateField$2(pc.Fp);
	validateField$2(pc.Fn);
}
/**
* Takes a bunch of Projective Points but executes only one
* inversion on all of them. Inversion is very slow operation,
* so this improves performance massively.
* Optimization: converts a list of projective points to a list of identical points with Z=1.
* Input points are left unchanged; the normalized points are returned as fresh instances.
* @param c - Point constructor.
* @param points - Projective points.
* @returns Fresh projective points reconstructed from normalized affine coordinates.
* @example
* Batch-normalize projective points with a single shared inversion.
*
* ```ts
* import { normalizeZ } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const points = normalizeZ(p256.Point, [p256.Point.BASE, p256.Point.BASE.double()]);
* ```
*/
function normalizeZ$1(c, points) {
	validatePointCons(c);
	validateMSMPoints$1(points, c);
	const invertedZs = FpInvertBatch$2(c.Fp, points.map((p) => p.Z));
	return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW$1(W, bits, min = 1) {
	if (!Number.isSafeInteger(W) || W < min || W > bits) throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
}
function validateTableBytes(numPoints, fpBytes) {
	const bytes = numPoints * (4 * fpBytes + 128);
	if (bytes > TABLE_BYTES_MAX) throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
}
/**
* Probes an RNG once, at construction time: returns `undefined` when it is unavailable —
* throws or returns malformed bytes — so callers can downgrade to their unblinded /
* deterministic constant-time fallback. Blinding is defense-in-depth (DPA/template
* hardening), not a correctness or key-secrecy requirement, so availability-based
* downgrade is acceptable.
*
* The downgrade decision is deliberately static. After a successful probe the RNG becomes
* part of the trusted contract: later misbehavior must fail closed in per-call validation
* (throw), never downgrade — a dynamic fallback would let a tampered RNG silently strip
* blinding on demand. A probe can only ever classify broken environments, not adversarial
* RNGs: a stateful RNG can always behave while probed and misbehave later.
* @param randomBytes - RNG to probe, or `undefined` when the environment provides none.
* @param length - Byte length requested from the probe call.
* @returns The RNG when the probe produced `length` valid bytes; `undefined` otherwise.
* @example
* Probe an RNG once before enabling scalar blinding.
*
* ```ts
* import { probeRandomBytes } from '@noble/curves/abstract/curve.js';
* import { randomBytes } from '@noble/hashes/utils.js';
* const rng = probeRandomBytes(randomBytes, 16);
* ```
*/
function probeRandomBytes(randomBytes, length) {
	if (randomBytes === void 0) return void 0;
	afunction(randomBytes, "randomBytes");
	try {
		const probe = randomBytes(length);
		if (!isBytes$1(probe) || probe.length !== length) return void 0;
	} catch {
		return;
	}
	return randomBytes;
}
function validateMSMPoints$1(points, c) {
	aarray(points, "points");
	points.forEach((p, i) => {
		if (!(p instanceof c)) throw new Error("invalid point at index " + i);
	});
}
function validateMSMScalars$1(scalars, field, maxScalar) {
	if (!Array.isArray(scalars)) throw new Error("array of scalars expected");
	scalars.forEach((s, i) => {
		if (!(maxScalar === void 0 ? field.isValid(s) : isPosBig$1(s) && s < maxScalar)) throw new Error("invalid scalar at index " + i);
	});
}
var pointWindowSizes$1 = /* @__PURE__ */ new WeakMap();
function getWindowSize(P) {
	return pointWindowSizes$1.get(P) || 1;
}
/** Table of odd multiples [1P, 3P, ..., (2⋅size−1)P]; width-W wNAF uses size = 2^(W−2). */
function oddMultiples(p, size) {
	const dbl = p.double();
	const t = [p];
	for (let j = 1; j < size; j++) t.push(t[j - 1].add(dbl));
	return t;
}
/**
* Width-W wNAF signed-digit recoding (W >= 2), LSB-first: digits are 0 or odd with
* |digit| < 2^(W−1); nonzero density ~1/(W+1) (a nonzero digit is followed by W−1 zeros).
*/
function wnafDigits(n, W) {
	const size = 2 ** W;
	const half = size / 2;
	const mask = BigInt(size - 1);
	const d = [];
	while (n > _0n$11) {
		let w = 0;
		if (n & _1n$13) {
			w = Number(n & mask);
			if (w >= half) w -= size;
			n -= BigInt(w);
		}
		d.push(w);
		n >>= _1n$13;
	}
	return d;
}
/**
* Fixed-position signed-window recoding for precomputed wNAF: `n = Σ digits[w]⋅2^(w⋅W)` with
* digits in `[−2^(W−1)+1, 2^(W−1)]`. Digit count is fixed by `windows` (callers reserve one
* extra window for the final carry), so recoding length does not depend on the scalar.
*/
function signedWindowDigits(n, W, windows) {
	const size = 2 ** W;
	const half = size / 2;
	const mask = BigInt(size - 1);
	const shiftBy = BigInt(W);
	const d = [];
	for (let w = 0; w < windows; w++) {
		let v = Number(n & mask);
		n >>= shiftBy;
		if (v > half) {
			v -= size;
			n += _1n$13;
		}
		d.push(v);
	}
	if (n !== _0n$11) throw new Error("invalid wnaf");
	return d;
}
/**
* Shared vartime walk over per-scalar wNAF digit streams: one doubling of a single shared
* accumulator per bit position of the longest recoding, one signed table addition per
* nonzero digit. `tables[i]` must hold the odd multiples of the i-th point.
*/
function wnafWalk(zero, tables, digits) {
	let max = 0;
	for (const d of digits) max = Math.max(max, d.length);
	let acc = zero;
	for (let bit = max - 1; bit >= 0; bit--) {
		if (bit !== max - 1) acc = acc.double();
		for (let i = 0; i < digits.length; i++) {
			const w = digits[i][bit];
			if (w) {
				const item = tables[i][Math.abs(w) - 1 >> 1];
				acc = acc.add(w < 0 ? item.negate() : item);
			}
		}
	}
	return acc;
}
/**
* Elliptic curve multiplication of Point by scalar.
* Routes between cached-table, fixed-window, and one-shot wNAF paths; entry points validate
* their own scalars (`mulCT`/`mulCTBlinded`: `1 <= s < Fn.ORDER`; `mulUnsafe`: up to the
* `Fn.ORDER^4` DoS cap via {@link mulAddUnsafe}).
* Table generation is expensive and happens on first call of `multiply()`
* (or eagerly via `precompute(W, false)`). By default, `BASE` point is precomputed.
*
* Cached algorithm is signed fixed-window wNAF:
* - table stores, for every window w, the multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P` — all doublings
*   are baked in, so a multiplication is exactly one table addition per window
* - window count is fixed (`ceil(bits/W) + 1`), so the point-operation count is scalar-independent
*   (basis of the constant-time path)
* - for a 256-bit curve and W=6: 44⋅32 = 1408 table points, 44 additions per multiply
* - secret scalars are additionally blinded (see {@link ScalarMultiplier.mulCTBlinded}), which
*   widens tables by 128 bits
* @param Point - Point constructor.
* @param randomBytes - RNG used for scalar blinding; required by the blinded secret path.
* @example
* Elliptic curve multiplication of Point by scalar.
*
* ```ts
* import { ScalarMultiplier } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const mul = new ScalarMultiplier(p256.Point);
* ```
*/
var ScalarMultiplier = class {
	Point;
	BASE;
	ZERO;
	randomBytes;
	wnafPrecomputes = /* @__PURE__ */ new WeakMap();
	baseCanBeBlinded;
	bits;
	constructor(Point, randomBytes) {
		validatePointCons(Point);
		this.randomBytes = probeRandomBytes(randomBytes, BLIND_BYTES);
		this.Point = Point;
		this.BASE = Point.BASE;
		this.ZERO = Point.ZERO;
		this.bits = Point.Fn.BITS;
	}
	/**
	* Creates a signed fixed-window wNAF precomputation table: for every window w, the
	* multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
	* so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
	* window absorbs the final carry of signed-digit recoding.
	* For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
	* @param point - Point instance
	* @param W - window size
	* @param bits - scalar bitlength the table must cover
	*/
	buildWnafTable(point, W, bits) {
		const windows = Math.ceil(bits / W) + 1;
		const half = 2 ** (W - 1);
		const comp = [];
		let base = point;
		for (let w = 0; w < windows; w++) {
			let acc = base;
			for (let i = 0; i < half; i++) {
				comp.push(acc);
				acc = acc.add(base);
			}
			base = comp[comp.length - 1].double();
		}
		return {
			W,
			bits,
			windows,
			comp
		};
	}
	/**
	* Implements ec multiplication using precomputed signed fixed-window wNAF tables.
	* Constant-time: fixed window count with one table addition per window — zero digits feed
	* the fake accumulator — and no doublings; the lookup scans the whole window slice.
	* Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
	* {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
	* signedWindowDigits throws if `n` exceeds the table.
	* @returns real and fake (for const-time) points
	*/
	wnafCachedCT(precomputes, n) {
		const { W, windows, comp } = precomputes;
		const half = 2 ** (W - 1);
		const digits = signedWindowDigits(n, W, windows);
		let p = this.ZERO;
		let f = this.BASE;
		for (let w = 0; w < windows; w++) {
			const digit = digits[w];
			const start = w * half;
			const idx = Math.abs(digit) - 1;
			let sel = comp[start];
			for (let i = 1; i < half; i++) sel = i === idx ? comp[start + i] : sel;
			const neg = sel.negate();
			if (digit === 0) f = f.add(comp[start]);
			else p = p.add(digit < 0 ? neg : sel);
		}
		return {
			p,
			f
		};
	}
	getWnafPrecomputes(W, point, bits, transform) {
		let entries = this.wnafPrecomputes.get(point);
		let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
		if (!comp) {
			comp = this.buildWnafTable(point, W, bits);
			if (typeof transform === "function") comp = {
				...comp,
				comp: transform(comp.comp)
			};
			if (!entries) {
				entries = [];
				this.wnafPrecomputes.set(point, entries);
			}
			entries.push(comp);
		}
		return comp;
	}
	assertPoint(point) {
		if (!(point instanceof this.Point)) throw new TypeError("\"point\" expected Point instance, got type=" + typeof point);
	}
	validateMulInput(point, scalar) {
		this.assertPoint(point);
		if (!inRange$1(scalar, _1n$13, this.Point.Fn.ORDER)) throw new Error("invalid scalar");
	}
	runCT(point, n, bits, transform) {
		const W = getWindowSize(point);
		if (W === 1) return this.fixedWindowCT(point, n, bits);
		return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
	}
	mulCT(point, scalar, transform) {
		this.validateMulInput(point, scalar);
		return this.runCT(point, scalar, this.bits, transform);
	}
	mulCTBlinded(point, scalar, transform) {
		this.validateMulInput(point, scalar);
		if (this.randomBytes === void 0) throw new Error("randomBytes is required for scalar blinding");
		const bits = this.Point.Fn.BITS + BLIND_BITS;
		const blind = this.randomBytes(BLIND_BYTES);
		if (!isBytes$1(blind) || blind.length !== BLIND_BYTES) throw new Error("randomBytes returned invalid byte array");
		blind[0] = blind[0] & 63 | 128;
		const n = scalar + bytesToNumberBE$2(blind) * this.Point.Fn.ORDER;
		return this.runCT(point, n, bits, transform);
	}
	/**
	* Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
	* A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
	* far cheaper to build for a single use. The point-operation sequence is independent of `n`:
	* build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
	* every table entry, and one addition (adds the identity when the window digit is 0 — never
	* skipped).
	*
	* `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
	* add), which holds for the Weierstrass/Edwards point types used here. The table is left in
	* projective form (no normalizeZ): normalizing this small a table costs more than the
	* mixed-add savings it would buy for a single multiply.
	* @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
	* (this path needs no fake accumulator — its op-count is already scalar-independent).
	*/
	fixedWindowCT(point, n, bits) {
		const W = FW_WINDOW;
		const size = 32;
		const mask = bitMask$2(W);
		const table = new Array(size);
		table[0] = this.ZERO;
		for (let i = 1; i < size; i++) table[i] = table[i - 1].add(point);
		const windows = Math.ceil(bits / W);
		let acc = this.ZERO;
		for (let window = windows - 1; window >= 0; window--) {
			if (window !== windows - 1) for (let d = 0; d < W; d++) acc = acc.double();
			const digit = Number(n >> BigInt(window * W) & mask);
			let sel = table[0];
			for (let i = 1; i < size; i++) sel = i === digit ? table[i] : sel;
			acc = acc.add(sel);
		}
		return {
			p: acc,
			f: acc
		};
	}
	shouldBlind(point, cofactor) {
		if (this.randomBytes === void 0) return false;
		if (cofactor === _1n$13) return true;
		if (point !== this.BASE) return false;
		if (this.baseCanBeBlinded === void 0) this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
		return this.baseCanBeBlinded;
	}
	mulSecret(point, scalar, cofactor, transform) {
		return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
	}
	mulUnsafe(point, scalar, transform) {
		this.assertPoint(point);
		if (!isPosBig$1(scalar)) throw new Error("invalid scalar");
		const W = getWindowSize(point);
		if (W === 1 || scalar >= this.Point.Fn.ORDER) return mulAddUnsafe(this.Point, [point], [scalar], true);
		const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
		return this.wnafCachedCT(precomputes, scalar).p;
	}
	setWindowSize(point, W) {
		this.assertPoint(point);
		validateW$1(W, this.bits);
		validateTableBytes((Math.ceil((this.bits + BLIND_BITS) / W) + 1) * 2 ** (W - 1), this.Point.Fp.BYTES);
		pointWindowSizes$1.set(point, W);
		this.wnafPrecomputes.delete(point);
	}
	hasWindowSize(point) {
		return getWindowSize(point) !== 1;
	}
};
/**
* Combined multi-scalar multiplication `Σ scalars[i]⋅points[i]` via interleaved width-4 wNAF
* (Strauss–Shamir). Every input gets its own table of odd multiples `[1P, 3P, 5P, 7P]` and
* signed-digit recoding, but all walks share one doubling chain, so total cost is
* `~bits` doublings + `L⋅bits/5` additions instead of `L⋅bits` doublings for separate
* multiplications. Intended for the 2-4 point shapes of signature verification
* (`R = u1⋅G + u2⋅P`); use {@link pippenger} for larger batches.
*
* Not constant-time: only for public inputs. Scalars must satisfy `0 <= s < Fn.ORDER`;
* fold negative signs into the points before calling.
* @param c - Point constructor.
* @param points - Array of curve points.
* @param scalars - Array of non-negative scalars, same length as points.
* @param allowOversized - Replace the `s < Fn.ORDER` scalar check with a `Fn.ORDER^4` DoS cap.
*   Off by default. For scalars that must NOT be reduced mod ORDER: torsion checks
*   (`Fn.ORDER⋅P ≟ O`) and cofactor-clearing multiples. Walk length grows with `bitLen(s)`.
* @returns Combined multiplication result; identity for empty input.
* @throws If the point set or scalar set is invalid. {@link Error}
* @example
* Combined multi-scalar multiplication via Strauss–Shamir.
*
* ```ts
* import { mulAddUnsafe } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const G = p256.Point.BASE;
* const R = mulAddUnsafe(p256.Point, [G, G.double()], [2n, 3n]); // 2⋅G + 3⋅(2⋅G)
* ```
*/
function mulAddUnsafe(c, points, scalars, allowOversized = false) {
	validatePointCons(c);
	validateMSMPoints$1(points, c);
	abool(allowOversized, "allowOversized");
	validateMSMScalars$1(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n$4 : void 0);
	if (points.length !== scalars.length) throw new Error("arrays of points and scalars must have equal length");
	const tables = points.map((p) => oddMultiples(p, 4));
	const digits = scalars.map((n) => wnafDigits(n, 4));
	return wnafWalk(c.ZERO, tables, digits);
}
function createField$1(order, field, isLE) {
	if (field) {
		if (field.ORDER !== order) throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
		validateField$2(field);
		return field;
	} else return Field$2(order, { isLE });
}
/**
* Validates basic CURVE shape and field membership, then creates fields.
* This does not prove that the generator is on-curve, that subgroup/order data are consistent, or
* that the curve equation itself is otherwise sane.
* @param type - Curve family.
* @param CURVE - Curve parameters.
* @param curveOpts - Optional field overrides. See {@link FpFn}:
*   - `Fp` (optional): Optional base-field override.
*   - `Fn` (optional): Optional scalar-field override.
* @param FpFnLE - Whether field encoding is little-endian.
* @returns Frozen curve parameters and fields.
* @throws If the curve parameters or field overrides are invalid. {@link Error}
* @example
* Build curve fields from raw constants before constructing a curve instance.
*
* ```ts
* const curve = createCurveFields('weierstrass', {
*   p: 17n,
*   n: 19n,
*   h: 1n,
*   a: 2n,
*   b: 2n,
*   Gx: 5n,
*   Gy: 1n,
* });
* ```
*/
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
	if (type !== "weierstrass" && type !== "edwards") throw new Error("expected curve type \"weierstrass\" or \"edwards\"");
	if (FpFnLE === void 0) FpFnLE = type === "edwards";
	if (!CURVE || typeof CURVE !== "object") throw new Error(`expected valid ${type} CURVE object`);
	validateObject$1(curveOpts);
	for (const p of [
		"p",
		"n",
		"h"
	]) {
		const val = CURVE[p];
		if (!(isPosBig$1(val) && val !== _0n$11)) throw new Error(`CURVE.${p} must be positive bigint`);
	}
	const Fp = createField$1(CURVE.p, curveOpts.Fp, FpFnLE);
	const Fn = createField$1(CURVE.n, curveOpts.Fn, FpFnLE);
	const params = [
		"Gx",
		"Gy",
		"a",
		type === "weierstrass" ? "b" : "d"
	];
	for (const p of params) if (!Fp.isValid(CURVE[p])) throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
	CURVE = Object.freeze(Object.assign({}, CURVE));
	return {
		CURVE,
		Fp,
		Fn
	};
}
/**
* @param randomSecretKey - Secret-key generator.
* @param getPublicKey - Public-key derivation helper.
* @returns Keypair generator.
* @example
* Build a `keygen()` helper from existing secret-key and public-key primitives.
*
* ```ts
* import { createKeygen } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const keygen = createKeygen(p256.utils.randomSecretKey, p256.getPublicKey);
* const pair = keygen();
* ```
*/
function createKeygen(randomSecretKey, getPublicKey) {
	return function keygen(seed) {
		const secretKey = randomSecretKey(seed);
		return {
			secretKey,
			publicKey: getPublicKey(secretKey)
		};
	};
}
//#endregion
//#region node_modules/@noble/curves/abstract/edwards.js
/**
* Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
* For design rationale of types / exports, see weierstrass module documentation.
* Untwisted Edwards curves exist, but they aren't used in real-world protocols.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$10 = /* @__PURE__ */ BigInt(0);
var _1n$12 = /* @__PURE__ */ BigInt(1);
var _2n$9 = /* @__PURE__ */ BigInt(2);
var _4n$3 = /* @__PURE__ */ BigInt(4);
var _8n$5 = /* @__PURE__ */ BigInt(8);
function isEdValidXY$1(Fp, CURVE, x, y) {
	const x2 = Fp.sqr(x);
	const y2 = Fp.sqr(y);
	const left = Fp.add(Fp.mul(CURVE.a, x2), y2);
	const right = Fp.add(Fp.ONE, Fp.mul(CURVE.d, Fp.mul(x2, y2)));
	return Fp.eql(left, right);
}
/**
* @param params - Curve parameters. See {@link EdwardsOpts}.
* @param extraOpts - Optional helpers and overrides. See {@link EdwardsExtraOpts}.
* @returns Edwards point constructor. Generator validation here only checks
*   that `(Gx, Gy)` satisfies the affine Edwards equation.
*   RFC 8032 base-point constraints like `B != (0,1)` and `[L]B = 0`
*   are left to the caller's chosen parameters, since eager subgroup
*   validation here adds about 10-15ms to heavyweight imports like ed448.
*   The returned constructor also eagerly marks `Point.BASE` for W=6
*   precompute caching. Some code paths still assume
*   `Fp.BYTES === Fn.BYTES`, so mismatched byte lengths are not fully audited here.
* @throws If the curve parameters or Edwards overrides are invalid. {@link Error}
* @example
* ```ts
* import { edwards } from '@noble/curves/abstract/edwards.js';
* import { jubjub } from '@noble/curves/misc.js';
* // Build a point constructor from explicit curve parameters, then use its base point.
* const Point = edwards(jubjub.Point.CURVE());
* Point.BASE.toHex();
* ```
*/
function edwards$1(params, extraOpts = {}) {
	validateObject$1(extraOpts, {}, {}, "extraOpts");
	const opts = extraOpts;
	const validated = createCurveFields("edwards", params, opts, opts.FpFnLE);
	const { Fp, Fn } = validated;
	let CURVE = validated.CURVE;
	const { h: cofactor } = CURVE;
	if (FpLegendre$1(Fp, CURVE.a) !== 1) throw new Error("edwards: CURVE.a must be a square in Fp for complete addition formulas");
	if (FpLegendre$1(Fp, CURVE.d) !== -1) throw new Error("edwards: CURVE.d must be a non-square in Fp for complete addition formulas");
	validateObject$1(opts, {}, {
		uvRatio: "function",
		randomBytes: "function"
	});
	const randomBytes = opts.randomBytes === void 0 ? randomBytes$2 : opts.randomBytes;
	const MASK = _2n$9 << BigInt(Fp.BYTES * 8) - _1n$12;
	function isOdd(n) {
		if (!Fp.isOdd) throw new Error("Field does not have .isOdd()");
		return Fp.isOdd(n);
	}
	const uvRatio = opts.uvRatio === void 0 ? (u, v) => {
		try {
			return {
				isValid: true,
				value: Fp.sqrt(Fp.div(u, v))
			};
		} catch (e) {
			return {
				isValid: false,
				value: _0n$10
			};
		}
	} : opts.uvRatio;
	if (!isEdValidXY$1(Fp, CURVE, CURVE.Gx, CURVE.Gy)) throw new Error("bad curve params: generator point");
	const mulA = Fp.eql(CURVE.a, Fp.neg(Fp.ONE)) ? (x) => Fp.neg(x) : Fp.eql(CURVE.a, Fp.ONE) ? (x) => x : (x) => Fp.mul(CURVE.a, x);
	/**
	* Asserts coordinate is valid: 0 <= n < MASK.
	* Coordinates >= Fp.ORDER are allowed for zip215.
	*/
	function acoord(title, n, banZero = false) {
		const min = banZero ? _1n$12 : _0n$10;
		aInRange$1("coordinate " + title, n, min, MASK);
		return n;
	}
	function aedpoint(other) {
		if (!(other instanceof Point)) throw new Error("EdwardsPoint expected");
	}
	class Point {
		static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE, Fp.mul(CURVE.Gx, CURVE.Gy));
		static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ONE, Fp.ZERO);
		static Fp = Fp;
		static Fn = Fn;
		X;
		Y;
		Z;
		T;
		constructor(X, Y, Z, T) {
			this.X = acoord("x", X);
			this.Y = acoord("y", Y);
			this.Z = acoord("z", Z, true);
			this.T = acoord("t", T);
			Object.freeze(this);
		}
		static CURVE() {
			return CURVE;
		}
		/**
		* Create one extended Edwards point from affine coordinates.
		* Does NOT validate that the point is on-curve or torsion-free.
		* Use `.assertValidity()` on adversarial inputs.
		*/
		static fromAffine(p) {
			if (p instanceof Point) throw new Error("extended point not allowed");
			const { x, y } = p || {};
			acoord("x", x);
			acoord("y", y);
			return new Point(x, y, Fp.ONE, Fp.mul(x, y));
		}
		static fromBytes(bytes, zip215 = false) {
			const len = Fp.BYTES;
			const { a, d } = CURVE;
			bytes = copyBytes$1(abytes$1(bytes, len, "point"));
			abool(zip215, "zip215");
			const normed = copyBytes$1(bytes);
			const lastByte = bytes[len - 1];
			normed[len - 1] = lastByte & -129;
			const y = bytesToNumberLE$2(normed);
			aInRange$1("point.y", y, _0n$10, zip215 ? MASK : Fp.ORDER);
			const y2 = Fp.sqr(y);
			const u = Fp.sub(y2, Fp.ONE);
			const v = Fp.sub(Fp.mulN(d, y2), a);
			let { isValid, value: x } = uvRatio(u, v);
			if (!isValid) throw new Error("bad point: invalid y coordinate");
			const isXOdd = isOdd(x);
			const isLastByteOdd = (lastByte & 128) !== 0;
			if (!zip215 && Fp.is0(x) && isLastByteOdd) throw new Error("bad point: x=0 and x_0=1");
			if (isLastByteOdd !== isXOdd) x = Fp.neg(x);
			return Point.fromAffine({
				x,
				y
			});
		}
		static fromHex(hex, zip215 = false) {
			return Point.fromBytes(hexToBytes$2(hex), zip215);
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(windowSize = 6, isLazy = true) {
			wnaf.setWindowSize(this, windowSize);
			if (!isLazy) this.multiply(_2n$9);
			return this;
		}
		assertValidity() {
			const p = this;
			const { a, d } = CURVE;
			if (p.is0()) throw new Error("bad point: ZERO");
			const { X, Y, Z, T } = p;
			const X2 = Fp.sqr(X);
			const Y2 = Fp.sqr(Y);
			const Z2 = Fp.sqr(Z);
			const Z4 = Fp.sqr(Z2);
			const aX2 = Fp.mul(X2, a);
			const left = Fp.mul(Fp.add(aX2, Y2), Z2);
			const right = Fp.add(Z4, Fp.mul(d, Fp.mul(X2, Y2)));
			if (!Fp.eql(left, right)) throw new Error("bad point: equation left != right (1)");
			const XY = Fp.mul(X, Y);
			const ZT = Fp.mul(Z, T);
			if (!Fp.eql(XY, ZT)) throw new Error("bad point: equation left != right (2)");
		}
		equals(other) {
			aedpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			const X1Z2 = Fp.mul(X1, Z2);
			const X2Z1 = Fp.mul(X2, Z1);
			const Y1Z2 = Fp.mul(Y1, Z2);
			const Y2Z1 = Fp.mul(Y2, Z1);
			return Fp.eql(X1Z2, X2Z1) && Fp.eql(Y1Z2, Y2Z1);
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		negate() {
			return new Point(Fp.neg(this.X), this.Y, this.Z, Fp.neg(this.T));
		}
		double() {
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const A = Fp.sqr(X1);
			const B = Fp.sqr(Y1);
			const C = Fp.mul(Fp.sqr(Z1), _2n$9);
			const D = mulA(A);
			const x1y1 = Fp.addN(X1, Y1);
			const E = Fp.sub(Fp.subN(Fp.sqr(x1y1), A), B);
			const G = Fp.addN(D, B);
			const F = Fp.subN(G, C);
			const H = Fp.subN(D, B);
			const X3 = Fp.mul(E, F);
			const Y3 = Fp.mul(G, H);
			const T3 = Fp.mul(E, H);
			const Z3 = Fp.mul(F, G);
			return new Point(X3, Y3, Z3, T3);
		}
		add(other) {
			aedpoint(other);
			const { d } = CURVE;
			const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
			const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
			const A = Fp.mul(X1, X2);
			const B = Fp.mul(Y1, Y2);
			const C = Fp.mul(Fp.mulN(T1, d), T2);
			const D = Fp.mul(Z1, Z2);
			const E = Fp.sub(Fp.subN(Fp.mulN(Fp.addN(X1, Y1), Fp.addN(X2, Y2)), A), B);
			const F = Fp.subN(D, C);
			const G = Fp.addN(D, C);
			const H = Fp.sub(B, mulA(A));
			const X3 = Fp.mul(E, F);
			const Y3 = Fp.mul(G, H);
			const T3 = Fp.mul(E, H);
			const Z3 = Fp.mul(F, G);
			return new Point(X3, Y3, Z3, T3);
		}
		subtract(other) {
			aedpoint(other);
			return this.add(other.negate());
		}
		multiply(scalar) {
			if (!Fn.isValidNot0(scalar)) throw new RangeError("invalid scalar: expected 1 <= sc < curve.n");
			const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
			return normalize([p, f])[0];
		}
		multiplyUnsafe(scalar) {
			if (!Fn.isValid(scalar)) throw new RangeError("invalid scalar: expected 0 <= sc < curve.n");
			if (scalar === _0n$10) return Point.ZERO;
			if (this.is0() || scalar === _1n$12) return this;
			return wnaf.mulUnsafe(this, scalar, normalize);
		}
		isSmallOrder() {
			return this.clearCofactor().is0();
		}
		isTorsionFree() {
			return wnaf.mulUnsafe(this, CURVE.n).is0();
		}
		toAffine(invertedZ) {
			const p = this;
			let iz = invertedZ;
			if (iz != null && typeof iz !== "bigint") throw new TypeError("\"invertedZ\" expected bigint, got type=" + typeof iz);
			const { X, Y, Z } = p;
			const is0 = p.is0();
			if (iz == null) iz = is0 ? Fp.create(_8n$5) : Fp.inv(Z);
			const x = Fp.mul(X, iz);
			const y = Fp.mul(Y, iz);
			const zz = Fp.mul(Z, iz);
			if (is0) return {
				x: Fp.ZERO,
				y: Fp.ONE
			};
			if (!Fp.eql(zz, Fp.ONE)) throw new Error("invZ was invalid");
			return {
				x,
				y
			};
		}
		clearCofactor() {
			if (cofactor === _1n$12) return this;
			if (cofactor === _2n$9) return this.double();
			if (cofactor === _4n$3) return this.double().double();
			if (cofactor === _8n$5) return this.double().double().double();
			return this.multiplyUnsafe(cofactor);
		}
		toBytes() {
			const { x, y } = this.toAffine();
			const bytes = Fp.toBytes(y);
			bytes[bytes.length - 1] |= isOdd(x) ? 128 : 0;
			return bytes;
		}
		toHex() {
			return bytesToHex$2(this.toBytes());
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	const normalize = (points) => normalizeZ$1(Point, points);
	const wnaf = new ScalarMultiplier(Point, randomBytes);
	if (wnaf.bits >= 6) Point.BASE.precompute(6);
	Object.freeze(Point.prototype);
	Object.freeze(Point);
	return Point;
}
/**
* Initializes EdDSA signatures over given Edwards curve.
* @param Point - Edwards point constructor.
* @param cHash - Hash function.
* @param eddsaOpts - Optional signature helpers. See {@link EdDSAOpts}.
* @returns EdDSA helper namespace.
* @throws If the hash function, options, or derived point operations are invalid. {@link Error}
* @example
* Initializes EdDSA signatures over given Edwards curve.
*
* ```ts
* import { eddsa } from '@noble/curves/abstract/edwards.js';
* import { jubjub } from '@noble/curves/misc.js';
* import { sha512 } from '@noble/hashes/sha2.js';
* const sigs = eddsa(jubjub.Point, sha512);
* const { secretKey, publicKey } = sigs.keygen();
* const msg = new TextEncoder().encode('hello noble');
* const sig = sigs.sign(msg, secretKey);
* const isValid = sigs.verify(sig, msg, publicKey);
* ```
*/
function eddsa$1(Point, cHash, eddsaOpts = {}) {
	validatePointCons(Point);
	if (typeof cHash !== "function") throw new Error("\"hash\" function param is required");
	const hash = cHash;
	const opts = eddsaOpts;
	validateObject$1(opts, {}, {
		adjustScalarBytes: "function",
		randomBytes: "function",
		domain: "function",
		prehash: "function",
		zip215: "boolean",
		mapToCurve: "function",
		toMontgomery: "function",
		toMontgomerySecret: "function"
	});
	const { prehash } = opts;
	const { BASE, Fp, Fn } = Point;
	const outputLen = hash.outputLen;
	const expectedLen = 2 * Fp.BYTES;
	if (outputLen !== void 0) {
		asafenumber(outputLen, "hash.outputLen");
		if (outputLen !== expectedLen) throw new Error(`hash.outputLen must be ${expectedLen}, got ${outputLen}`);
	}
	const randomBytes = opts.randomBytes === void 0 ? randomBytes$2 : opts.randomBytes;
	const toMontgomery = opts.toMontgomery;
	const toMontgomerySecret = opts.toMontgomerySecret;
	const adjustScalarBytes = opts.adjustScalarBytes === void 0 ? (bytes) => bytes : opts.adjustScalarBytes;
	const domain = opts.domain === void 0 ? (data, ctx, phflag) => {
		abool(phflag, "phflag");
		if (ctx.length || phflag) throw new Error("Contexts/pre-hash are not supported");
		return data;
	} : opts.domain;
	function modN_LE(hash) {
		return Fn.create(bytesToNumberLE$2(hash));
	}
	function getPrivateScalar(key) {
		const len = lengths.secretKey;
		abytes$1(key, lengths.secretKey, "secretKey");
		const hashed = abytes$1(hash(key), 2 * len, "hashedSecretKey");
		const head = adjustScalarBytes(hashed.slice(0, len));
		return {
			head,
			prefix: hashed.slice(len, 2 * len),
			scalar: modN_LE(head)
		};
	}
	/** Convenience method that creates public key from scalar. RFC8032 5.1.5
	* Also exposes the derived scalar/prefix tuple and point form reused by sign().
	*/
	function getExtendedPublicKey(secretKey) {
		const { head, prefix, scalar } = getPrivateScalar(secretKey);
		const point = BASE.multiply(scalar);
		return {
			head,
			prefix,
			scalar,
			point,
			pointBytes: point.toBytes()
		};
	}
	/** Calculates EdDSA pub key. RFC8032 5.1.5. */
	function getPublicKey(secretKey) {
		return getExtendedPublicKey(secretKey).pointBytes;
	}
	function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
		const msg = concatBytes$3(...msgs);
		return modN_LE(hash(domain(msg, abytes$1(context, void 0, "context"), !!prehash)));
	}
	/** Signs message with secret key. RFC8032 5.1.6 */
	function sign(msg, secretKey, options = {}) {
		validateObject$1(options, {}, {}, "options");
		msg = copyBytes$1(abytes$1(msg, void 0, "message"));
		if (prehash) msg = prehash(msg);
		const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
		const r = hashDomainToScalar(options.context, prefix, msg);
		const R = BASE.multiply(r).toBytes();
		const k = hashDomainToScalar(options.context, R, pointBytes, msg);
		const s = Fn.create(r + k * scalar);
		if (!Fn.isValid(s)) throw new Error("sign failed: invalid s");
		return abytes$1(concatBytes$3(R, Fn.toBytes(s)), lengths.signature, "result");
	}
	const verifyOpts = { zip215: opts.zip215 };
	/**
	* Verifies EdDSA signature against message and public key. RFC 8032 §§5.1.7 and 5.2.7.
	* A cofactored verification equation is checked.
	*/
	function verify(sig, msg, publicKey, options = verifyOpts) {
		validateObject$1(options);
		const { context } = options;
		const zip215 = options.zip215 === void 0 ? !!verifyOpts.zip215 : options.zip215;
		const len = lengths.signature;
		sig = abytes$1(sig, len, "signature");
		msg = abytes$1(msg, void 0, "message");
		publicKey = abytes$1(publicKey, lengths.publicKey, "publicKey");
		if (zip215 !== void 0) abool(zip215, "zip215");
		if (prehash) msg = prehash(msg);
		const mid = len / 2;
		const r = sig.subarray(0, mid);
		const s = bytesToNumberLE$2(sig.subarray(mid, len));
		let A, R, SB;
		try {
			A = Point.fromBytes(publicKey, zip215);
			R = Point.fromBytes(r, zip215);
			SB = BASE.multiplyUnsafe(s);
		} catch (error) {
			return false;
		}
		if (!zip215 && A.isSmallOrder()) return false;
		const k = hashDomainToScalar(context, r, publicKey, msg);
		return R.add(A.multiplyUnsafe(k)).subtract(SB).clearCofactor().is0();
	}
	const _size = Fp.BYTES;
	const lengths = {
		secretKey: _size,
		publicKey: _size,
		signature: 2 * _size,
		seed: _size
	};
	function randomSecretKey(seed) {
		seed = seed === void 0 ? randomBytes(lengths.seed) : seed;
		return abytes$1(seed, lengths.seed, "seed");
	}
	function isValidSecretKey(key) {
		return isBytes$1(key) && key.length === lengths.secretKey;
	}
	function isValidPublicKey(key, zip215) {
		try {
			return !!Point.fromBytes(key, zip215 === void 0 ? verifyOpts.zip215 : zip215);
		} catch (error) {
			return false;
		}
	}
	const utils = {
		getExtendedPublicKey,
		randomSecretKey,
		isValidSecretKey,
		isValidPublicKey,
		/** Converts an Edwards public key to a companion Montgomery public key. */
		toMontgomery(publicKey) {
			if (toMontgomery === void 0) throw new Error("Montgomery conversion is not supported for this curve");
			return toMontgomery(Point.fromBytes(publicKey));
		},
		toMontgomerySecret(secretKey) {
			if (toMontgomerySecret === void 0) throw new Error("Montgomery conversion is not supported for this curve");
			return toMontgomerySecret(secretKey);
		}
	};
	Object.freeze(lengths);
	Object.freeze(utils);
	return Object.freeze({
		keygen: createKeygen(randomSecretKey, getPublicKey),
		getPublicKey,
		sign,
		verify,
		utils,
		Point,
		lengths
	});
}
//#endregion
//#region node_modules/@noble/curves/ed25519.js
/**
* ed25519 Twisted Edwards curve with following addons:
* - X25519 ECDH
* - Ristretto cofactor elimination
* - Elligator hash-to-group / point indistinguishability
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _1n$11 = /* @__PURE__ */ BigInt(1);
var _2n$8 = /* @__PURE__ */ BigInt(2);
var _5n$3 = /* @__PURE__ */ BigInt(5);
var _8n$4 = /* @__PURE__ */ BigInt(8);
var ed25519_CURVE_p$1 = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
var ed25519_CURVE$1 = /* @__PURE__ */ (() => ({
	p: ed25519_CURVE_p$1,
	n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
	h: _8n$4,
	a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
	d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
	Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
	Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
}))();
function ed25519_pow_2_252_3$1(x) {
	const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
	const P = ed25519_CURVE_p$1;
	const b2 = x * x % P * x % P;
	const b5 = pow2$2(pow2$2(b2, _2n$8, P) * b2 % P, _1n$11, P) * x % P;
	const b10 = pow2$2(b5, _5n$3, P) * b5 % P;
	const b20 = pow2$2(b10, _10n, P) * b10 % P;
	const b40 = pow2$2(b20, _20n, P) * b20 % P;
	const b80 = pow2$2(b40, _40n, P) * b40 % P;
	return {
		pow_p_5_8: pow2$2(pow2$2(pow2$2(pow2$2(b80, _80n, P) * b80 % P, _80n, P) * b80 % P, _10n, P) * b10 % P, _2n$8, P) * x % P,
		b2
	};
}
function adjustScalarBytes$1(bytes) {
	bytes[0] &= 248;
	bytes[31] &= 127;
	bytes[31] |= 64;
	return bytes;
}
var ED25519_SQRT_M1$1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function uvRatio$1(u, v) {
	const P = ed25519_CURVE_p$1;
	const v3 = mod$2(v * v * v, P);
	const pow = ed25519_pow_2_252_3$1(u * mod$2(v3 * v3 * v, P)).pow_p_5_8;
	let x = mod$2(u * v3 * pow, P);
	const vx2 = mod$2(v * x * x, P);
	const root1 = x;
	const root2 = mod$2(x * ED25519_SQRT_M1$1, P);
	const useRoot1 = vx2 === u;
	const useRoot2 = vx2 === mod$2(-u, P);
	const noRoot = vx2 === mod$2(-u * ED25519_SQRT_M1$1, P);
	if (useRoot1) x = root1;
	if (useRoot2 || noRoot) x = root2;
	if (isNegativeLE$1(x, P)) x = mod$2(-x, P);
	return {
		isValid: useRoot1 || useRoot2,
		value: x
	};
}
var ed25519_Point = /* @__PURE__ */ edwards$1(ed25519_CURVE$1, { uvRatio: uvRatio$1 });
var Fp$2 = /* @__PURE__ */ (() => ed25519_Point.Fp)();
function toMontgomery(point) {
	const { y } = point;
	return Fp$2.toBytes(Fp$2.div(_1n$11 + y, _1n$11 - y));
}
function toMontgomerySecret(secretKey) {
	const size = ed25519_Point.Fp.BYTES;
	abytes$2(secretKey, size);
	return adjustScalarBytes$1(sha512$1(secretKey.subarray(0, size))).subarray(0, size);
}
function ed(opts) {
	return eddsa$1(ed25519_Point, sha512$1, Object.assign({
		adjustScalarBytes: adjustScalarBytes$1,
		toMontgomery,
		toMontgomerySecret,
		zip215: true
	}, opts));
}
/**
* ed25519 curve with EdDSA signatures.
* Seeded `keygen(seed)` / `utils.randomSecretKey(seed)` reuse the provided
* 32-byte seed buffer instead of copying it.
* @example
* Generate one Ed25519 keypair, sign a message, and verify it.
*
* ```js
* import { ed25519 } from '@noble/curves/ed25519.js';
* const { secretKey, publicKey } = ed25519.keygen();
* // const publicKey = ed25519.getPublicKey(secretKey);
* const msg = new TextEncoder().encode('hello noble');
* const sig = ed25519.sign(msg, secretKey);
* const isValid = ed25519.verify(sig, msg, publicKey); // ZIP215
* // RFC8032 / FIPS 186-5
* const isValid2 = ed25519.verify(sig, msg, publicKey, { zip215: false });
* ```
*/
var ed25519$1 = /* @__PURE__ */ ed({});
//#endregion
//#region node_modules/ethers/node_modules/@noble/hashes/esm/_assert.js
function number(n) {
	if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Wrong positive integer: ${n}`);
}
function bytes(b, ...lengths) {
	if (!(b instanceof Uint8Array)) throw new Error("Expected Uint8Array");
	if (lengths.length > 0 && !lengths.includes(b.length)) throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
function hash(hash) {
	if (typeof hash !== "function" || typeof hash.create !== "function") throw new Error("Hash should be wrapped by utils.wrapConstructor");
	number(hash.outputLen);
	number(hash.blockLen);
}
function exists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("Hash instance has been destroyed");
	if (checkFinished && instance.finished) throw new Error("Hash#digest() has already been called");
}
function output(out, instance) {
	bytes(out);
	const min = instance.outputLen;
	if (out.length < min) throw new Error(`digestInto() expects output buffer of length at least ${min}`);
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/hashes/esm/cryptoNode.js
var crypto$1 = nc && typeof nc === "object" && "webcrypto" in nc ? nc.webcrypto : void 0;
//#endregion
//#region node_modules/ethers/node_modules/@noble/hashes/esm/utils.js
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var u8a$1 = (a) => a instanceof Uint8Array;
var u32$1 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
var createView$1 = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
var rotr$1 = (word, shift) => word << 32 - shift | word >>> shift;
if (!(new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)) throw new Error("Non little-endian hardware is not supported");
var nextTick = async () => {};
async function asyncLoop(iters, tick, cb) {
	let ts = Date.now();
	for (let i = 0; i < iters; i++) {
		cb(i);
		const diff = Date.now() - ts;
		if (diff >= 0 && diff < tick) continue;
		await /* @__PURE__ */ nextTick();
		ts += diff;
	}
}
/**
* @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
*/
function utf8ToBytes$2(str) {
	if (typeof str !== "string") throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
	return new Uint8Array(new TextEncoder().encode(str));
}
/**
* Normalizes (non-hex) string or Uint8Array to Uint8Array.
* Warning: when Uint8Array is passed, it would NOT get copied.
* Keep in mind for future mutable operations.
*/
function toBytes$1(data) {
	if (typeof data === "string") data = utf8ToBytes$2(data);
	if (!u8a$1(data)) throw new Error(`expected Uint8Array, got ${typeof data}`);
	return data;
}
/**
* Copies several Uint8Arrays into one.
*/
function concatBytes$2(...arrays) {
	const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
	let pad = 0;
	arrays.forEach((a) => {
		if (!u8a$1(a)) throw new Error("Uint8Array expected");
		r.set(a, pad);
		pad += a.length;
	});
	return r;
}
var Hash$1 = class {
	clone() {
		return this._cloneInto();
	}
};
var toStr = {}.toString;
function checkOpts(defaults, opts) {
	if (opts !== void 0 && toStr.call(opts) !== "[object Object]") throw new Error("Options should be object or undefined");
	return Object.assign(defaults, opts);
}
function wrapConstructor(hashCons) {
	const hashC = (msg) => hashCons().update(toBytes$1(msg)).digest();
	const tmp = hashCons();
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.create = () => hashCons();
	return hashC;
}
/**
* Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
*/
function randomBytes$1(bytesLength = 32) {
	if (crypto$1 && typeof crypto$1.getRandomValues === "function") return crypto$1.getRandomValues(new Uint8Array(bytesLength));
	throw new Error("crypto.getRandomValues must be defined");
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/hashes/esm/_sha2.js
function setBigUint64$1(view, byteOffset, value, isLE) {
	if (typeof view.setBigUint64 === "function") return view.setBigUint64(byteOffset, value, isLE);
	const _32n = BigInt(32);
	const _u32_max = BigInt(4294967295);
	const wh = Number(value >> _32n & _u32_max);
	const wl = Number(value & _u32_max);
	const h = isLE ? 4 : 0;
	const l = isLE ? 0 : 4;
	view.setUint32(byteOffset + h, wh, isLE);
	view.setUint32(byteOffset + l, wl, isLE);
}
var SHA2 = class extends Hash$1 {
	constructor(blockLen, outputLen, padOffset, isLE) {
		super();
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.finished = false;
		this.length = 0;
		this.pos = 0;
		this.destroyed = false;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView$1(this.buffer);
	}
	update(data) {
		exists(this);
		const { view, buffer, blockLen } = this;
		data = toBytes$1(data);
		const len = data.length;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView$1(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				continue;
			}
			buffer.set(data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
			}
		}
		this.length += data.length;
		this.roundClean();
		return this;
	}
	digestInto(out) {
		exists(this);
		output(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		this.buffer.subarray(pos).fill(0);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			pos = 0;
		}
		for (let i = pos; i < blockLen; i++) buffer[i] = 0;
		setBigUint64$1(view, blockLen - 8, BigInt(this.length * 8), isLE);
		this.process(view, 0);
		const oview = createView$1(out);
		const len = this.outputLen;
		if (len % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
		const outLen = len / 4;
		const state = this.get();
		if (outLen > state.length) throw new Error("_sha2: outputLen bigger than state");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneInto(to) {
		to || (to = new this.constructor());
		to.set(...this.get());
		const { blockLen, buffer, length, finished, destroyed, pos } = this;
		to.length = length;
		to.pos = pos;
		to.finished = finished;
		to.destroyed = destroyed;
		if (length % blockLen) to.buffer.set(buffer);
		return to;
	}
};
//#endregion
//#region node_modules/ethers/node_modules/@noble/hashes/esm/sha256.js
var Chi$1 = (a, b, c) => a & b ^ ~a & c;
var Maj$1 = (a, b, c) => a & b ^ a & c ^ b & c;
var SHA256_K$1 = /* @__PURE__ */ new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
var IV = /* @__PURE__ */ new Uint32Array([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]);
var SHA256_W$1 = /* @__PURE__ */ new Uint32Array(64);
var SHA256$1 = class extends SHA2 {
	constructor() {
		super(64, 32, 8, false);
		this.A = IV[0] | 0;
		this.B = IV[1] | 0;
		this.C = IV[2] | 0;
		this.D = IV[3] | 0;
		this.E = IV[4] | 0;
		this.F = IV[5] | 0;
		this.G = IV[6] | 0;
		this.H = IV[7] | 0;
	}
	get() {
		const { A, B, C, D, E, F, G, H } = this;
		return [
			A,
			B,
			C,
			D,
			E,
			F,
			G,
			H
		];
	}
	set(A, B, C, D, E, F, G, H) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
		this.F = F | 0;
		this.G = G | 0;
		this.H = H | 0;
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA256_W$1[i] = view.getUint32(offset, false);
		for (let i = 16; i < 64; i++) {
			const W15 = SHA256_W$1[i - 15];
			const W2 = SHA256_W$1[i - 2];
			const s0 = rotr$1(W15, 7) ^ rotr$1(W15, 18) ^ W15 >>> 3;
			const s1 = rotr$1(W2, 17) ^ rotr$1(W2, 19) ^ W2 >>> 10;
			SHA256_W$1[i] = s1 + SHA256_W$1[i - 7] + s0 + SHA256_W$1[i - 16] | 0;
		}
		let { A, B, C, D, E, F, G, H } = this;
		for (let i = 0; i < 64; i++) {
			const sigma1 = rotr$1(E, 6) ^ rotr$1(E, 11) ^ rotr$1(E, 25);
			const T1 = H + sigma1 + Chi$1(E, F, G) + SHA256_K$1[i] + SHA256_W$1[i] | 0;
			const T2 = (rotr$1(A, 2) ^ rotr$1(A, 13) ^ rotr$1(A, 22)) + Maj$1(A, B, C) | 0;
			H = G;
			G = F;
			F = E;
			E = D + T1 | 0;
			D = C;
			C = B;
			B = A;
			A = T1 + T2 | 0;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		F = F + this.F | 0;
		G = G + this.G | 0;
		H = H + this.H | 0;
		this.set(A, B, C, D, E, F, G, H);
	}
	roundClean() {
		SHA256_W$1.fill(0);
	}
	destroy() {
		this.set(0, 0, 0, 0, 0, 0, 0, 0);
		this.buffer.fill(0);
	}
};
/**
* SHA2-256 hash function
* @param message - data that would be hashed
*/
var sha256$1 = /* @__PURE__ */ wrapConstructor(() => new SHA256$1());
//#endregion
//#region node_modules/ethers/node_modules/@noble/hashes/esm/hmac.js
var HMAC$1 = class extends Hash$1 {
	constructor(hash$1, _key) {
		super();
		this.finished = false;
		this.destroyed = false;
		hash(hash$1);
		const key = toBytes$1(_key);
		this.iHash = hash$1.create();
		if (typeof this.iHash.update !== "function") throw new Error("Expected instance of class which extends utils.Hash");
		this.blockLen = this.iHash.blockLen;
		this.outputLen = this.iHash.outputLen;
		const blockLen = this.blockLen;
		const pad = new Uint8Array(blockLen);
		pad.set(key.length > blockLen ? hash$1.create().update(key).digest() : key);
		for (let i = 0; i < pad.length; i++) pad[i] ^= 54;
		this.iHash.update(pad);
		this.oHash = hash$1.create();
		for (let i = 0; i < pad.length; i++) pad[i] ^= 106;
		this.oHash.update(pad);
		pad.fill(0);
	}
	update(buf) {
		exists(this);
		this.iHash.update(buf);
		return this;
	}
	digestInto(out) {
		exists(this);
		bytes(out, this.outputLen);
		this.finished = true;
		this.iHash.digestInto(out);
		this.oHash.update(out);
		this.oHash.digestInto(out);
		this.destroy();
	}
	digest() {
		const out = new Uint8Array(this.oHash.outputLen);
		this.digestInto(out);
		return out;
	}
	_cloneInto(to) {
		to || (to = Object.create(Object.getPrototypeOf(this), {}));
		const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
		to = to;
		to.finished = finished;
		to.destroyed = destroyed;
		to.blockLen = blockLen;
		to.outputLen = outputLen;
		to.oHash = oHash._cloneInto(to.oHash);
		to.iHash = iHash._cloneInto(to.iHash);
		return to;
	}
	destroy() {
		this.destroyed = true;
		this.oHash.destroy();
		this.iHash.destroy();
	}
};
/**
* HMAC: RFC2104 message authentication code.
* @param hash - function that would be used e.g. sha256
* @param key - message key
* @param message - message data
*/
var hmac$1 = (hash, key, message) => new HMAC$1(hash, key).update(message).digest();
hmac$1.create = (hash, key) => new HMAC$1(hash, key);
//#endregion
//#region node_modules/ethers/node_modules/@noble/curves/esm/abstract/utils.js
var utils_exports = /* @__PURE__ */ __exportAll({
	bitGet: () => bitGet,
	bitLen: () => bitLen$1,
	bitMask: () => bitMask$1,
	bitSet: () => bitSet,
	bytesToHex: () => bytesToHex$1,
	bytesToNumberBE: () => bytesToNumberBE$1,
	bytesToNumberLE: () => bytesToNumberLE$1,
	concatBytes: () => concatBytes$1,
	createHmacDrbg: () => createHmacDrbg$1,
	ensureBytes: () => ensureBytes$1,
	equalBytes: () => equalBytes$1,
	hexToBytes: () => hexToBytes$1,
	hexToNumber: () => hexToNumber$1,
	numberToBytesBE: () => numberToBytesBE$1,
	numberToBytesLE: () => numberToBytesLE$1,
	numberToHexUnpadded: () => numberToHexUnpadded$1,
	numberToVarBytesBE: () => numberToVarBytesBE,
	utf8ToBytes: () => utf8ToBytes$1,
	validateObject: () => validateObject
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$9 = BigInt(0);
var _1n$10 = BigInt(1);
var _2n$7 = BigInt(2);
var u8a = (a) => a instanceof Uint8Array;
var hexes$1 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
* @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
*/
function bytesToHex$1(bytes) {
	if (!u8a(bytes)) throw new Error("Uint8Array expected");
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += hexes$1[bytes[i]];
	return hex;
}
function numberToHexUnpadded$1(num) {
	const hex = num.toString(16);
	return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber$1(hex) {
	if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
	return BigInt(hex === "" ? "0" : `0x${hex}`);
}
/**
* @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
*/
function hexToBytes$1(hex) {
	if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
	const len = hex.length;
	if (len % 2) throw new Error("padded hex string expected, got unpadded hex of length " + len);
	const array = new Uint8Array(len / 2);
	for (let i = 0; i < array.length; i++) {
		const j = i * 2;
		const hexByte = hex.slice(j, j + 2);
		const byte = Number.parseInt(hexByte, 16);
		if (Number.isNaN(byte) || byte < 0) throw new Error("Invalid byte sequence");
		array[i] = byte;
	}
	return array;
}
function bytesToNumberBE$1(bytes) {
	return hexToNumber$1(bytesToHex$1(bytes));
}
function bytesToNumberLE$1(bytes) {
	if (!u8a(bytes)) throw new Error("Uint8Array expected");
	return hexToNumber$1(bytesToHex$1(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE$1(n, len) {
	return hexToBytes$1(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE$1(n, len) {
	return numberToBytesBE$1(n, len).reverse();
}
function numberToVarBytesBE(n) {
	return hexToBytes$1(numberToHexUnpadded$1(n));
}
/**
* Takes hex string or Uint8Array, converts to Uint8Array.
* Validates output length.
* Will throw error for other types.
* @param title descriptive title for an error e.g. 'private key'
* @param hex hex string or Uint8Array
* @param expectedLength optional, will compare to result array's length
* @returns
*/
function ensureBytes$1(title, hex, expectedLength) {
	let res;
	if (typeof hex === "string") try {
		res = hexToBytes$1(hex);
	} catch (e) {
		throw new Error(`${title} must be valid hex string, got "${hex}". Cause: ${e}`);
	}
	else if (u8a(hex)) res = Uint8Array.from(hex);
	else throw new Error(`${title} must be hex string or Uint8Array`);
	const len = res.length;
	if (typeof expectedLength === "number" && len !== expectedLength) throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
	return res;
}
/**
* Copies several Uint8Arrays into one.
*/
function concatBytes$1(...arrays) {
	const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
	let pad = 0;
	arrays.forEach((a) => {
		if (!u8a(a)) throw new Error("Uint8Array expected");
		r.set(a, pad);
		pad += a.length;
	});
	return r;
}
function equalBytes$1(b1, b2) {
	if (b1.length !== b2.length) return false;
	for (let i = 0; i < b1.length; i++) if (b1[i] !== b2[i]) return false;
	return true;
}
/**
* @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
*/
function utf8ToBytes$1(str) {
	if (typeof str !== "string") throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
	return new Uint8Array(new TextEncoder().encode(str));
}
/**
* Calculates amount of bits in a bigint.
* Same as `n.toString(2).length`
*/
function bitLen$1(n) {
	let len = 0;
	for (; n > _0n$9; n >>= _1n$10, len += 1);
	return len;
}
/**
* Gets single bit at position.
* NOTE: first bit position is 0 (same as arrays)
* Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
*/
function bitGet(n, pos) {
	return n >> BigInt(pos) & _1n$10;
}
/**
* Sets single bit at position.
*/
var bitSet = (n, pos, value) => {
	return n | (value ? _1n$10 : _0n$9) << BigInt(pos);
};
/**
* Calculate mask for N bits. Not using ** operator with bigints because of old engines.
* Same as BigInt(`0b${Array(i).fill('1').join('')}`)
*/
var bitMask$1 = (n) => (_2n$7 << BigInt(n - 1)) - _1n$10;
var u8n = (data) => new Uint8Array(data);
var u8fr = (arr) => Uint8Array.from(arr);
/**
* Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
* @returns function that will call DRBG until 2nd arg returns something meaningful
* @example
*   const drbg = createHmacDRBG<Key>(32, 32, hmac);
*   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
*/
function createHmacDrbg$1(hashLen, qByteLen, hmacFn) {
	if (typeof hashLen !== "number" || hashLen < 2) throw new Error("hashLen must be a number");
	if (typeof qByteLen !== "number" || qByteLen < 2) throw new Error("qByteLen must be a number");
	if (typeof hmacFn !== "function") throw new Error("hmacFn must be a function");
	let v = u8n(hashLen);
	let k = u8n(hashLen);
	let i = 0;
	const reset = () => {
		v.fill(1);
		k.fill(0);
		i = 0;
	};
	const h = (...b) => hmacFn(k, v, ...b);
	const reseed = (seed = u8n()) => {
		k = h(u8fr([0]), seed);
		v = h();
		if (seed.length === 0) return;
		k = h(u8fr([1]), seed);
		v = h();
	};
	const gen = () => {
		if (i++ >= 1e3) throw new Error("drbg: tried 1000 values");
		let len = 0;
		const out = [];
		while (len < qByteLen) {
			v = h();
			const sl = v.slice();
			out.push(sl);
			len += v.length;
		}
		return concatBytes$1(...out);
	};
	const genUntil = (seed, pred) => {
		reset();
		reseed(seed);
		let res = void 0;
		while (!(res = pred(gen()))) reseed();
		reset();
		return res;
	};
	return genUntil;
}
var validatorFns = {
	bigint: (val) => typeof val === "bigint",
	function: (val) => typeof val === "function",
	boolean: (val) => typeof val === "boolean",
	string: (val) => typeof val === "string",
	stringOrUint8Array: (val) => typeof val === "string" || val instanceof Uint8Array,
	isSafeInteger: (val) => Number.isSafeInteger(val),
	array: (val) => Array.isArray(val),
	field: (val, object) => object.Fp.isValid(val),
	hash: (val) => typeof val === "function" && Number.isSafeInteger(val.outputLen)
};
function validateObject(object, validators, optValidators = {}) {
	const checkField = (fieldName, type, isOptional) => {
		const checkVal = validatorFns[type];
		if (typeof checkVal !== "function") throw new Error(`Invalid validator "${type}", expected function`);
		const val = object[fieldName];
		if (isOptional && val === void 0) return;
		if (!checkVal(val, object)) throw new Error(`Invalid param ${String(fieldName)}=${val} (${typeof val}), expected ${type}`);
	};
	for (const [fieldName, type] of Object.entries(validators)) checkField(fieldName, type, false);
	for (const [fieldName, type] of Object.entries(optValidators)) checkField(fieldName, type, true);
	return object;
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/curves/esm/abstract/modular.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$8 = BigInt(0);
var _1n$9 = BigInt(1);
var _2n$6 = BigInt(2);
var _3n$3 = BigInt(3);
var _4n$2 = BigInt(4);
var _5n$2 = BigInt(5);
var _8n$3 = BigInt(8);
var _9n$1 = BigInt(9);
var _16n$1 = BigInt(16);
function mod$1(a, b) {
	const result = a % b;
	return result >= _0n$8 ? result : b + result;
}
/**
* Efficiently raise num to power and do modular division.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
* @example
* pow(2n, 6n, 11n) // 64n % 11n == 9n
*/
function pow(num, power, modulo) {
	if (modulo <= _0n$8 || power < _0n$8) throw new Error("Expected power/modulo > 0");
	if (modulo === _1n$9) return _0n$8;
	let res = _1n$9;
	while (power > _0n$8) {
		if (power & _1n$9) res = res * num % modulo;
		num = num * num % modulo;
		power >>= _1n$9;
	}
	return res;
}
function pow2$1(x, power, modulo) {
	let res = x;
	while (power-- > _0n$8) {
		res *= res;
		res %= modulo;
	}
	return res;
}
function invert$1(number, modulo) {
	if (number === _0n$8 || modulo <= _0n$8) throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
	let a = mod$1(number, modulo);
	let b = modulo;
	let x = _0n$8, y = _1n$9, u = _1n$9, v = _0n$8;
	while (a !== _0n$8) {
		const q = b / a;
		const r = b % a;
		const m = x - u * q;
		const n = y - v * q;
		b = a, a = r, x = u, y = v, u = m, v = n;
	}
	if (b !== _1n$9) throw new Error("invert: does not exist");
	return mod$1(x, modulo);
}
/**
* Tonelli-Shanks square root search algorithm.
* 1. https://eprint.iacr.org/2012/685.pdf (page 12)
* 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
* Will start an infinite loop if field order P is not prime.
* @param P field order
* @returns function that takes field Fp (created from P) and number n
*/
function tonelliShanks$1(P) {
	const legendreC = (P - _1n$9) / _2n$6;
	let Q, S, Z;
	for (Q = P - _1n$9, S = 0; Q % _2n$6 === _0n$8; Q /= _2n$6, S++);
	for (Z = _2n$6; Z < P && pow(Z, legendreC, P) !== P - _1n$9; Z++);
	if (S === 1) {
		const p1div4 = (P + _1n$9) / _4n$2;
		return function tonelliFast(Fp, n) {
			const root = Fp.pow(n, p1div4);
			if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
			return root;
		};
	}
	const Q1div2 = (Q + _1n$9) / _2n$6;
	return function tonelliSlow(Fp, n) {
		if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE)) throw new Error("Cannot find square root");
		let r = S;
		let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q);
		let x = Fp.pow(n, Q1div2);
		let b = Fp.pow(n, Q);
		while (!Fp.eql(b, Fp.ONE)) {
			if (Fp.eql(b, Fp.ZERO)) return Fp.ZERO;
			let m = 1;
			for (let t2 = Fp.sqr(b); m < r; m++) {
				if (Fp.eql(t2, Fp.ONE)) break;
				t2 = Fp.sqr(t2);
			}
			const ge = Fp.pow(g, _1n$9 << BigInt(r - m - 1));
			g = Fp.sqr(ge);
			x = Fp.mul(x, ge);
			b = Fp.mul(b, g);
			r = m;
		}
		return x;
	};
}
function FpSqrt$1(P) {
	if (P % _4n$2 === _3n$3) {
		const p1div4 = (P + _1n$9) / _4n$2;
		return function sqrt3mod4(Fp, n) {
			const root = Fp.pow(n, p1div4);
			if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
			return root;
		};
	}
	if (P % _8n$3 === _5n$2) {
		const c1 = (P - _5n$2) / _8n$3;
		return function sqrt5mod8(Fp, n) {
			const n2 = Fp.mul(n, _2n$6);
			const v = Fp.pow(n2, c1);
			const nv = Fp.mul(n, v);
			const i = Fp.mul(Fp.mul(nv, _2n$6), v);
			const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
			if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
			return root;
		};
	}
	if (P % _16n$1 === _9n$1) {}
	return tonelliShanks$1(P);
}
var FIELD_FIELDS$1 = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
function validateField$1(field) {
	return validateObject(field, FIELD_FIELDS$1.reduce((map, val) => {
		map[val] = "function";
		return map;
	}, {
		ORDER: "bigint",
		MASK: "bigint",
		BYTES: "isSafeInteger",
		BITS: "isSafeInteger"
	}));
}
/**
* Same as `pow` but for Fp: non-constant-time.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
*/
function FpPow$1(f, num, power) {
	if (power < _0n$8) throw new Error("Expected power > 0");
	if (power === _0n$8) return f.ONE;
	if (power === _1n$9) return num;
	let p = f.ONE;
	let d = num;
	while (power > _0n$8) {
		if (power & _1n$9) p = f.mul(p, d);
		d = f.sqr(d);
		power >>= _1n$9;
	}
	return p;
}
/**
* Efficiently invert an array of Field elements.
* `inv(0)` will return `undefined` here: make sure to throw an error.
*/
function FpInvertBatch$1(f, nums) {
	const tmp = new Array(nums.length);
	const lastMultiplied = nums.reduce((acc, num, i) => {
		if (f.is0(num)) return acc;
		tmp[i] = acc;
		return f.mul(acc, num);
	}, f.ONE);
	const inverted = f.inv(lastMultiplied);
	nums.reduceRight((acc, num, i) => {
		if (f.is0(num)) return acc;
		tmp[i] = f.mul(acc, tmp[i]);
		return f.mul(acc, num);
	}, inverted);
	return tmp;
}
function nLength$1(n, nBitLength) {
	const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
	return {
		nBitLength: _nBitLength,
		nByteLength: Math.ceil(_nBitLength / 8)
	};
}
/**
* Initializes a finite field over prime. **Non-primes are not supported.**
* Do not init in loop: slow. Very fragile: always run a benchmark on a change.
* Major performance optimizations:
* * a) denormalized operations like mulN instead of mul
* * b) same object shape: never add or remove keys
* * c) Object.freeze
* @param ORDER prime positive bigint
* @param bitLen how many bits the field consumes
* @param isLE (def: false) if encoding / decoding should be in little-endian
* @param redef optional faster redefinitions of sqrt and other methods
*/
function Field$1(ORDER, bitLen, isLE = false, redef = {}) {
	if (ORDER <= _0n$8) throw new Error(`Expected Field ORDER > 0, got ${ORDER}`);
	const { nBitLength: BITS, nByteLength: BYTES } = nLength$1(ORDER, bitLen);
	if (BYTES > 2048) throw new Error("Field lengths over 2048 bytes are not supported");
	const sqrtP = FpSqrt$1(ORDER);
	const f = Object.freeze({
		ORDER,
		BITS,
		BYTES,
		MASK: bitMask$1(BITS),
		ZERO: _0n$8,
		ONE: _1n$9,
		create: (num) => mod$1(num, ORDER),
		isValid: (num) => {
			if (typeof num !== "bigint") throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
			return _0n$8 <= num && num < ORDER;
		},
		is0: (num) => num === _0n$8,
		isOdd: (num) => (num & _1n$9) === _1n$9,
		neg: (num) => mod$1(-num, ORDER),
		eql: (lhs, rhs) => lhs === rhs,
		sqr: (num) => mod$1(num * num, ORDER),
		add: (lhs, rhs) => mod$1(lhs + rhs, ORDER),
		sub: (lhs, rhs) => mod$1(lhs - rhs, ORDER),
		mul: (lhs, rhs) => mod$1(lhs * rhs, ORDER),
		pow: (num, power) => FpPow$1(f, num, power),
		div: (lhs, rhs) => mod$1(lhs * invert$1(rhs, ORDER), ORDER),
		sqrN: (num) => num * num,
		addN: (lhs, rhs) => lhs + rhs,
		subN: (lhs, rhs) => lhs - rhs,
		mulN: (lhs, rhs) => lhs * rhs,
		inv: (num) => invert$1(num, ORDER),
		sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
		invertBatch: (lst) => FpInvertBatch$1(f, lst),
		cmov: (a, b, c) => c ? b : a,
		toBytes: (num) => isLE ? numberToBytesLE$1(num, BYTES) : numberToBytesBE$1(num, BYTES),
		fromBytes: (bytes) => {
			if (bytes.length !== BYTES) throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes.length}`);
			return isLE ? bytesToNumberLE$1(bytes) : bytesToNumberBE$1(bytes);
		}
	});
	return Object.freeze(f);
}
/**
* Returns total number of bytes consumed by the field element.
* For example, 32 bytes for usual 256-bit weierstrass curve.
* @param fieldOrder number of field elements, usually CURVE.n
* @returns byte length of field
*/
function getFieldBytesLength$1(fieldOrder) {
	if (typeof fieldOrder !== "bigint") throw new Error("field order must be bigint");
	const bitLength = fieldOrder.toString(2).length;
	return Math.ceil(bitLength / 8);
}
/**
* Returns minimal amount of bytes that can be safely reduced
* by field order.
* Should be 2^-128 for 128-bit curve such as P256.
* @param fieldOrder number of field elements, usually CURVE.n
* @returns byte length of target hash
*/
function getMinHashLength$1(fieldOrder) {
	const length = getFieldBytesLength$1(fieldOrder);
	return length + Math.ceil(length / 2);
}
/**
* "Constant-time" private key generation utility.
* Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
* and convert them into private scalar, with the modulo bias being negligible.
* Needs at least 48 bytes of input for 32-byte private key.
* https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
* FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
* RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
* @param hash hash output from SHA3 or a similar function
* @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
* @param isLE interpret hash bytes as LE num
* @returns valid private scalar
*/
function mapHashToField$1(key, fieldOrder, isLE = false) {
	const len = key.length;
	const fieldLen = getFieldBytesLength$1(fieldOrder);
	const minLen = getMinHashLength$1(fieldOrder);
	if (len < 16 || len < minLen || len > 1024) throw new Error(`expected ${minLen}-1024 bytes of input, got ${len}`);
	const reduced = mod$1(isLE ? bytesToNumberBE$1(key) : bytesToNumberLE$1(key), fieldOrder - _1n$9) + _1n$9;
	return isLE ? numberToBytesLE$1(reduced, fieldLen) : numberToBytesBE$1(reduced, fieldLen);
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/curves/esm/abstract/curve.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$7 = BigInt(0);
var _1n$8 = BigInt(1);
function wNAF$1(c, bits) {
	const constTimeNegate = (condition, item) => {
		const neg = item.negate();
		return condition ? neg : item;
	};
	const opts = (W) => {
		return {
			windows: Math.ceil(bits / W) + 1,
			windowSize: 2 ** (W - 1)
		};
	};
	return {
		constTimeNegate,
		unsafeLadder(elm, n) {
			let p = c.ZERO;
			let d = elm;
			while (n > _0n$7) {
				if (n & _1n$8) p = p.add(d);
				d = d.double();
				n >>= _1n$8;
			}
			return p;
		},
		/**
		* Creates a wNAF precomputation window. Used for caching.
		* Default window size is set by `utils.precompute()` and is equal to 8.
		* Number of precomputed points depends on the curve size:
		* 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
		* - 𝑊 is the window size
		* - 𝑛 is the bitlength of the curve order.
		* For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
		* @returns precomputed point tables flattened to a single array
		*/
		precomputeWindow(elm, W) {
			const { windows, windowSize } = opts(W);
			const points = [];
			let p = elm;
			let base = p;
			for (let window = 0; window < windows; window++) {
				base = p;
				points.push(base);
				for (let i = 1; i < windowSize; i++) {
					base = base.add(p);
					points.push(base);
				}
				p = base.double();
			}
			return points;
		},
		/**
		* Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
		* @param W window size
		* @param precomputes precomputed tables
		* @param n scalar (we don't check here, but should be less than curve order)
		* @returns real and fake (for const-time) points
		*/
		wNAF(W, precomputes, n) {
			const { windows, windowSize } = opts(W);
			let p = c.ZERO;
			let f = c.BASE;
			const mask = BigInt(2 ** W - 1);
			const maxNumber = 2 ** W;
			const shiftBy = BigInt(W);
			for (let window = 0; window < windows; window++) {
				const offset = window * windowSize;
				let wbits = Number(n & mask);
				n >>= shiftBy;
				if (wbits > windowSize) {
					wbits -= maxNumber;
					n += _1n$8;
				}
				const offset1 = offset;
				const offset2 = offset + Math.abs(wbits) - 1;
				const cond1 = window % 2 !== 0;
				const cond2 = wbits < 0;
				if (wbits === 0) f = f.add(constTimeNegate(cond1, precomputes[offset1]));
				else p = p.add(constTimeNegate(cond2, precomputes[offset2]));
			}
			return {
				p,
				f
			};
		},
		wNAFCached(P, precomputesMap, n, transform) {
			const W = P._WINDOW_SIZE || 1;
			let comp = precomputesMap.get(P);
			if (!comp) {
				comp = this.precomputeWindow(P, W);
				if (W !== 1) precomputesMap.set(P, transform(comp));
			}
			return this.wNAF(W, comp, n);
		}
	};
}
function validateBasic(curve) {
	validateField$1(curve.Fp);
	validateObject(curve, {
		n: "bigint",
		h: "bigint",
		Gx: "field",
		Gy: "field"
	}, {
		nBitLength: "isSafeInteger",
		nByteLength: "isSafeInteger"
	});
	return Object.freeze({
		...nLength$1(curve.n, curve.nBitLength),
		...curve,
		p: curve.Fp.ORDER
	});
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/curves/esm/abstract/weierstrass.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function validatePointOpts(curve) {
	const opts = validateBasic(curve);
	validateObject(opts, {
		a: "field",
		b: "field"
	}, {
		allowedPrivateKeyLengths: "array",
		wrapPrivateKey: "boolean",
		isTorsionFree: "function",
		clearCofactor: "function",
		allowInfinityPoint: "boolean",
		fromBytes: "function",
		toBytes: "function"
	});
	const { endo, Fp, a } = opts;
	if (endo) {
		if (!Fp.eql(a, Fp.ZERO)) throw new Error("Endomorphism can only be defined for Koblitz curves that have a=0");
		if (typeof endo !== "object" || typeof endo.beta !== "bigint" || typeof endo.splitScalar !== "function") throw new Error("Expected endomorphism with beta: bigint and splitScalar: function");
	}
	return Object.freeze({ ...opts });
}
var { bytesToNumberBE: b2n, hexToBytes: h2b } = utils_exports;
var DER$1 = {
	Err: class DERErr extends Error {
		constructor(m = "") {
			super(m);
		}
	},
	_parseInt(data) {
		const { Err: E } = DER$1;
		if (data.length < 2 || data[0] !== 2) throw new E("Invalid signature integer tag");
		const len = data[1];
		const res = data.subarray(2, len + 2);
		if (!len || res.length !== len) throw new E("Invalid signature integer: wrong length");
		if (res[0] & 128) throw new E("Invalid signature integer: negative");
		if (res[0] === 0 && !(res[1] & 128)) throw new E("Invalid signature integer: unnecessary leading zero");
		return {
			d: b2n(res),
			l: data.subarray(len + 2)
		};
	},
	toSig(hex) {
		const { Err: E } = DER$1;
		const data = typeof hex === "string" ? h2b(hex) : hex;
		if (!(data instanceof Uint8Array)) throw new Error("ui8a expected");
		let l = data.length;
		if (l < 2 || data[0] != 48) throw new E("Invalid signature tag");
		if (data[1] !== l - 2) throw new E("Invalid signature: incorrect length");
		const { d: r, l: sBytes } = DER$1._parseInt(data.subarray(2));
		const { d: s, l: rBytesLeft } = DER$1._parseInt(sBytes);
		if (rBytesLeft.length) throw new E("Invalid signature: left bytes after parsing");
		return {
			r,
			s
		};
	},
	hexFromSig(sig) {
		const slice = (s) => Number.parseInt(s[0], 16) & 8 ? "00" + s : s;
		const h = (num) => {
			const hex = num.toString(16);
			return hex.length & 1 ? `0${hex}` : hex;
		};
		const s = slice(h(sig.s));
		const r = slice(h(sig.r));
		const shl = s.length / 2;
		const rhl = r.length / 2;
		const sl = h(shl);
		const rl = h(rhl);
		return `30${h(rhl + shl + 4)}02${rl}${r}02${sl}${s}`;
	}
};
var _0n$6 = BigInt(0);
var _1n$7 = BigInt(1);
var _3n$2 = BigInt(3);
function weierstrassPoints(opts) {
	const CURVE = validatePointOpts(opts);
	const { Fp } = CURVE;
	const toBytes = CURVE.toBytes || ((_c, point, _isCompressed) => {
		const a = point.toAffine();
		return concatBytes$1(Uint8Array.from([4]), Fp.toBytes(a.x), Fp.toBytes(a.y));
	});
	const fromBytes = CURVE.fromBytes || ((bytes) => {
		const tail = bytes.subarray(1);
		return {
			x: Fp.fromBytes(tail.subarray(0, Fp.BYTES)),
			y: Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES))
		};
	});
	/**
	* y² = x³ + ax + b: Short weierstrass curve formula
	* @returns y²
	*/
	function weierstrassEquation(x) {
		const { a, b } = CURVE;
		const x2 = Fp.sqr(x);
		const x3 = Fp.mul(x2, x);
		return Fp.add(Fp.add(x3, Fp.mul(x, a)), b);
	}
	if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx))) throw new Error("bad generator point: equation left != right");
	function isWithinCurveOrder(num) {
		return typeof num === "bigint" && _0n$6 < num && num < CURVE.n;
	}
	function assertGE(num) {
		if (!isWithinCurveOrder(num)) throw new Error("Expected valid bigint: 0 < bigint < curve.n");
	}
	function normPrivateKeyToScalar(key) {
		const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n } = CURVE;
		if (lengths && typeof key !== "bigint") {
			if (key instanceof Uint8Array) key = bytesToHex$1(key);
			if (typeof key !== "string" || !lengths.includes(key.length)) throw new Error("Invalid key");
			key = key.padStart(nByteLength * 2, "0");
		}
		let num;
		try {
			num = typeof key === "bigint" ? key : bytesToNumberBE$1(ensureBytes$1("private key", key, nByteLength));
		} catch (error) {
			throw new Error(`private key must be ${nByteLength} bytes, hex or bigint, not ${typeof key}`);
		}
		if (wrapPrivateKey) num = mod$1(num, n);
		assertGE(num);
		return num;
	}
	const pointPrecomputes = /* @__PURE__ */ new Map();
	function assertPrjPoint(other) {
		if (!(other instanceof Point)) throw new Error("ProjectivePoint expected");
	}
	/**
	* Projective Point works in 3d / projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
	* Default Point works in 2d / affine coordinates: (x, y)
	* We're doing calculations in projective, because its operations don't require costly inversion.
	*/
	class Point {
		constructor(px, py, pz) {
			this.px = px;
			this.py = py;
			this.pz = pz;
			if (px == null || !Fp.isValid(px)) throw new Error("x required");
			if (py == null || !Fp.isValid(py)) throw new Error("y required");
			if (pz == null || !Fp.isValid(pz)) throw new Error("z required");
		}
		static fromAffine(p) {
			const { x, y } = p || {};
			if (!p || !Fp.isValid(x) || !Fp.isValid(y)) throw new Error("invalid affine point");
			if (p instanceof Point) throw new Error("projective point not allowed");
			const is0 = (i) => Fp.eql(i, Fp.ZERO);
			if (is0(x) && is0(y)) return Point.ZERO;
			return new Point(x, y, Fp.ONE);
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		/**
		* Takes a bunch of Projective Points but executes only one
		* inversion on all of them. Inversion is very slow operation,
		* so this improves performance massively.
		* Optimization: converts a list of projective points to a list of identical points with Z=1.
		*/
		static normalizeZ(points) {
			const toInv = Fp.invertBatch(points.map((p) => p.pz));
			return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
		}
		/**
		* Converts hash string or Uint8Array to Point.
		* @param hex short/long ECDSA hex
		*/
		static fromHex(hex) {
			const P = Point.fromAffine(fromBytes(ensureBytes$1("pointHex", hex)));
			P.assertValidity();
			return P;
		}
		static fromPrivateKey(privateKey) {
			return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
		}
		_setWindowSize(windowSize) {
			this._WINDOW_SIZE = windowSize;
			pointPrecomputes.delete(this);
		}
		assertValidity() {
			if (this.is0()) {
				if (CURVE.allowInfinityPoint && !Fp.is0(this.py)) return;
				throw new Error("bad point: ZERO");
			}
			const { x, y } = this.toAffine();
			if (!Fp.isValid(x) || !Fp.isValid(y)) throw new Error("bad point: x or y not FE");
			const left = Fp.sqr(y);
			const right = weierstrassEquation(x);
			if (!Fp.eql(left, right)) throw new Error("bad point: equation left != right");
			if (!this.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
		}
		hasEvenY() {
			const { y } = this.toAffine();
			if (Fp.isOdd) return !Fp.isOdd(y);
			throw new Error("Field doesn't support isOdd");
		}
		/**
		* Compare one point to another.
		*/
		equals(other) {
			assertPrjPoint(other);
			const { px: X1, py: Y1, pz: Z1 } = this;
			const { px: X2, py: Y2, pz: Z2 } = other;
			const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
			const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
			return U1 && U2;
		}
		/**
		* Flips point to one corresponding to (x, -y) in Affine coordinates.
		*/
		negate() {
			return new Point(this.px, Fp.neg(this.py), this.pz);
		}
		double() {
			const { a, b } = CURVE;
			const b3 = Fp.mul(b, _3n$2);
			const { px: X1, py: Y1, pz: Z1 } = this;
			let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
			let t0 = Fp.mul(X1, X1);
			let t1 = Fp.mul(Y1, Y1);
			let t2 = Fp.mul(Z1, Z1);
			let t3 = Fp.mul(X1, Y1);
			t3 = Fp.add(t3, t3);
			Z3 = Fp.mul(X1, Z1);
			Z3 = Fp.add(Z3, Z3);
			X3 = Fp.mul(a, Z3);
			Y3 = Fp.mul(b3, t2);
			Y3 = Fp.add(X3, Y3);
			X3 = Fp.sub(t1, Y3);
			Y3 = Fp.add(t1, Y3);
			Y3 = Fp.mul(X3, Y3);
			X3 = Fp.mul(t3, X3);
			Z3 = Fp.mul(b3, Z3);
			t2 = Fp.mul(a, t2);
			t3 = Fp.sub(t0, t2);
			t3 = Fp.mul(a, t3);
			t3 = Fp.add(t3, Z3);
			Z3 = Fp.add(t0, t0);
			t0 = Fp.add(Z3, t0);
			t0 = Fp.add(t0, t2);
			t0 = Fp.mul(t0, t3);
			Y3 = Fp.add(Y3, t0);
			t2 = Fp.mul(Y1, Z1);
			t2 = Fp.add(t2, t2);
			t0 = Fp.mul(t2, t3);
			X3 = Fp.sub(X3, t0);
			Z3 = Fp.mul(t2, t1);
			Z3 = Fp.add(Z3, Z3);
			Z3 = Fp.add(Z3, Z3);
			return new Point(X3, Y3, Z3);
		}
		add(other) {
			assertPrjPoint(other);
			const { px: X1, py: Y1, pz: Z1 } = this;
			const { px: X2, py: Y2, pz: Z2 } = other;
			let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
			const a = CURVE.a;
			const b3 = Fp.mul(CURVE.b, _3n$2);
			let t0 = Fp.mul(X1, X2);
			let t1 = Fp.mul(Y1, Y2);
			let t2 = Fp.mul(Z1, Z2);
			let t3 = Fp.add(X1, Y1);
			let t4 = Fp.add(X2, Y2);
			t3 = Fp.mul(t3, t4);
			t4 = Fp.add(t0, t1);
			t3 = Fp.sub(t3, t4);
			t4 = Fp.add(X1, Z1);
			let t5 = Fp.add(X2, Z2);
			t4 = Fp.mul(t4, t5);
			t5 = Fp.add(t0, t2);
			t4 = Fp.sub(t4, t5);
			t5 = Fp.add(Y1, Z1);
			X3 = Fp.add(Y2, Z2);
			t5 = Fp.mul(t5, X3);
			X3 = Fp.add(t1, t2);
			t5 = Fp.sub(t5, X3);
			Z3 = Fp.mul(a, t4);
			X3 = Fp.mul(b3, t2);
			Z3 = Fp.add(X3, Z3);
			X3 = Fp.sub(t1, Z3);
			Z3 = Fp.add(t1, Z3);
			Y3 = Fp.mul(X3, Z3);
			t1 = Fp.add(t0, t0);
			t1 = Fp.add(t1, t0);
			t2 = Fp.mul(a, t2);
			t4 = Fp.mul(b3, t4);
			t1 = Fp.add(t1, t2);
			t2 = Fp.sub(t0, t2);
			t2 = Fp.mul(a, t2);
			t4 = Fp.add(t4, t2);
			t0 = Fp.mul(t1, t4);
			Y3 = Fp.add(Y3, t0);
			t0 = Fp.mul(t5, t4);
			X3 = Fp.mul(t3, X3);
			X3 = Fp.sub(X3, t0);
			t0 = Fp.mul(t3, t1);
			Z3 = Fp.mul(t5, Z3);
			Z3 = Fp.add(Z3, t0);
			return new Point(X3, Y3, Z3);
		}
		subtract(other) {
			return this.add(other.negate());
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		wNAF(n) {
			return wnaf.wNAFCached(this, pointPrecomputes, n, (comp) => {
				const toInv = Fp.invertBatch(comp.map((p) => p.pz));
				return comp.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
			});
		}
		/**
		* Non-constant-time multiplication. Uses double-and-add algorithm.
		* It's faster, but should only be used when you don't care about
		* an exposed private key e.g. sig verification, which works over *public* keys.
		*/
		multiplyUnsafe(n) {
			const I = Point.ZERO;
			if (n === _0n$6) return I;
			assertGE(n);
			if (n === _1n$7) return this;
			const { endo } = CURVE;
			if (!endo) return wnaf.unsafeLadder(this, n);
			let { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
			let k1p = I;
			let k2p = I;
			let d = this;
			while (k1 > _0n$6 || k2 > _0n$6) {
				if (k1 & _1n$7) k1p = k1p.add(d);
				if (k2 & _1n$7) k2p = k2p.add(d);
				d = d.double();
				k1 >>= _1n$7;
				k2 >>= _1n$7;
			}
			if (k1neg) k1p = k1p.negate();
			if (k2neg) k2p = k2p.negate();
			k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
			return k1p.add(k2p);
		}
		/**
		* Constant time multiplication.
		* Uses wNAF method. Windowed method may be 10% faster,
		* but takes 2x longer to generate and consumes 2x memory.
		* Uses precomputes when available.
		* Uses endomorphism for Koblitz curves.
		* @param scalar by which the point would be multiplied
		* @returns New point
		*/
		multiply(scalar) {
			assertGE(scalar);
			let n = scalar;
			let point, fake;
			const { endo } = CURVE;
			if (endo) {
				const { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
				let { p: k1p, f: f1p } = this.wNAF(k1);
				let { p: k2p, f: f2p } = this.wNAF(k2);
				k1p = wnaf.constTimeNegate(k1neg, k1p);
				k2p = wnaf.constTimeNegate(k2neg, k2p);
				k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
				point = k1p.add(k2p);
				fake = f1p.add(f2p);
			} else {
				const { p, f } = this.wNAF(n);
				point = p;
				fake = f;
			}
			return Point.normalizeZ([point, fake])[0];
		}
		/**
		* Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
		* Not using Strauss-Shamir trick: precomputation tables are faster.
		* The trick could be useful if both P and Q are not G (not in our case).
		* @returns non-zero affine point
		*/
		multiplyAndAddUnsafe(Q, a, b) {
			const G = Point.BASE;
			const mul = (P, a) => a === _0n$6 || a === _1n$7 || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a);
			const sum = mul(this, a).add(mul(Q, b));
			return sum.is0() ? void 0 : sum;
		}
		toAffine(iz) {
			const { px: x, py: y, pz: z } = this;
			const is0 = this.is0();
			if (iz == null) iz = is0 ? Fp.ONE : Fp.inv(z);
			const ax = Fp.mul(x, iz);
			const ay = Fp.mul(y, iz);
			const zz = Fp.mul(z, iz);
			if (is0) return {
				x: Fp.ZERO,
				y: Fp.ZERO
			};
			if (!Fp.eql(zz, Fp.ONE)) throw new Error("invZ was invalid");
			return {
				x: ax,
				y: ay
			};
		}
		isTorsionFree() {
			const { h: cofactor, isTorsionFree } = CURVE;
			if (cofactor === _1n$7) return true;
			if (isTorsionFree) return isTorsionFree(Point, this);
			throw new Error("isTorsionFree() has not been declared for the elliptic curve");
		}
		clearCofactor() {
			const { h: cofactor, clearCofactor } = CURVE;
			if (cofactor === _1n$7) return this;
			if (clearCofactor) return clearCofactor(Point, this);
			return this.multiplyUnsafe(CURVE.h);
		}
		toRawBytes(isCompressed = true) {
			this.assertValidity();
			return toBytes(Point, this, isCompressed);
		}
		toHex(isCompressed = true) {
			return bytesToHex$1(this.toRawBytes(isCompressed));
		}
	}
	Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
	Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
	const _bits = CURVE.nBitLength;
	const wnaf = wNAF$1(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
	return {
		CURVE,
		ProjectivePoint: Point,
		normPrivateKeyToScalar,
		weierstrassEquation,
		isWithinCurveOrder
	};
}
function validateOpts(curve) {
	const opts = validateBasic(curve);
	validateObject(opts, {
		hash: "hash",
		hmac: "function",
		randomBytes: "function"
	}, {
		bits2int: "function",
		bits2int_modN: "function",
		lowS: "boolean"
	});
	return Object.freeze({
		lowS: true,
		...opts
	});
}
function weierstrass$1(curveDef) {
	const CURVE = validateOpts(curveDef);
	const { Fp, n: CURVE_ORDER } = CURVE;
	const compressedLen = Fp.BYTES + 1;
	const uncompressedLen = 2 * Fp.BYTES + 1;
	function isValidFieldElement(num) {
		return _0n$6 < num && num < Fp.ORDER;
	}
	function modN(a) {
		return mod$1(a, CURVE_ORDER);
	}
	function invN(a) {
		return invert$1(a, CURVE_ORDER);
	}
	const { ProjectivePoint: Point, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder } = weierstrassPoints({
		...CURVE,
		toBytes(_c, point, isCompressed) {
			const a = point.toAffine();
			const x = Fp.toBytes(a.x);
			const cat = concatBytes$1;
			if (isCompressed) return cat(Uint8Array.from([point.hasEvenY() ? 2 : 3]), x);
			else return cat(Uint8Array.from([4]), x, Fp.toBytes(a.y));
		},
		fromBytes(bytes) {
			const len = bytes.length;
			const head = bytes[0];
			const tail = bytes.subarray(1);
			if (len === compressedLen && (head === 2 || head === 3)) {
				const x = bytesToNumberBE$1(tail);
				if (!isValidFieldElement(x)) throw new Error("Point is not on curve");
				const y2 = weierstrassEquation(x);
				let y = Fp.sqrt(y2);
				const isYOdd = (y & _1n$7) === _1n$7;
				if ((head & 1) === 1 !== isYOdd) y = Fp.neg(y);
				return {
					x,
					y
				};
			} else if (len === uncompressedLen && head === 4) return {
				x: Fp.fromBytes(tail.subarray(0, Fp.BYTES)),
				y: Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES))
			};
			else throw new Error(`Point of length ${len} was invalid. Expected ${compressedLen} compressed bytes or ${uncompressedLen} uncompressed bytes`);
		}
	});
	const numToNByteStr = (num) => bytesToHex$1(numberToBytesBE$1(num, CURVE.nByteLength));
	function isBiggerThanHalfOrder(number) {
		return number > CURVE_ORDER >> _1n$7;
	}
	function normalizeS(s) {
		return isBiggerThanHalfOrder(s) ? modN(-s) : s;
	}
	const slcNum = (b, from, to) => bytesToNumberBE$1(b.slice(from, to));
	/**
	* ECDSA signature with its (r, s) properties. Supports DER & compact representations.
	*/
	class Signature {
		constructor(r, s, recovery) {
			this.r = r;
			this.s = s;
			this.recovery = recovery;
			this.assertValidity();
		}
		static fromCompact(hex) {
			const l = CURVE.nByteLength;
			hex = ensureBytes$1("compactSignature", hex, l * 2);
			return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
		}
		static fromDER(hex) {
			const { r, s } = DER$1.toSig(ensureBytes$1("DER", hex));
			return new Signature(r, s);
		}
		assertValidity() {
			if (!isWithinCurveOrder(this.r)) throw new Error("r must be 0 < r < CURVE.n");
			if (!isWithinCurveOrder(this.s)) throw new Error("s must be 0 < s < CURVE.n");
		}
		addRecoveryBit(recovery) {
			return new Signature(this.r, this.s, recovery);
		}
		recoverPublicKey(msgHash) {
			const { r, s, recovery: rec } = this;
			const h = bits2int_modN(ensureBytes$1("msgHash", msgHash));
			if (rec == null || ![
				0,
				1,
				2,
				3
			].includes(rec)) throw new Error("recovery id invalid");
			const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
			if (radj >= Fp.ORDER) throw new Error("recovery id 2 or 3 invalid");
			const prefix = (rec & 1) === 0 ? "02" : "03";
			const R = Point.fromHex(prefix + numToNByteStr(radj));
			const ir = invN(radj);
			const u1 = modN(-h * ir);
			const u2 = modN(s * ir);
			const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2);
			if (!Q) throw new Error("point at infinify");
			Q.assertValidity();
			return Q;
		}
		hasHighS() {
			return isBiggerThanHalfOrder(this.s);
		}
		normalizeS() {
			return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
		}
		toDERRawBytes() {
			return hexToBytes$1(this.toDERHex());
		}
		toDERHex() {
			return DER$1.hexFromSig({
				r: this.r,
				s: this.s
			});
		}
		toCompactRawBytes() {
			return hexToBytes$1(this.toCompactHex());
		}
		toCompactHex() {
			return numToNByteStr(this.r) + numToNByteStr(this.s);
		}
	}
	const utils = {
		isValidPrivateKey(privateKey) {
			try {
				normPrivateKeyToScalar(privateKey);
				return true;
			} catch (error) {
				return false;
			}
		},
		normPrivateKeyToScalar,
		/**
		* Produces cryptographically secure private key from random of size
		* (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
		*/
		randomPrivateKey: () => {
			const length = getMinHashLength$1(CURVE.n);
			return mapHashToField$1(CURVE.randomBytes(length), CURVE.n);
		},
		/**
		* Creates precompute table for an arbitrary EC point. Makes point "cached".
		* Allows to massively speed-up `point.multiply(scalar)`.
		* @returns cached point
		* @example
		* const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
		* fast.multiply(privKey); // much faster ECDH now
		*/
		precompute(windowSize = 8, point = Point.BASE) {
			point._setWindowSize(windowSize);
			point.multiply(BigInt(3));
			return point;
		}
	};
	/**
	* Computes public key for a private key. Checks for validity of the private key.
	* @param privateKey private key
	* @param isCompressed whether to return compact (default), or full key
	* @returns Public key, full when isCompressed=false; short when isCompressed=true
	*/
	function getPublicKey(privateKey, isCompressed = true) {
		return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
	}
	/**
	* Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
	*/
	function isProbPub(item) {
		const arr = item instanceof Uint8Array;
		const str = typeof item === "string";
		const len = (arr || str) && item.length;
		if (arr) return len === compressedLen || len === uncompressedLen;
		if (str) return len === 2 * compressedLen || len === 2 * uncompressedLen;
		if (item instanceof Point) return true;
		return false;
	}
	/**
	* ECDH (Elliptic Curve Diffie Hellman).
	* Computes shared public key from private key and public key.
	* Checks: 1) private key validity 2) shared key is on-curve.
	* Does NOT hash the result.
	* @param privateA private key
	* @param publicB different public key
	* @param isCompressed whether to return compact (default), or full key
	* @returns shared public key
	*/
	function getSharedSecret(privateA, publicB, isCompressed = true) {
		if (isProbPub(privateA)) throw new Error("first arg must be private key");
		if (!isProbPub(publicB)) throw new Error("second arg must be public key");
		return Point.fromHex(publicB).multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
	}
	const bits2int = CURVE.bits2int || function(bytes) {
		const num = bytesToNumberBE$1(bytes);
		const delta = bytes.length * 8 - CURVE.nBitLength;
		return delta > 0 ? num >> BigInt(delta) : num;
	};
	const bits2int_modN = CURVE.bits2int_modN || function(bytes) {
		return modN(bits2int(bytes));
	};
	const ORDER_MASK = bitMask$1(CURVE.nBitLength);
	/**
	* Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
	*/
	function int2octets(num) {
		if (typeof num !== "bigint") throw new Error("bigint expected");
		if (!(_0n$6 <= num && num < ORDER_MASK)) throw new Error(`bigint expected < 2^${CURVE.nBitLength}`);
		return numberToBytesBE$1(num, CURVE.nByteLength);
	}
	function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
		if (["recovered", "canonical"].some((k) => k in opts)) throw new Error("sign() legacy options not supported");
		const { hash, randomBytes } = CURVE;
		let { lowS, prehash, extraEntropy: ent } = opts;
		if (lowS == null) lowS = true;
		msgHash = ensureBytes$1("msgHash", msgHash);
		if (prehash) msgHash = ensureBytes$1("prehashed msgHash", hash(msgHash));
		const h1int = bits2int_modN(msgHash);
		const d = normPrivateKeyToScalar(privateKey);
		const seedArgs = [int2octets(d), int2octets(h1int)];
		if (ent != null) {
			const e = ent === true ? randomBytes(Fp.BYTES) : ent;
			seedArgs.push(ensureBytes$1("extraEntropy", e));
		}
		const seed = concatBytes$1(...seedArgs);
		const m = h1int;
		function k2sig(kBytes) {
			const k = bits2int(kBytes);
			if (!isWithinCurveOrder(k)) return;
			const ik = invN(k);
			const q = Point.BASE.multiply(k).toAffine();
			const r = modN(q.x);
			if (r === _0n$6) return;
			const s = modN(ik * modN(m + r * d));
			if (s === _0n$6) return;
			let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n$7);
			let normS = s;
			if (lowS && isBiggerThanHalfOrder(s)) {
				normS = normalizeS(s);
				recovery ^= 1;
			}
			return new Signature(r, normS, recovery);
		}
		return {
			seed,
			k2sig
		};
	}
	const defaultSigOpts = {
		lowS: CURVE.lowS,
		prehash: false
	};
	const defaultVerOpts = {
		lowS: CURVE.lowS,
		prehash: false
	};
	/**
	* Signs message hash with a private key.
	* ```
	* sign(m, d, k) where
	*   (x, y) = G × k
	*   r = x mod n
	*   s = (m + dr)/k mod n
	* ```
	* @param msgHash NOT message. msg needs to be hashed to `msgHash`, or use `prehash`.
	* @param privKey private key
	* @param opts lowS for non-malleable sigs. extraEntropy for mixing randomness into k. prehash will hash first arg.
	* @returns signature with recovery param
	*/
	function sign(msgHash, privKey, opts = defaultSigOpts) {
		const { seed, k2sig } = prepSig(msgHash, privKey, opts);
		const C = CURVE;
		return createHmacDrbg$1(C.hash.outputLen, C.nByteLength, C.hmac)(seed, k2sig);
	}
	Point.BASE._setWindowSize(8);
	/**
	* Verifies a signature against message hash and public key.
	* Rejects lowS signatures by default: to override,
	* specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
	*
	* ```
	* verify(r, s, h, P) where
	*   U1 = hs^-1 mod n
	*   U2 = rs^-1 mod n
	*   R = U1⋅G - U2⋅P
	*   mod(R.x, n) == r
	* ```
	*/
	function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
		const sg = signature;
		msgHash = ensureBytes$1("msgHash", msgHash);
		publicKey = ensureBytes$1("publicKey", publicKey);
		if ("strict" in opts) throw new Error("options.strict was renamed to lowS");
		const { lowS, prehash } = opts;
		let _sig = void 0;
		let P;
		try {
			if (typeof sg === "string" || sg instanceof Uint8Array) try {
				_sig = Signature.fromDER(sg);
			} catch (derError) {
				if (!(derError instanceof DER$1.Err)) throw derError;
				_sig = Signature.fromCompact(sg);
			}
			else if (typeof sg === "object" && typeof sg.r === "bigint" && typeof sg.s === "bigint") {
				const { r, s } = sg;
				_sig = new Signature(r, s);
			} else throw new Error("PARSE");
			P = Point.fromHex(publicKey);
		} catch (error) {
			if (error.message === "PARSE") throw new Error(`signature must be Signature instance, Uint8Array or hex string`);
			return false;
		}
		if (lowS && _sig.hasHighS()) return false;
		if (prehash) msgHash = CURVE.hash(msgHash);
		const { r, s } = _sig;
		const h = bits2int_modN(msgHash);
		const is = invN(s);
		const u1 = modN(h * is);
		const u2 = modN(r * is);
		const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine();
		if (!R) return false;
		return modN(R.x) === r;
	}
	return {
		CURVE,
		getPublicKey,
		getSharedSecret,
		sign,
		verify,
		ProjectivePoint: Point,
		Signature,
		utils
	};
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/curves/esm/_shortw_utils.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function getHash(hash) {
	return {
		hash,
		hmac: (key, ...msgs) => hmac$1(hash, key, concatBytes$2(...msgs)),
		randomBytes: randomBytes$1
	};
}
function createCurve$1(curveDef, defHash) {
	const create = (hash) => weierstrass$1({
		...curveDef,
		...getHash(hash)
	});
	return Object.freeze({
		...create(defHash),
		create
	});
}
//#endregion
//#region node_modules/ethers/node_modules/@noble/curves/esm/secp256k1.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var secp256k1P = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f");
var secp256k1N = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
var _1n$6 = BigInt(1);
var _2n$5 = BigInt(2);
var divNearest$1 = (a, b) => (a + b / _2n$5) / b;
/**
* √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
* (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
*/
function sqrtMod$1(y) {
	const P = secp256k1P;
	const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
	const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
	const b2 = y * y * y % P;
	const b3 = b2 * b2 * y % P;
	const b11 = pow2$1(pow2$1(pow2$1(b3, _3n, P) * b3 % P, _3n, P) * b3 % P, _2n$5, P) * b2 % P;
	const b22 = pow2$1(b11, _11n, P) * b11 % P;
	const b44 = pow2$1(b22, _22n, P) * b22 % P;
	const b88 = pow2$1(b44, _44n, P) * b44 % P;
	const root = pow2$1(pow2$1(pow2$1(pow2$1(pow2$1(pow2$1(b88, _88n, P) * b88 % P, _44n, P) * b44 % P, _3n, P) * b3 % P, _23n, P) * b22 % P, _6n, P) * b2 % P, _2n$5, P);
	if (!Fp$1.eql(Fp$1.sqr(root), y)) throw new Error("Cannot find square root");
	return root;
}
var Fp$1 = Field$1(secp256k1P, void 0, void 0, { sqrt: sqrtMod$1 });
var secp256k1$1 = createCurve$1({
	a: BigInt(0),
	b: BigInt(7),
	Fp: Fp$1,
	n: secp256k1N,
	Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
	Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
	h: BigInt(1),
	lowS: true,
	/**
	* secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
	* Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
	* For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
	* Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
	*/
	endo: {
		beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
		splitScalar: (k) => {
			const n = secp256k1N;
			const a1 = BigInt("0x3086d221a7d46bcde86c90e49284eb15");
			const b1 = -_1n$6 * BigInt("0xe4437ed6010e88286f547fa90abfe4c3");
			const a2 = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8");
			const b2 = a1;
			const POW_2_128 = BigInt("0x100000000000000000000000000000000");
			const c1 = divNearest$1(b2 * k, n);
			const c2 = divNearest$1(-b1 * k, n);
			let k1 = mod$1(k - c1 * a1 - c2 * a2, n);
			let k2 = mod$1(-c1 * b1 - c2 * b2, n);
			const k1neg = k1 > POW_2_128;
			const k2neg = k2 > POW_2_128;
			if (k1neg) k1 = n - k1;
			if (k2neg) k2 = n - k2;
			if (k1 > POW_2_128 || k2 > POW_2_128) throw new Error("splitScalar: Endomorphism failed, k=" + k);
			return {
				k1neg,
				k1,
				k2neg,
				k2
			};
		}
	}
}, sha256$1);
secp256k1$1.ProjectivePoint;
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/hashes/esm/cryptoNode.js
/**
* Internal webcrypto alias.
* We prefer WebCrypto aka globalThis.crypto, which exists in node.js 16+.
* Falls back to Node.js built-in crypto for Node.js <=v14.
* See utils.ts for details.
* @module
*/
var crypto = nc && typeof nc === "object" && "webcrypto" in nc ? nc.webcrypto : nc && typeof nc === "object" && "randomBytes" in nc ? nc : void 0;
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/hashes/esm/utils.js
/**
* Utilities for hex, bytes, CSPRNG.
* @module
*/
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
function isBytes(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
/** Asserts something is positive integer. */
function anumber(n) {
	if (!Number.isSafeInteger(n) || n < 0) throw new Error("positive integer expected, got " + n);
}
/** Asserts something is Uint8Array. */
function abytes(b, ...lengths) {
	if (!isBytes(b)) throw new Error("Uint8Array expected");
	if (lengths.length > 0 && !lengths.includes(b.length)) throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
/** Asserts something is hash */
function ahash(h) {
	if (typeof h !== "function" || typeof h.create !== "function") throw new Error("Hash should be wrapped by utils.createHasher");
	anumber(h.outputLen);
	anumber(h.blockLen);
}
/** Asserts a hash instance has not been destroyed / finished */
function aexists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("Hash instance has been destroyed");
	if (checkFinished && instance.finished) throw new Error("Hash#digest() has already been called");
}
/** Asserts output is properly-sized byte array */
function aoutput(out, instance) {
	abytes(out);
	const min = instance.outputLen;
	if (out.length < min) throw new Error("digestInto() expects output buffer of length at least " + min);
}
/** Cast u8 / u16 / u32 to u32. */
function u32(arr) {
	return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
/** Zeroize a byte array. Warning: JS provides no guarantees. */
function clean(...arrays) {
	for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/** Create DataView of an array for easy byte-level manipulation. */
function createView(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/** The rotate right (circular right shift) operation for uint32 */
function rotr(word, shift) {
	return word << 32 - shift | word >>> shift;
}
/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
/** The byte swap operation for uint32 */
function byteSwap(word) {
	return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
/** In place byte swap for Uint32Array */
function byteSwap32(arr) {
	for (let i = 0; i < arr.length; i++) arr[i] = byteSwap(arr[i]);
	return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
var hasHexBuiltin = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function")();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
* Convert byte array to hex string. Uses built-in function, when available.
* @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
*/
function bytesToHex(bytes) {
	abytes(bytes);
	if (hasHexBuiltin) return bytes.toHex();
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += hexes[bytes[i]];
	return hex;
}
var asciis = {
	_0: 48,
	_9: 57,
	A: 65,
	F: 70,
	a: 97,
	f: 102
};
function asciiToBase16(ch) {
	if (ch >= asciis._0 && ch <= asciis._9) return ch - asciis._0;
	if (ch >= asciis.A && ch <= asciis.F) return ch - (asciis.A - 10);
	if (ch >= asciis.a && ch <= asciis.f) return ch - (asciis.a - 10);
}
/**
* Convert hex string to byte array. Uses built-in function, when available.
* @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
*/
function hexToBytes(hex) {
	if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
	if (hasHexBuiltin) return Uint8Array.fromHex(hex);
	const hl = hex.length;
	const al = hl / 2;
	if (hl % 2) throw new Error("hex string expected, got unpadded hex of length " + hl);
	const array = new Uint8Array(al);
	for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
		const n1 = asciiToBase16(hex.charCodeAt(hi));
		const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
		if (n1 === void 0 || n2 === void 0) {
			const char = hex[hi] + hex[hi + 1];
			throw new Error("hex string expected, got non-hex character \"" + char + "\" at index " + hi);
		}
		array[ai] = n1 * 16 + n2;
	}
	return array;
}
/**
* Converts string to bytes using UTF8 encoding.
* @example utf8ToBytes('abc') // Uint8Array.from([97, 98, 99])
*/
function utf8ToBytes(str) {
	if (typeof str !== "string") throw new Error("string expected");
	return new Uint8Array(new TextEncoder().encode(str));
}
/**
* Normalizes (non-hex) string or Uint8Array to Uint8Array.
* Warning: when Uint8Array is passed, it would NOT get copied.
* Keep in mind for future mutable operations.
*/
function toBytes(data) {
	if (typeof data === "string") data = utf8ToBytes(data);
	abytes(data);
	return data;
}
/** Copies several Uint8Arrays into one. */
function concatBytes(...arrays) {
	let sum = 0;
	for (let i = 0; i < arrays.length; i++) {
		const a = arrays[i];
		abytes(a);
		sum += a.length;
	}
	const res = new Uint8Array(sum);
	for (let i = 0, pad = 0; i < arrays.length; i++) {
		const a = arrays[i];
		res.set(a, pad);
		pad += a.length;
	}
	return res;
}
/** For runtime check if class implements interface */
var Hash = class {};
/** Wraps hash function, creating an interface on top of it */
function createHasher(hashCons) {
	const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
	const tmp = hashCons();
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.create = () => hashCons();
	return hashC;
}
/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
function randomBytes(bytesLength = 32) {
	if (crypto && typeof crypto.getRandomValues === "function") return crypto.getRandomValues(new Uint8Array(bytesLength));
	if (crypto && typeof crypto.randomBytes === "function") return Uint8Array.from(crypto.randomBytes(bytesLength));
	throw new Error("crypto.getRandomValues must be defined");
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/hashes/esm/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
function setBigUint64(view, byteOffset, value, isLE) {
	if (typeof view.setBigUint64 === "function") return view.setBigUint64(byteOffset, value, isLE);
	const _32n = BigInt(32);
	const _u32_max = BigInt(4294967295);
	const wh = Number(value >> _32n & _u32_max);
	const wl = Number(value & _u32_max);
	const h = isLE ? 4 : 0;
	const l = isLE ? 0 : 4;
	view.setUint32(byteOffset + h, wh, isLE);
	view.setUint32(byteOffset + l, wl, isLE);
}
/** Choice: a ? b : c */
function Chi(a, b, c) {
	return a & b ^ ~a & c;
}
/** Majority function, true if any two inputs is true. */
function Maj(a, b, c) {
	return a & b ^ a & c ^ b & c;
}
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
*/
var HashMD = class extends Hash {
	constructor(blockLen, outputLen, padOffset, isLE) {
		super();
		this.finished = false;
		this.length = 0;
		this.pos = 0;
		this.destroyed = false;
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView(this.buffer);
	}
	update(data) {
		aexists(this);
		data = toBytes(data);
		abytes(data);
		const { view, buffer, blockLen } = this;
		const len = data.length;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				continue;
			}
			buffer.set(data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
			}
		}
		this.length += data.length;
		this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		clean(this.buffer.subarray(pos));
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			pos = 0;
		}
		for (let i = pos; i < blockLen; i++) buffer[i] = 0;
		setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
		this.process(view, 0);
		const oview = createView(out);
		const len = this.outputLen;
		if (len % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
		const outLen = len / 4;
		const state = this.get();
		if (outLen > state.length) throw new Error("_sha2: outputLen bigger than state");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneInto(to) {
		to || (to = new this.constructor());
		to.set(...this.get());
		const { blockLen, buffer, length, finished, destroyed, pos } = this;
		to.destroyed = destroyed;
		to.finished = finished;
		to.length = length;
		to.pos = pos;
		if (length % blockLen) to.buffer.set(buffer);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
};
/**
* Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
* Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
*/
/** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]);
/** Initial SHA512 state. Bits 0..64 of frac part of sqrt of primes 2..19 */
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	4089235720,
	3144134277,
	2227873595,
	1013904242,
	4271175723,
	2773480762,
	1595750129,
	1359893119,
	2917565137,
	2600822924,
	725511199,
	528734635,
	4215389547,
	1541459225,
	327033209
]);
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/hashes/esm/_u64.js
/**
* Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
* @todo re-check https://issues.chromium.org/issues/42212588
* @module
*/
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
	if (le) return {
		h: Number(n & U32_MASK64),
		l: Number(n >> _32n & U32_MASK64)
	};
	return {
		h: Number(n >> _32n & U32_MASK64) | 0,
		l: Number(n & U32_MASK64) | 0
	};
}
function split(lst, le = false) {
	const len = lst.length;
	let Ah = new Uint32Array(len);
	let Al = new Uint32Array(len);
	for (let i = 0; i < len; i++) {
		const { h, l } = fromBig(lst[i], le);
		[Ah[i], Al[i]] = [h, l];
	}
	return [Ah, Al];
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
function add(Ah, Al, Bh, Bl) {
	const l = (Al >>> 0) + (Bl >>> 0);
	return {
		h: Ah + Bh + (l / 2 ** 32 | 0) | 0,
		l: l | 0
	};
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/hashes/esm/sha2.js
/**
* SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
* SHA256 is the fastest hash implementable in JS, even faster than Blake3.
* Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
* [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
* @module
*/
/**
* Round constants:
* First 32 bits of fractional parts of the cube roots of the first 64 primes 2..311)
*/
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/** Reusable temporary buffer. "W" comes straight from spec. */
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
	constructor(outputLen = 32) {
		super(64, outputLen, 8, false);
		this.A = SHA256_IV[0] | 0;
		this.B = SHA256_IV[1] | 0;
		this.C = SHA256_IV[2] | 0;
		this.D = SHA256_IV[3] | 0;
		this.E = SHA256_IV[4] | 0;
		this.F = SHA256_IV[5] | 0;
		this.G = SHA256_IV[6] | 0;
		this.H = SHA256_IV[7] | 0;
	}
	get() {
		const { A, B, C, D, E, F, G, H } = this;
		return [
			A,
			B,
			C,
			D,
			E,
			F,
			G,
			H
		];
	}
	set(A, B, C, D, E, F, G, H) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
		this.F = F | 0;
		this.G = G | 0;
		this.H = H | 0;
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
		for (let i = 16; i < 64; i++) {
			const W15 = SHA256_W[i - 15];
			const W2 = SHA256_W[i - 2];
			const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
			const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
			SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
		}
		let { A, B, C, D, E, F, G, H } = this;
		for (let i = 0; i < 64; i++) {
			const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
			const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
			const T2 = (rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C) | 0;
			H = G;
			G = F;
			F = E;
			E = D + T1 | 0;
			D = C;
			C = B;
			B = A;
			A = T1 + T2 | 0;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		F = F + this.F | 0;
		G = G + this.G | 0;
		H = H + this.H | 0;
		this.set(A, B, C, D, E, F, G, H);
	}
	roundClean() {
		clean(SHA256_W);
	}
	destroy() {
		this.set(0, 0, 0, 0, 0, 0, 0, 0);
		clean(this.buffer);
	}
};
var K512 = /* @__PURE__ */ (() => split([
	"0x428a2f98d728ae22",
	"0x7137449123ef65cd",
	"0xb5c0fbcfec4d3b2f",
	"0xe9b5dba58189dbbc",
	"0x3956c25bf348b538",
	"0x59f111f1b605d019",
	"0x923f82a4af194f9b",
	"0xab1c5ed5da6d8118",
	"0xd807aa98a3030242",
	"0x12835b0145706fbe",
	"0x243185be4ee4b28c",
	"0x550c7dc3d5ffb4e2",
	"0x72be5d74f27b896f",
	"0x80deb1fe3b1696b1",
	"0x9bdc06a725c71235",
	"0xc19bf174cf692694",
	"0xe49b69c19ef14ad2",
	"0xefbe4786384f25e3",
	"0x0fc19dc68b8cd5b5",
	"0x240ca1cc77ac9c65",
	"0x2de92c6f592b0275",
	"0x4a7484aa6ea6e483",
	"0x5cb0a9dcbd41fbd4",
	"0x76f988da831153b5",
	"0x983e5152ee66dfab",
	"0xa831c66d2db43210",
	"0xb00327c898fb213f",
	"0xbf597fc7beef0ee4",
	"0xc6e00bf33da88fc2",
	"0xd5a79147930aa725",
	"0x06ca6351e003826f",
	"0x142929670a0e6e70",
	"0x27b70a8546d22ffc",
	"0x2e1b21385c26c926",
	"0x4d2c6dfc5ac42aed",
	"0x53380d139d95b3df",
	"0x650a73548baf63de",
	"0x766a0abb3c77b2a8",
	"0x81c2c92e47edaee6",
	"0x92722c851482353b",
	"0xa2bfe8a14cf10364",
	"0xa81a664bbc423001",
	"0xc24b8b70d0f89791",
	"0xc76c51a30654be30",
	"0xd192e819d6ef5218",
	"0xd69906245565a910",
	"0xf40e35855771202a",
	"0x106aa07032bbd1b8",
	"0x19a4c116b8d2d0c8",
	"0x1e376c085141ab53",
	"0x2748774cdf8eeb99",
	"0x34b0bcb5e19b48a8",
	"0x391c0cb3c5c95a63",
	"0x4ed8aa4ae3418acb",
	"0x5b9cca4f7763e373",
	"0x682e6ff3d6b2b8a3",
	"0x748f82ee5defb2fc",
	"0x78a5636f43172f60",
	"0x84c87814a1f0ab72",
	"0x8cc702081a6439ec",
	"0x90befffa23631e28",
	"0xa4506cebde82bde9",
	"0xbef9a3f7b2c67915",
	"0xc67178f2e372532b",
	"0xca273eceea26619c",
	"0xd186b8c721c0c207",
	"0xeada7dd6cde0eb1e",
	"0xf57d4f7fee6ed178",
	"0x06f067aa72176fba",
	"0x0a637dc5a2c898a6",
	"0x113f9804bef90dae",
	"0x1b710b35131c471b",
	"0x28db77f523047d84",
	"0x32caab7b40c72493",
	"0x3c9ebe0a15c9bebc",
	"0x431d67c49c100d4c",
	"0x4cc5d4becb3e42b6",
	"0x597f299cfc657e2a",
	"0x5fcb6fab3ad6faec",
	"0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA512 = class extends HashMD {
	constructor(outputLen = 64) {
		super(128, outputLen, 16, false);
		this.Ah = SHA512_IV[0] | 0;
		this.Al = SHA512_IV[1] | 0;
		this.Bh = SHA512_IV[2] | 0;
		this.Bl = SHA512_IV[3] | 0;
		this.Ch = SHA512_IV[4] | 0;
		this.Cl = SHA512_IV[5] | 0;
		this.Dh = SHA512_IV[6] | 0;
		this.Dl = SHA512_IV[7] | 0;
		this.Eh = SHA512_IV[8] | 0;
		this.El = SHA512_IV[9] | 0;
		this.Fh = SHA512_IV[10] | 0;
		this.Fl = SHA512_IV[11] | 0;
		this.Gh = SHA512_IV[12] | 0;
		this.Gl = SHA512_IV[13] | 0;
		this.Hh = SHA512_IV[14] | 0;
		this.Hl = SHA512_IV[15] | 0;
	}
	get() {
		const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		return [
			Ah,
			Al,
			Bh,
			Bl,
			Ch,
			Cl,
			Dh,
			Dl,
			Eh,
			El,
			Fh,
			Fl,
			Gh,
			Gl,
			Hh,
			Hl
		];
	}
	set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
		this.Ah = Ah | 0;
		this.Al = Al | 0;
		this.Bh = Bh | 0;
		this.Bl = Bl | 0;
		this.Ch = Ch | 0;
		this.Cl = Cl | 0;
		this.Dh = Dh | 0;
		this.Dl = Dl | 0;
		this.Eh = Eh | 0;
		this.El = El | 0;
		this.Fh = Fh | 0;
		this.Fl = Fl | 0;
		this.Gh = Gh | 0;
		this.Gl = Gl | 0;
		this.Hh = Hh | 0;
		this.Hl = Hl | 0;
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) {
			SHA512_W_H[i] = view.getUint32(offset);
			SHA512_W_L[i] = view.getUint32(offset += 4);
		}
		for (let i = 16; i < 80; i++) {
			const W15h = SHA512_W_H[i - 15] | 0;
			const W15l = SHA512_W_L[i - 15] | 0;
			const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
			const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
			const W2h = SHA512_W_H[i - 2] | 0;
			const W2l = SHA512_W_L[i - 2] | 0;
			const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
			const SUMl = add4L(s0l, rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6), SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
			const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
			SHA512_W_H[i] = SUMh | 0;
			SHA512_W_L[i] = SUMl | 0;
		}
		let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		for (let i = 0; i < 80; i++) {
			const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
			const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
			const CHIh = Eh & Fh ^ ~Eh & Gh;
			const CHIl = El & Fl ^ ~El & Gl;
			const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
			const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
			const T1l = T1ll | 0;
			const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
			const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
			const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
			const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
			Hh = Gh | 0;
			Hl = Gl | 0;
			Gh = Fh | 0;
			Gl = Fl | 0;
			Fh = Eh | 0;
			Fl = El | 0;
			({h: Eh, l: El} = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
			Dh = Ch | 0;
			Dl = Cl | 0;
			Ch = Bh | 0;
			Cl = Bl | 0;
			Bh = Ah | 0;
			Bl = Al | 0;
			const All = add3L(T1l, sigma0l, MAJl);
			Ah = add3H(All, T1h, sigma0h, MAJh);
			Al = All | 0;
		}
		({h: Ah, l: Al} = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
		({h: Bh, l: Bl} = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
		({h: Ch, l: Cl} = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
		({h: Dh, l: Dl} = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
		({h: Eh, l: El} = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
		({h: Fh, l: Fl} = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
		({h: Gh, l: Gl} = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
		({h: Hh, l: Hl} = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
		this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
	}
	roundClean() {
		clean(SHA512_W_H, SHA512_W_L);
	}
	destroy() {
		clean(this.buffer);
		this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
};
/**
* SHA2-256 hash function from RFC 4634.
*
* It is the fastest JS hash, even faster than Blake3.
* To break sha256 using birthday attack, attackers need to try 2^128 hashes.
* BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
*/
var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
/** SHA2-512 hash function from RFC 4634. */
var sha512 = /* @__PURE__ */ createHasher(() => new SHA512());
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/utils.js
/**
* Hex, bytes and number utilities.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$5 = /* @__PURE__ */ BigInt(0);
var _1n$5 = /* @__PURE__ */ BigInt(1);
function _abool2(value, title = "") {
	if (typeof value !== "boolean") {
		const prefix = title && `"${title}"`;
		throw new Error(prefix + "expected boolean, got type=" + typeof value);
	}
	return value;
}
/** Asserts something is Uint8Array. */
function _abytes2(value, length, title = "") {
	const bytes = isBytes(value);
	const len = value?.length;
	const needsLen = length !== void 0;
	if (!bytes || needsLen && len !== length) {
		const prefix = title && `"${title}" `;
		const ofLen = needsLen ? ` of length ${length}` : "";
		const got = bytes ? `length=${len}` : `type=${typeof value}`;
		throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
	}
	return value;
}
function numberToHexUnpadded(num) {
	const hex = num.toString(16);
	return hex.length & 1 ? "0" + hex : hex;
}
function hexToNumber(hex) {
	if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
	return hex === "" ? _0n$5 : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
	return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
	abytes(bytes);
	return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
	return hexToBytes(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n, len) {
	return numberToBytesBE(n, len).reverse();
}
/**
* Takes hex string or Uint8Array, converts to Uint8Array.
* Validates output length.
* Will throw error for other types.
* @param title descriptive title for an error e.g. 'secret key'
* @param hex hex string or Uint8Array
* @param expectedLength optional, will compare to result array's length
* @returns
*/
function ensureBytes(title, hex, expectedLength) {
	let res;
	if (typeof hex === "string") try {
		res = hexToBytes(hex);
	} catch (e) {
		throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
	}
	else if (isBytes(hex)) res = Uint8Array.from(hex);
	else throw new Error(title + " must be hex string or Uint8Array");
	const len = res.length;
	if (typeof expectedLength === "number" && len !== expectedLength) throw new Error(title + " of length " + expectedLength + " expected, got " + len);
	return res;
}
function equalBytes(a, b) {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
/**
* Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
* and Buffer#slice creates mutable copy. Never use Buffers!
*/
function copyBytes(bytes) {
	return Uint8Array.from(bytes);
}
/**
* @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
*/
/**
* Converts bytes to string using UTF8 encoding.
* @example bytesToUtf8(Uint8Array.from([97, 98, 99])) // 'abc'
*/
var isPosBig = (n) => typeof n === "bigint" && _0n$5 <= n;
function inRange(n, min, max) {
	return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
/**
* Asserts min <= n < max. NOTE: It's < max and not <= max.
* @example
* aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
*/
function aInRange(title, n, min, max) {
	if (!inRange(n, min, max)) throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
/**
* Calculates amount of bits in a bigint.
* Same as `n.toString(2).length`
* TODO: merge with nLength in modular
*/
function bitLen(n) {
	let len = 0;
	for (; n > _0n$5; n >>= _1n$5, len += 1);
	return len;
}
/**
* Calculate mask for N bits. Not using ** operator with bigints because of old engines.
* Same as BigInt(`0b${Array(i).fill('1').join('')}`)
*/
var bitMask = (n) => (_1n$5 << BigInt(n)) - _1n$5;
/**
* Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
* @returns function that will call DRBG until 2nd arg returns something meaningful
* @example
*   const drbg = createHmacDRBG<Key>(32, 32, hmac);
*   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
*/
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
	if (typeof hashLen !== "number" || hashLen < 2) throw new Error("hashLen must be a number");
	if (typeof qByteLen !== "number" || qByteLen < 2) throw new Error("qByteLen must be a number");
	if (typeof hmacFn !== "function") throw new Error("hmacFn must be a function");
	const u8n = (len) => new Uint8Array(len);
	const u8of = (byte) => Uint8Array.of(byte);
	let v = u8n(hashLen);
	let k = u8n(hashLen);
	let i = 0;
	const reset = () => {
		v.fill(1);
		k.fill(0);
		i = 0;
	};
	const h = (...b) => hmacFn(k, v, ...b);
	const reseed = (seed = u8n(0)) => {
		k = h(u8of(0), seed);
		v = h();
		if (seed.length === 0) return;
		k = h(u8of(1), seed);
		v = h();
	};
	const gen = () => {
		if (i++ >= 1e3) throw new Error("drbg: tried 1000 values");
		let len = 0;
		const out = [];
		while (len < qByteLen) {
			v = h();
			const sl = v.slice();
			out.push(sl);
			len += v.length;
		}
		return concatBytes(...out);
	};
	const genUntil = (seed, pred) => {
		reset();
		reseed(seed);
		let res = void 0;
		while (!(res = pred(gen()))) reseed();
		reset();
		return res;
	};
	return genUntil;
}
function _validateObject(object, fields, optFields = {}) {
	if (!object || typeof object !== "object") throw new Error("expected valid options object");
	function checkField(fieldName, expectedType, isOpt) {
		const val = object[fieldName];
		if (isOpt && val === void 0) return;
		const current = typeof val;
		if (current !== expectedType || val === null) throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
	}
	Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
	Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
}
/**
* throws not implemented error
*/
var notImplemented = () => {
	throw new Error("not implemented");
};
/**
* Memoizes (caches) computation result.
* Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
*/
function memoized(fn) {
	const map = /* @__PURE__ */ new WeakMap();
	return (arg, ...args) => {
		const val = map.get(arg);
		if (val !== void 0) return val;
		const computed = fn(arg, ...args);
		map.set(arg, computed);
		return computed;
	};
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/abstract/modular.js
/**
* Utils for modular division and fields.
* Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
* There is no division: it is replaced by modular multiplicative inverse.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$4 = BigInt(0);
var _1n$4 = BigInt(1);
var _2n$4 = /* @__PURE__ */ BigInt(2);
var _3n$1 = /* @__PURE__ */ BigInt(3);
var _4n$1 = /* @__PURE__ */ BigInt(4);
var _5n$1 = /* @__PURE__ */ BigInt(5);
var _7n = /* @__PURE__ */ BigInt(7);
var _8n$2 = /* @__PURE__ */ BigInt(8);
var _9n = /* @__PURE__ */ BigInt(9);
var _16n = /* @__PURE__ */ BigInt(16);
function mod(a, b) {
	const result = a % b;
	return result >= _0n$4 ? result : b + result;
}
/** Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)` */
function pow2(x, power, modulo) {
	let res = x;
	while (power-- > _0n$4) {
		res *= res;
		res %= modulo;
	}
	return res;
}
/**
* Inverses number over modulo.
* Implemented using [Euclidean GCD](https://brilliant.org/wiki/extended-euclidean-algorithm/).
*/
function invert(number, modulo) {
	if (number === _0n$4) throw new Error("invert: expected non-zero number");
	if (modulo <= _0n$4) throw new Error("invert: expected positive modulus, got " + modulo);
	let a = mod(number, modulo);
	let b = modulo;
	let x = _0n$4, y = _1n$4, u = _1n$4, v = _0n$4;
	while (a !== _0n$4) {
		const q = b / a;
		const r = b % a;
		const m = x - u * q;
		const n = y - v * q;
		b = a, a = r, x = u, y = v, u = m, v = n;
	}
	if (b !== _1n$4) throw new Error("invert: does not exist");
	return mod(x, modulo);
}
function assertIsSquare(Fp, root, n) {
	if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
}
function sqrt3mod4(Fp, n) {
	const p1div4 = (Fp.ORDER + _1n$4) / _4n$1;
	const root = Fp.pow(n, p1div4);
	assertIsSquare(Fp, root, n);
	return root;
}
function sqrt5mod8(Fp, n) {
	const p5div8 = (Fp.ORDER - _5n$1) / _8n$2;
	const n2 = Fp.mul(n, _2n$4);
	const v = Fp.pow(n2, p5div8);
	const nv = Fp.mul(n, v);
	const i = Fp.mul(Fp.mul(nv, _2n$4), v);
	const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
	assertIsSquare(Fp, root, n);
	return root;
}
function sqrt9mod16(P) {
	const Fp_ = Field(P);
	const tn = tonelliShanks(P);
	const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
	const c2 = tn(Fp_, c1);
	const c3 = tn(Fp_, Fp_.neg(c1));
	const c4 = (P + _7n) / _16n;
	return (Fp, n) => {
		let tv1 = Fp.pow(n, c4);
		let tv2 = Fp.mul(tv1, c1);
		const tv3 = Fp.mul(tv1, c2);
		const tv4 = Fp.mul(tv1, c3);
		const e1 = Fp.eql(Fp.sqr(tv2), n);
		const e2 = Fp.eql(Fp.sqr(tv3), n);
		tv1 = Fp.cmov(tv1, tv2, e1);
		tv2 = Fp.cmov(tv4, tv3, e2);
		const e3 = Fp.eql(Fp.sqr(tv2), n);
		const root = Fp.cmov(tv1, tv2, e3);
		assertIsSquare(Fp, root, n);
		return root;
	};
}
/**
* Tonelli-Shanks square root search algorithm.
* 1. https://eprint.iacr.org/2012/685.pdf (page 12)
* 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
* @param P field order
* @returns function that takes field Fp (created from P) and number n
*/
function tonelliShanks(P) {
	if (P < _3n$1) throw new Error("sqrt is not defined for small field");
	let Q = P - _1n$4;
	let S = 0;
	while (Q % _2n$4 === _0n$4) {
		Q /= _2n$4;
		S++;
	}
	let Z = _2n$4;
	const _Fp = Field(P);
	while (FpLegendre(_Fp, Z) === 1) if (Z++ > 1e3) throw new Error("Cannot find square root: probably non-prime P");
	if (S === 1) return sqrt3mod4;
	let cc = _Fp.pow(Z, Q);
	const Q1div2 = (Q + _1n$4) / _2n$4;
	return function tonelliSlow(Fp, n) {
		if (Fp.is0(n)) return n;
		if (FpLegendre(Fp, n) !== 1) throw new Error("Cannot find square root");
		let M = S;
		let c = Fp.mul(Fp.ONE, cc);
		let t = Fp.pow(n, Q);
		let R = Fp.pow(n, Q1div2);
		while (!Fp.eql(t, Fp.ONE)) {
			if (Fp.is0(t)) return Fp.ZERO;
			let i = 1;
			let t_tmp = Fp.sqr(t);
			while (!Fp.eql(t_tmp, Fp.ONE)) {
				i++;
				t_tmp = Fp.sqr(t_tmp);
				if (i === M) throw new Error("Cannot find square root");
			}
			const exponent = _1n$4 << BigInt(M - i - 1);
			const b = Fp.pow(c, exponent);
			M = i;
			c = Fp.sqr(b);
			t = Fp.mul(t, c);
			R = Fp.mul(R, b);
		}
		return R;
	};
}
/**
* Square root for a finite field. Will try optimized versions first:
*
* 1. P ≡ 3 (mod 4)
* 2. P ≡ 5 (mod 8)
* 3. P ≡ 9 (mod 16)
* 4. Tonelli-Shanks algorithm
*
* Different algorithms can give different roots, it is up to user to decide which one they want.
* For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
*/
function FpSqrt(P) {
	if (P % _4n$1 === _3n$1) return sqrt3mod4;
	if (P % _8n$2 === _5n$1) return sqrt5mod8;
	if (P % _16n === _9n) return sqrt9mod16(P);
	return tonelliShanks(P);
}
var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n$4) === _1n$4;
var FIELD_FIELDS = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
function validateField(field) {
	_validateObject(field, FIELD_FIELDS.reduce((map, val) => {
		map[val] = "function";
		return map;
	}, {
		ORDER: "bigint",
		MASK: "bigint",
		BYTES: "number",
		BITS: "number"
	}));
	return field;
}
/**
* Same as `pow` but for Fp: non-constant-time.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
*/
function FpPow(Fp, num, power) {
	if (power < _0n$4) throw new Error("invalid exponent, negatives unsupported");
	if (power === _0n$4) return Fp.ONE;
	if (power === _1n$4) return num;
	let p = Fp.ONE;
	let d = num;
	while (power > _0n$4) {
		if (power & _1n$4) p = Fp.mul(p, d);
		d = Fp.sqr(d);
		power >>= _1n$4;
	}
	return p;
}
/**
* Efficiently invert an array of Field elements.
* Exception-free. Will return `undefined` for 0 elements.
* @param passZero map 0 to 0 (instead of undefined)
*/
function FpInvertBatch(Fp, nums, passZero = false) {
	const inverted = new Array(nums.length).fill(passZero ? Fp.ZERO : void 0);
	const multipliedAcc = nums.reduce((acc, num, i) => {
		if (Fp.is0(num)) return acc;
		inverted[i] = acc;
		return Fp.mul(acc, num);
	}, Fp.ONE);
	const invertedAcc = Fp.inv(multipliedAcc);
	nums.reduceRight((acc, num, i) => {
		if (Fp.is0(num)) return acc;
		inverted[i] = Fp.mul(acc, inverted[i]);
		return Fp.mul(acc, num);
	}, invertedAcc);
	return inverted;
}
/**
* Legendre symbol.
* Legendre constant is used to calculate Legendre symbol (a | p)
* which denotes the value of a^((p-1)/2) (mod p).
*
* * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
* * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
* * (a | p) ≡ 0    if a ≡ 0 (mod p)
*/
function FpLegendre(Fp, n) {
	const p1mod2 = (Fp.ORDER - _1n$4) / _2n$4;
	const powered = Fp.pow(n, p1mod2);
	const yes = Fp.eql(powered, Fp.ONE);
	const zero = Fp.eql(powered, Fp.ZERO);
	const no = Fp.eql(powered, Fp.neg(Fp.ONE));
	if (!yes && !zero && !no) throw new Error("invalid Legendre symbol result");
	return yes ? 1 : zero ? 0 : -1;
}
function nLength(n, nBitLength) {
	if (nBitLength !== void 0) anumber(nBitLength);
	const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
	return {
		nBitLength: _nBitLength,
		nByteLength: Math.ceil(_nBitLength / 8)
	};
}
/**
* Creates a finite field. Major performance optimizations:
* * 1. Denormalized operations like mulN instead of mul.
* * 2. Identical object shape: never add or remove keys.
* * 3. `Object.freeze`.
* Fragile: always run a benchmark on a change.
* Security note: operations don't check 'isValid' for all elements for performance reasons,
* it is caller responsibility to check this.
* This is low-level code, please make sure you know what you're doing.
*
* Note about field properties:
* * CHARACTERISTIC p = prime number, number of elements in main subgroup.
* * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
*
* @param ORDER field order, probably prime, or could be composite
* @param bitLen how many bits the field consumes
* @param isLE (default: false) if encoding / decoding should be in little-endian
* @param redef optional faster redefinitions of sqrt and other methods
*/
function Field(ORDER, bitLenOrOpts, isLE = false, opts = {}) {
	if (ORDER <= _0n$4) throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
	let _nbitLength = void 0;
	let _sqrt = void 0;
	let modFromBytes = false;
	let allowedLengths = void 0;
	if (typeof bitLenOrOpts === "object" && bitLenOrOpts != null) {
		if (opts.sqrt || isLE) throw new Error("cannot specify opts in two arguments");
		const _opts = bitLenOrOpts;
		if (_opts.BITS) _nbitLength = _opts.BITS;
		if (_opts.sqrt) _sqrt = _opts.sqrt;
		if (typeof _opts.isLE === "boolean") isLE = _opts.isLE;
		if (typeof _opts.modFromBytes === "boolean") modFromBytes = _opts.modFromBytes;
		allowedLengths = _opts.allowedLengths;
	} else {
		if (typeof bitLenOrOpts === "number") _nbitLength = bitLenOrOpts;
		if (opts.sqrt) _sqrt = opts.sqrt;
	}
	const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
	if (BYTES > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
	let sqrtP;
	const f = Object.freeze({
		ORDER,
		isLE,
		BITS,
		BYTES,
		MASK: bitMask(BITS),
		ZERO: _0n$4,
		ONE: _1n$4,
		allowedLengths,
		create: (num) => mod(num, ORDER),
		isValid: (num) => {
			if (typeof num !== "bigint") throw new Error("invalid field element: expected bigint, got " + typeof num);
			return _0n$4 <= num && num < ORDER;
		},
		is0: (num) => num === _0n$4,
		isValidNot0: (num) => !f.is0(num) && f.isValid(num),
		isOdd: (num) => (num & _1n$4) === _1n$4,
		neg: (num) => mod(-num, ORDER),
		eql: (lhs, rhs) => lhs === rhs,
		sqr: (num) => mod(num * num, ORDER),
		add: (lhs, rhs) => mod(lhs + rhs, ORDER),
		sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
		mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
		pow: (num, power) => FpPow(f, num, power),
		div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
		sqrN: (num) => num * num,
		addN: (lhs, rhs) => lhs + rhs,
		subN: (lhs, rhs) => lhs - rhs,
		mulN: (lhs, rhs) => lhs * rhs,
		inv: (num) => invert(num, ORDER),
		sqrt: _sqrt || ((n) => {
			if (!sqrtP) sqrtP = FpSqrt(ORDER);
			return sqrtP(f, n);
		}),
		toBytes: (num) => isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
		fromBytes: (bytes, skipValidation = true) => {
			if (allowedLengths) {
				if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
				const padded = new Uint8Array(BYTES);
				padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
				bytes = padded;
			}
			if (bytes.length !== BYTES) throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
			let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
			if (modFromBytes) scalar = mod(scalar, ORDER);
			if (!skipValidation) {
				if (!f.isValid(scalar)) throw new Error("invalid field element: outside of range 0..ORDER");
			}
			return scalar;
		},
		invertBatch: (lst) => FpInvertBatch(f, lst),
		cmov: (a, b, c) => c ? b : a
	});
	return Object.freeze(f);
}
/**
* Returns total number of bytes consumed by the field element.
* For example, 32 bytes for usual 256-bit weierstrass curve.
* @param fieldOrder number of field elements, usually CURVE.n
* @returns byte length of field
*/
function getFieldBytesLength(fieldOrder) {
	if (typeof fieldOrder !== "bigint") throw new Error("field order must be bigint");
	const bitLength = fieldOrder.toString(2).length;
	return Math.ceil(bitLength / 8);
}
/**
* Returns minimal amount of bytes that can be safely reduced
* by field order.
* Should be 2^-128 for 128-bit curve such as P256.
* @param fieldOrder number of field elements, usually CURVE.n
* @returns byte length of target hash
*/
function getMinHashLength(fieldOrder) {
	const length = getFieldBytesLength(fieldOrder);
	return length + Math.ceil(length / 2);
}
/**
* "Constant-time" private key generation utility.
* Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
* and convert them into private scalar, with the modulo bias being negligible.
* Needs at least 48 bytes of input for 32-byte private key.
* https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
* FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
* RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
* @param hash hash output from SHA3 or a similar function
* @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
* @param isLE interpret hash bytes as LE num
* @returns valid private scalar
*/
function mapHashToField(key, fieldOrder, isLE = false) {
	const len = key.length;
	const fieldLen = getFieldBytesLength(fieldOrder);
	const minLen = getMinHashLength(fieldOrder);
	if (len < 16 || len < minLen || len > 1024) throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
	const reduced = mod(isLE ? bytesToNumberLE(key) : bytesToNumberBE(key), fieldOrder - _1n$4) + _1n$4;
	return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/abstract/curve.js
/**
* Methods for elliptic curve multiplication by scalars.
* Contains wNAF, pippenger.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$3 = BigInt(0);
var _1n$3 = BigInt(1);
function negateCt(condition, item) {
	const neg = item.negate();
	return condition ? neg : item;
}
/**
* Takes a bunch of Projective Points but executes only one
* inversion on all of them. Inversion is very slow operation,
* so this improves performance massively.
* Optimization: converts a list of projective points to a list of identical points with Z=1.
*/
function normalizeZ(c, points) {
	const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
	return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits) {
	if (!Number.isSafeInteger(W) || W <= 0 || W > bits) throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, scalarBits) {
	validateW(W, scalarBits);
	const windows = Math.ceil(scalarBits / W) + 1;
	const windowSize = 2 ** (W - 1);
	const maxNumber = 2 ** W;
	return {
		windows,
		windowSize,
		mask: bitMask(W),
		maxNumber,
		shiftBy: BigInt(W)
	};
}
function calcOffsets(n, window, wOpts) {
	const { windowSize, mask, maxNumber, shiftBy } = wOpts;
	let wbits = Number(n & mask);
	let nextN = n >> shiftBy;
	if (wbits > windowSize) {
		wbits -= maxNumber;
		nextN += _1n$3;
	}
	const offsetStart = window * windowSize;
	const offset = offsetStart + Math.abs(wbits) - 1;
	const isZero = wbits === 0;
	const isNeg = wbits < 0;
	const isNegF = window % 2 !== 0;
	return {
		nextN,
		offset,
		isZero,
		isNeg,
		isNegF,
		offsetF: offsetStart
	};
}
function validateMSMPoints(points, c) {
	if (!Array.isArray(points)) throw new Error("array expected");
	points.forEach((p, i) => {
		if (!(p instanceof c)) throw new Error("invalid point at index " + i);
	});
}
function validateMSMScalars(scalars, field) {
	if (!Array.isArray(scalars)) throw new Error("array of scalars expected");
	scalars.forEach((s, i) => {
		if (!field.isValid(s)) throw new Error("invalid scalar at index " + i);
	});
}
var pointPrecomputes = /* @__PURE__ */ new WeakMap();
var pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getW(P) {
	return pointWindowSizes.get(P) || 1;
}
function assert0(n) {
	if (n !== _0n$3) throw new Error("invalid wNAF");
}
/**
* Elliptic curve multiplication of Point by scalar. Fragile.
* Table generation takes **30MB of ram and 10ms on high-end CPU**,
* but may take much longer on slow devices. Actual generation will happen on
* first call of `multiply()`. By default, `BASE` point is precomputed.
*
* Scalars should always be less than curve order: this should be checked inside of a curve itself.
* Creates precomputation tables for fast multiplication:
* - private scalar is split by fixed size windows of W bits
* - every window point is collected from window's table & added to accumulator
* - since windows are different, same point inside tables won't be accessed more than once per calc
* - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
* - +1 window is neccessary for wNAF
* - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
*
* @todo Research returning 2d JS array of windows, instead of a single window.
* This would allow windows to be in different memory locations
*/
var wNAF = class {
	constructor(Point, bits) {
		this.BASE = Point.BASE;
		this.ZERO = Point.ZERO;
		this.Fn = Point.Fn;
		this.bits = bits;
	}
	_unsafeLadder(elm, n, p = this.ZERO) {
		let d = elm;
		while (n > _0n$3) {
			if (n & _1n$3) p = p.add(d);
			d = d.double();
			n >>= _1n$3;
		}
		return p;
	}
	/**
	* Creates a wNAF precomputation window. Used for caching.
	* Default window size is set by `utils.precompute()` and is equal to 8.
	* Number of precomputed points depends on the curve size:
	* 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
	* - 𝑊 is the window size
	* - 𝑛 is the bitlength of the curve order.
	* For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
	* @param point Point instance
	* @param W window size
	* @returns precomputed point tables flattened to a single array
	*/
	precomputeWindow(point, W) {
		const { windows, windowSize } = calcWOpts(W, this.bits);
		const points = [];
		let p = point;
		let base = p;
		for (let window = 0; window < windows; window++) {
			base = p;
			points.push(base);
			for (let i = 1; i < windowSize; i++) {
				base = base.add(p);
				points.push(base);
			}
			p = base.double();
		}
		return points;
	}
	/**
	* Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
	* More compact implementation:
	* https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
	* @returns real and fake (for const-time) points
	*/
	wNAF(W, precomputes, n) {
		if (!this.Fn.isValid(n)) throw new Error("invalid scalar");
		let p = this.ZERO;
		let f = this.BASE;
		const wo = calcWOpts(W, this.bits);
		for (let window = 0; window < wo.windows; window++) {
			const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
			n = nextN;
			if (isZero) f = f.add(negateCt(isNegF, precomputes[offsetF]));
			else p = p.add(negateCt(isNeg, precomputes[offset]));
		}
		assert0(n);
		return {
			p,
			f
		};
	}
	/**
	* Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
	* @param acc accumulator point to add result of multiplication
	* @returns point
	*/
	wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
		const wo = calcWOpts(W, this.bits);
		for (let window = 0; window < wo.windows; window++) {
			if (n === _0n$3) break;
			const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
			n = nextN;
			if (isZero) continue;
			else {
				const item = precomputes[offset];
				acc = acc.add(isNeg ? item.negate() : item);
			}
		}
		assert0(n);
		return acc;
	}
	getPrecomputes(W, point, transform) {
		let comp = pointPrecomputes.get(point);
		if (!comp) {
			comp = this.precomputeWindow(point, W);
			if (W !== 1) {
				if (typeof transform === "function") comp = transform(comp);
				pointPrecomputes.set(point, comp);
			}
		}
		return comp;
	}
	cached(point, scalar, transform) {
		const W = getW(point);
		return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
	}
	unsafe(point, scalar, transform, prev) {
		const W = getW(point);
		if (W === 1) return this._unsafeLadder(point, scalar, prev);
		return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
	}
	createCache(P, W) {
		validateW(W, this.bits);
		pointWindowSizes.set(P, W);
		pointPrecomputes.delete(P);
	}
	hasCache(elm) {
		return getW(elm) !== 1;
	}
};
/**
* Endomorphism-specific multiplication for Koblitz curves.
* Cost: 128 dbl, 0-256 adds.
*/
function mulEndoUnsafe(Point, point, k1, k2) {
	let acc = point;
	let p1 = Point.ZERO;
	let p2 = Point.ZERO;
	while (k1 > _0n$3 || k2 > _0n$3) {
		if (k1 & _1n$3) p1 = p1.add(acc);
		if (k2 & _1n$3) p2 = p2.add(acc);
		acc = acc.double();
		k1 >>= _1n$3;
		k2 >>= _1n$3;
	}
	return {
		p1,
		p2
	};
}
/**
* Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
* 30x faster vs naive addition on L=4096, 10x faster than precomputes.
* For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
* Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
* @param c Curve Point constructor
* @param fieldN field over CURVE.N - important that it's not over CURVE.P
* @param points array of L curve points
* @param scalars array of L scalars (aka secret keys / bigints)
*/
function pippenger(c, fieldN, points, scalars) {
	validateMSMPoints(points, c);
	validateMSMScalars(scalars, fieldN);
	const plength = points.length;
	const slength = scalars.length;
	if (plength !== slength) throw new Error("arrays of points and scalars must have equal length");
	const zero = c.ZERO;
	const wbits = bitLen(BigInt(plength));
	let windowSize = 1;
	if (wbits > 12) windowSize = wbits - 3;
	else if (wbits > 4) windowSize = wbits - 2;
	else if (wbits > 0) windowSize = 2;
	const MASK = bitMask(windowSize);
	const buckets = new Array(Number(MASK) + 1).fill(zero);
	const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
	let sum = zero;
	for (let i = lastBits; i >= 0; i -= windowSize) {
		buckets.fill(zero);
		for (let j = 0; j < slength; j++) {
			const scalar = scalars[j];
			const wbits = Number(scalar >> BigInt(i) & MASK);
			buckets[wbits] = buckets[wbits].add(points[j]);
		}
		let resI = zero;
		for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
			sumI = sumI.add(buckets[j]);
			resI = resI.add(sumI);
		}
		sum = sum.add(resI);
		if (i !== 0) for (let j = 0; j < windowSize; j++) sum = sum.double();
	}
	return sum;
}
function createField(order, field, isLE) {
	if (field) {
		if (field.ORDER !== order) throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
		validateField(field);
		return field;
	} else return Field(order, { isLE });
}
/** Validates CURVE opts and creates fields */
function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
	if (FpFnLE === void 0) FpFnLE = type === "edwards";
	if (!CURVE || typeof CURVE !== "object") throw new Error(`expected valid ${type} CURVE object`);
	for (const p of [
		"p",
		"n",
		"h"
	]) {
		const val = CURVE[p];
		if (!(typeof val === "bigint" && val > _0n$3)) throw new Error(`CURVE.${p} must be positive bigint`);
	}
	const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
	const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
	const params = [
		"Gx",
		"Gy",
		"a",
		type === "weierstrass" ? "b" : "d"
	];
	for (const p of params) if (!Fp.isValid(CURVE[p])) throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
	CURVE = Object.freeze(Object.assign({}, CURVE));
	return {
		CURVE,
		Fp,
		Fn
	};
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/abstract/edwards.js
/**
* Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
* For design rationale of types / exports, see weierstrass module documentation.
* Untwisted Edwards curves exist, but they aren't used in real-world protocols.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$2 = BigInt(0);
var _1n$2 = BigInt(1);
var _2n$3 = BigInt(2);
var _8n$1 = BigInt(8);
function isEdValidXY(Fp, CURVE, x, y) {
	const x2 = Fp.sqr(x);
	const y2 = Fp.sqr(y);
	const left = Fp.add(Fp.mul(CURVE.a, x2), y2);
	const right = Fp.add(Fp.ONE, Fp.mul(CURVE.d, Fp.mul(x2, y2)));
	return Fp.eql(left, right);
}
function edwards(params, extraOpts = {}) {
	const validated = _createCurveFields("edwards", params, extraOpts, extraOpts.FpFnLE);
	const { Fp, Fn } = validated;
	let CURVE = validated.CURVE;
	const { h: cofactor } = CURVE;
	_validateObject(extraOpts, {}, { uvRatio: "function" });
	const MASK = _2n$3 << BigInt(Fn.BYTES * 8) - _1n$2;
	const modP = (n) => Fp.create(n);
	const uvRatio = extraOpts.uvRatio || ((u, v) => {
		try {
			return {
				isValid: true,
				value: Fp.sqrt(Fp.div(u, v))
			};
		} catch (e) {
			return {
				isValid: false,
				value: _0n$2
			};
		}
	});
	if (!isEdValidXY(Fp, CURVE, CURVE.Gx, CURVE.Gy)) throw new Error("bad curve params: generator point");
	/**
	* Asserts coordinate is valid: 0 <= n < MASK.
	* Coordinates >= Fp.ORDER are allowed for zip215.
	*/
	function acoord(title, n, banZero = false) {
		const min = banZero ? _1n$2 : _0n$2;
		aInRange("coordinate " + title, n, min, MASK);
		return n;
	}
	function aextpoint(other) {
		if (!(other instanceof Point)) throw new Error("ExtendedPoint expected");
	}
	const toAffineMemo = memoized((p, iz) => {
		const { X, Y, Z } = p;
		const is0 = p.is0();
		if (iz == null) iz = is0 ? _8n$1 : Fp.inv(Z);
		const x = modP(X * iz);
		const y = modP(Y * iz);
		const zz = Fp.mul(Z, iz);
		if (is0) return {
			x: _0n$2,
			y: _1n$2
		};
		if (zz !== _1n$2) throw new Error("invZ was invalid");
		return {
			x,
			y
		};
	});
	const assertValidMemo = memoized((p) => {
		const { a, d } = CURVE;
		if (p.is0()) throw new Error("bad point: ZERO");
		const { X, Y, Z, T } = p;
		const X2 = modP(X * X);
		const Y2 = modP(Y * Y);
		const Z2 = modP(Z * Z);
		const Z4 = modP(Z2 * Z2);
		const aX2 = modP(X2 * a);
		if (modP(Z2 * modP(aX2 + Y2)) !== modP(Z4 + modP(d * modP(X2 * Y2)))) throw new Error("bad point: equation left != right (1)");
		if (modP(X * Y) !== modP(Z * T)) throw new Error("bad point: equation left != right (2)");
		return true;
	});
	class Point {
		constructor(X, Y, Z, T) {
			this.X = acoord("x", X);
			this.Y = acoord("y", Y);
			this.Z = acoord("z", Z, true);
			this.T = acoord("t", T);
			Object.freeze(this);
		}
		static CURVE() {
			return CURVE;
		}
		static fromAffine(p) {
			if (p instanceof Point) throw new Error("extended point not allowed");
			const { x, y } = p || {};
			acoord("x", x);
			acoord("y", y);
			return new Point(x, y, _1n$2, modP(x * y));
		}
		static fromBytes(bytes, zip215 = false) {
			const len = Fp.BYTES;
			const { a, d } = CURVE;
			bytes = copyBytes(_abytes2(bytes, len, "point"));
			_abool2(zip215, "zip215");
			const normed = copyBytes(bytes);
			const lastByte = bytes[len - 1];
			normed[len - 1] = lastByte & -129;
			const y = bytesToNumberLE(normed);
			aInRange("point.y", y, _0n$2, zip215 ? MASK : Fp.ORDER);
			const y2 = modP(y * y);
			const u = modP(y2 - _1n$2);
			const v = modP(d * y2 - a);
			let { isValid, value: x } = uvRatio(u, v);
			if (!isValid) throw new Error("bad point: invalid y coordinate");
			const isXOdd = (x & _1n$2) === _1n$2;
			const isLastByteOdd = (lastByte & 128) !== 0;
			if (!zip215 && x === _0n$2 && isLastByteOdd) throw new Error("bad point: x=0 and x_0=1");
			if (isLastByteOdd !== isXOdd) x = modP(-x);
			return Point.fromAffine({
				x,
				y
			});
		}
		static fromHex(bytes, zip215 = false) {
			return Point.fromBytes(ensureBytes("point", bytes), zip215);
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(windowSize = 8, isLazy = true) {
			wnaf.createCache(this, windowSize);
			if (!isLazy) this.multiply(_2n$3);
			return this;
		}
		assertValidity() {
			assertValidMemo(this);
		}
		equals(other) {
			aextpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			const X1Z2 = modP(X1 * Z2);
			const X2Z1 = modP(X2 * Z1);
			const Y1Z2 = modP(Y1 * Z2);
			const Y2Z1 = modP(Y2 * Z1);
			return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		negate() {
			return new Point(modP(-this.X), this.Y, this.Z, modP(-this.T));
		}
		double() {
			const { a } = CURVE;
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const A = modP(X1 * X1);
			const B = modP(Y1 * Y1);
			const C = modP(_2n$3 * modP(Z1 * Z1));
			const D = modP(a * A);
			const x1y1 = X1 + Y1;
			const E = modP(modP(x1y1 * x1y1) - A - B);
			const G = D + B;
			const F = G - C;
			const H = D - B;
			const X3 = modP(E * F);
			const Y3 = modP(G * H);
			const T3 = modP(E * H);
			const Z3 = modP(F * G);
			return new Point(X3, Y3, Z3, T3);
		}
		add(other) {
			aextpoint(other);
			const { a, d } = CURVE;
			const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
			const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
			const A = modP(X1 * X2);
			const B = modP(Y1 * Y2);
			const C = modP(T1 * d * T2);
			const D = modP(Z1 * Z2);
			const E = modP((X1 + Y1) * (X2 + Y2) - A - B);
			const F = D - C;
			const G = D + C;
			const H = modP(B - a * A);
			const X3 = modP(E * F);
			const Y3 = modP(G * H);
			const T3 = modP(E * H);
			const Z3 = modP(F * G);
			return new Point(X3, Y3, Z3, T3);
		}
		subtract(other) {
			return this.add(other.negate());
		}
		multiply(scalar) {
			if (!Fn.isValidNot0(scalar)) throw new Error("invalid scalar: expected 1 <= sc < curve.n");
			const { p, f } = wnaf.cached(this, scalar, (p) => normalizeZ(Point, p));
			return normalizeZ(Point, [p, f])[0];
		}
		multiplyUnsafe(scalar, acc = Point.ZERO) {
			if (!Fn.isValid(scalar)) throw new Error("invalid scalar: expected 0 <= sc < curve.n");
			if (scalar === _0n$2) return Point.ZERO;
			if (this.is0() || scalar === _1n$2) return this;
			return wnaf.unsafe(this, scalar, (p) => normalizeZ(Point, p), acc);
		}
		isSmallOrder() {
			return this.multiplyUnsafe(cofactor).is0();
		}
		isTorsionFree() {
			return wnaf.unsafe(this, CURVE.n).is0();
		}
		toAffine(invertedZ) {
			return toAffineMemo(this, invertedZ);
		}
		clearCofactor() {
			if (cofactor === _1n$2) return this;
			return this.multiplyUnsafe(cofactor);
		}
		toBytes() {
			const { x, y } = this.toAffine();
			const bytes = Fp.toBytes(y);
			bytes[bytes.length - 1] |= x & _1n$2 ? 128 : 0;
			return bytes;
		}
		toHex() {
			return bytesToHex(this.toBytes());
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
		get ex() {
			return this.X;
		}
		get ey() {
			return this.Y;
		}
		get ez() {
			return this.Z;
		}
		get et() {
			return this.T;
		}
		static normalizeZ(points) {
			return normalizeZ(Point, points);
		}
		static msm(points, scalars) {
			return pippenger(Point, Fn, points, scalars);
		}
		_setWindowSize(windowSize) {
			this.precompute(windowSize);
		}
		toRawBytes() {
			return this.toBytes();
		}
	}
	Point.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n$2, modP(CURVE.Gx * CURVE.Gy));
	Point.ZERO = new Point(_0n$2, _1n$2, _1n$2, _0n$2);
	Point.Fp = Fp;
	Point.Fn = Fn;
	const wnaf = new wNAF(Point, Fn.BITS);
	Point.BASE.precompute(8);
	return Point;
}
/**
* Base class for prime-order points like Ristretto255 and Decaf448.
* These points eliminate cofactor issues by representing equivalence classes
* of Edwards curve points.
*/
var PrimeEdwardsPoint = class {
	constructor(ep) {
		this.ep = ep;
	}
	static fromBytes(_bytes) {
		notImplemented();
	}
	static fromHex(_hex) {
		notImplemented();
	}
	get x() {
		return this.toAffine().x;
	}
	get y() {
		return this.toAffine().y;
	}
	clearCofactor() {
		return this;
	}
	assertValidity() {
		this.ep.assertValidity();
	}
	toAffine(invertedZ) {
		return this.ep.toAffine(invertedZ);
	}
	toHex() {
		return bytesToHex(this.toBytes());
	}
	toString() {
		return this.toHex();
	}
	isTorsionFree() {
		return true;
	}
	isSmallOrder() {
		return false;
	}
	add(other) {
		this.assertSame(other);
		return this.init(this.ep.add(other.ep));
	}
	subtract(other) {
		this.assertSame(other);
		return this.init(this.ep.subtract(other.ep));
	}
	multiply(scalar) {
		return this.init(this.ep.multiply(scalar));
	}
	multiplyUnsafe(scalar) {
		return this.init(this.ep.multiplyUnsafe(scalar));
	}
	double() {
		return this.init(this.ep.double());
	}
	negate() {
		return this.init(this.ep.negate());
	}
	precompute(windowSize, isLazy) {
		return this.init(this.ep.precompute(windowSize, isLazy));
	}
	/** @deprecated use `toBytes` */
	toRawBytes() {
		return this.toBytes();
	}
};
/**
* Initializes EdDSA signatures over given Edwards curve.
*/
function eddsa(Point, cHash, eddsaOpts = {}) {
	if (typeof cHash !== "function") throw new Error("\"hash\" function param is required");
	_validateObject(eddsaOpts, {}, {
		adjustScalarBytes: "function",
		randomBytes: "function",
		domain: "function",
		prehash: "function",
		mapToCurve: "function"
	});
	const { prehash } = eddsaOpts;
	const { BASE, Fp, Fn } = Point;
	const randomBytes$5 = eddsaOpts.randomBytes || randomBytes;
	const adjustScalarBytes = eddsaOpts.adjustScalarBytes || ((bytes) => bytes);
	const domain = eddsaOpts.domain || ((data, ctx, phflag) => {
		_abool2(phflag, "phflag");
		if (ctx.length || phflag) throw new Error("Contexts/pre-hash are not supported");
		return data;
	});
	function modN_LE(hash) {
		return Fn.create(bytesToNumberLE(hash));
	}
	function getPrivateScalar(key) {
		const len = lengths.secretKey;
		key = ensureBytes("private key", key, len);
		const hashed = ensureBytes("hashed private key", cHash(key), 2 * len);
		const head = adjustScalarBytes(hashed.slice(0, len));
		return {
			head,
			prefix: hashed.slice(len, 2 * len),
			scalar: modN_LE(head)
		};
	}
	/** Convenience method that creates public key from scalar. RFC8032 5.1.5 */
	function getExtendedPublicKey(secretKey) {
		const { head, prefix, scalar } = getPrivateScalar(secretKey);
		const point = BASE.multiply(scalar);
		return {
			head,
			prefix,
			scalar,
			point,
			pointBytes: point.toBytes()
		};
	}
	/** Calculates EdDSA pub key. RFC8032 5.1.5. */
	function getPublicKey(secretKey) {
		return getExtendedPublicKey(secretKey).pointBytes;
	}
	function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
		const msg = concatBytes(...msgs);
		return modN_LE(cHash(domain(msg, ensureBytes("context", context), !!prehash)));
	}
	/** Signs message with privateKey. RFC8032 5.1.6 */
	function sign(msg, secretKey, options = {}) {
		msg = ensureBytes("message", msg);
		if (prehash) msg = prehash(msg);
		const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
		const r = hashDomainToScalar(options.context, prefix, msg);
		const R = BASE.multiply(r).toBytes();
		const k = hashDomainToScalar(options.context, R, pointBytes, msg);
		const s = Fn.create(r + k * scalar);
		if (!Fn.isValid(s)) throw new Error("sign failed: invalid s");
		return _abytes2(concatBytes(R, Fn.toBytes(s)), lengths.signature, "result");
	}
	const verifyOpts = { zip215: true };
	/**
	* Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
	* An extended group equation is checked.
	*/
	function verify(sig, msg, publicKey, options = verifyOpts) {
		const { context, zip215 } = options;
		const len = lengths.signature;
		sig = ensureBytes("signature", sig, len);
		msg = ensureBytes("message", msg);
		publicKey = ensureBytes("publicKey", publicKey, lengths.publicKey);
		if (zip215 !== void 0) _abool2(zip215, "zip215");
		if (prehash) msg = prehash(msg);
		const mid = len / 2;
		const r = sig.subarray(0, mid);
		const s = bytesToNumberLE(sig.subarray(mid, len));
		let A, R, SB;
		try {
			A = Point.fromBytes(publicKey, zip215);
			R = Point.fromBytes(r, zip215);
			SB = BASE.multiplyUnsafe(s);
		} catch (error) {
			return false;
		}
		if (!zip215 && A.isSmallOrder()) return false;
		const k = hashDomainToScalar(context, R.toBytes(), A.toBytes(), msg);
		return R.add(A.multiplyUnsafe(k)).subtract(SB).clearCofactor().is0();
	}
	const _size = Fp.BYTES;
	const lengths = {
		secretKey: _size,
		publicKey: _size,
		signature: 2 * _size,
		seed: _size
	};
	function randomSecretKey(seed = randomBytes$5(lengths.seed)) {
		return _abytes2(seed, lengths.seed, "seed");
	}
	function keygen(seed) {
		const secretKey = utils.randomSecretKey(seed);
		return {
			secretKey,
			publicKey: getPublicKey(secretKey)
		};
	}
	function isValidSecretKey(key) {
		return isBytes(key) && key.length === Fn.BYTES;
	}
	function isValidPublicKey(key, zip215) {
		try {
			return !!Point.fromBytes(key, zip215);
		} catch (error) {
			return false;
		}
	}
	const utils = {
		getExtendedPublicKey,
		randomSecretKey,
		isValidSecretKey,
		isValidPublicKey,
		/**
		* Converts ed public key to x public key. Uses formula:
		* - ed25519:
		*   - `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
		*   - `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
		* - ed448:
		*   - `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
		*   - `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
		*/
		toMontgomery(publicKey) {
			const { y } = Point.fromBytes(publicKey);
			const size = lengths.publicKey;
			const is25519 = size === 32;
			if (!is25519 && size !== 57) throw new Error("only defined for 25519 and 448");
			const u = is25519 ? Fp.div(_1n$2 + y, _1n$2 - y) : Fp.div(y - _1n$2, y + _1n$2);
			return Fp.toBytes(u);
		},
		toMontgomerySecret(secretKey) {
			const size = lengths.secretKey;
			_abytes2(secretKey, size);
			const hashed = cHash(secretKey.subarray(0, size));
			return adjustScalarBytes(hashed).subarray(0, size);
		},
		/** @deprecated */
		randomPrivateKey: randomSecretKey,
		/** @deprecated */
		precompute(windowSize = 8, point = Point.BASE) {
			return point.precompute(windowSize, false);
		}
	};
	return Object.freeze({
		keygen,
		getPublicKey,
		sign,
		verify,
		utils,
		Point,
		lengths
	});
}
function _eddsa_legacy_opts_to_new(c) {
	const CURVE = {
		a: c.a,
		d: c.d,
		p: c.Fp.ORDER,
		n: c.n,
		h: c.h,
		Gx: c.Gx,
		Gy: c.Gy
	};
	const curveOpts = {
		Fp: c.Fp,
		Fn: Field(CURVE.n, c.nBitLength, true),
		uvRatio: c.uvRatio
	};
	const eddsaOpts = {
		randomBytes: c.randomBytes,
		adjustScalarBytes: c.adjustScalarBytes,
		domain: c.domain,
		prehash: c.prehash,
		mapToCurve: c.mapToCurve
	};
	return {
		CURVE,
		curveOpts,
		hash: c.hash,
		eddsaOpts
	};
}
function _eddsa_new_output_to_legacy(c, eddsa) {
	const Point = eddsa.Point;
	return Object.assign({}, eddsa, {
		ExtendedPoint: Point,
		CURVE: c,
		nBitLength: Point.Fn.BITS,
		nByteLength: Point.Fn.BYTES
	});
}
function twistedEdwards(c) {
	const { CURVE, curveOpts, hash, eddsaOpts } = _eddsa_legacy_opts_to_new(c);
	return _eddsa_new_output_to_legacy(c, eddsa(edwards(CURVE, curveOpts), hash, eddsaOpts));
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/ed25519.js
/**
* ed25519 Twisted Edwards curve with following addons:
* - X25519 ECDH
* - Ristretto cofactor elimination
* - Elligator hash-to-group / point indistinguishability
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var _0n$1 = /* @__PURE__ */ BigInt(0);
var _1n$1 = BigInt(1);
var _2n$2 = BigInt(2);
var _5n = BigInt(5);
var _8n = BigInt(8);
var ed25519_CURVE_p = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
var ed25519_CURVE = /* @__PURE__ */ (() => ({
	p: ed25519_CURVE_p,
	n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
	h: _8n,
	a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
	d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
	Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
	Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
}))();
function ed25519_pow_2_252_3(x) {
	const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
	const P = ed25519_CURVE_p;
	const b2 = x * x % P * x % P;
	const b5 = pow2(pow2(b2, _2n$2, P) * b2 % P, _1n$1, P) * x % P;
	const b10 = pow2(b5, _5n, P) * b5 % P;
	const b20 = pow2(b10, _10n, P) * b10 % P;
	const b40 = pow2(b20, _20n, P) * b20 % P;
	const b80 = pow2(b40, _40n, P) * b40 % P;
	return {
		pow_p_5_8: pow2(pow2(pow2(pow2(b80, _80n, P) * b80 % P, _80n, P) * b80 % P, _10n, P) * b10 % P, _2n$2, P) * x % P,
		b2
	};
}
function adjustScalarBytes(bytes) {
	bytes[0] &= 248;
	bytes[31] &= 127;
	bytes[31] |= 64;
	return bytes;
}
var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function uvRatio(u, v) {
	const P = ed25519_CURVE_p;
	const v3 = mod(v * v * v, P);
	const pow = ed25519_pow_2_252_3(u * mod(v3 * v3 * v, P)).pow_p_5_8;
	let x = mod(u * v3 * pow, P);
	const vx2 = mod(v * x * x, P);
	const root1 = x;
	const root2 = mod(x * ED25519_SQRT_M1, P);
	const useRoot1 = vx2 === u;
	const useRoot2 = vx2 === mod(-u, P);
	const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
	if (useRoot1) x = root1;
	if (useRoot2 || noRoot) x = root2;
	if (isNegativeLE(x, P)) x = mod(-x, P);
	return {
		isValid: useRoot1 || useRoot2,
		value: x
	};
}
var Fp = /* @__PURE__ */ (() => Field(ed25519_CURVE.p, { isLE: true }))();
var Fn = /* @__PURE__ */ (() => Field(ed25519_CURVE.n, { isLE: true }))();
var ed25519Defaults = /* @__PURE__ */ (() => ({
	...ed25519_CURVE,
	Fp,
	hash: sha512,
	adjustScalarBytes,
	uvRatio
}))();
/**
* ed25519 curve with EdDSA signatures.
* @example
* import { ed25519 } from '@noble/curves/ed25519';
* const { secretKey, publicKey } = ed25519.keygen();
* const msg = new TextEncoder().encode('hello');
* const sig = ed25519.sign(msg, priv);
* ed25519.verify(sig, msg, pub); // Default mode: follows ZIP215
* ed25519.verify(sig, msg, pub, { zip215: false }); // RFC8032 / FIPS 186-5
*/
var ed25519 = /* @__PURE__ */ (() => twistedEdwards(ed25519Defaults))();
var SQRT_M1 = ED25519_SQRT_M1;
var SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt("25063068953384623474111414158702152701244531502492656460079210482610430750235");
var INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt("54469307008909316920995813868745141605393597292927456921205312896311721017578");
var ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt("1159843021668779879193775521855586647937357759715417654439879720876111806838");
var D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt("40440834346308536858101042469323190826248399146238708352240133220865137265952");
var invertSqrt = (number) => uvRatio(_1n$1, number);
var MAX_255B = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
var bytes255ToNumberLE = (bytes) => ed25519.Point.Fp.create(bytesToNumberLE(bytes) & MAX_255B);
/**
* Computes Elligator map for Ristretto255.
* Described in [RFC9380](https://www.rfc-editor.org/rfc/rfc9380#appendix-B) and on
* the [website](https://ristretto.group/formulas/elligator.html).
*/
function calcElligatorRistrettoMap(r0) {
	const { d } = ed25519_CURVE;
	const P = ed25519_CURVE_p;
	const mod = (n) => Fp.create(n);
	const r = mod(SQRT_M1 * r0 * r0);
	const Ns = mod((r + _1n$1) * ONE_MINUS_D_SQ);
	let c = BigInt(-1);
	const D = mod((c - d * r) * mod(r + d));
	let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D);
	let s_ = mod(s * r0);
	if (!isNegativeLE(s_, P)) s_ = mod(-s_);
	if (!Ns_D_is_sq) s = s_;
	if (!Ns_D_is_sq) c = r;
	const Nt = mod(c * (r - _1n$1) * D_MINUS_ONE_SQ - D);
	const s2 = s * s;
	const W0 = mod((s + s) * D);
	const W1 = mod(Nt * SQRT_AD_MINUS_ONE);
	const W2 = mod(_1n$1 - s2);
	const W3 = mod(_1n$1 + s2);
	return new ed25519.Point(mod(W0 * W3), mod(W2 * W1), mod(W1 * W3), mod(W0 * W2));
}
function ristretto255_map(bytes) {
	abytes(bytes, 64);
	const R1 = calcElligatorRistrettoMap(bytes255ToNumberLE(bytes.subarray(0, 32)));
	const R2 = calcElligatorRistrettoMap(bytes255ToNumberLE(bytes.subarray(32, 64)));
	return new _RistrettoPoint(R1.add(R2));
}
/**
* Wrapper over Edwards Point for ristretto255.
*
* Each ed25519/ExtendedPoint has 8 different equivalent points. This can be
* a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
* Ristretto point operates in X:Y:Z:T extended coordinates like ExtendedPoint,
* but it should work in its own namespace: do not combine those two.
* See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
*/
var _RistrettoPoint = class _RistrettoPoint extends PrimeEdwardsPoint {
	constructor(ep) {
		super(ep);
	}
	static fromAffine(ap) {
		return new _RistrettoPoint(ed25519.Point.fromAffine(ap));
	}
	assertSame(other) {
		if (!(other instanceof _RistrettoPoint)) throw new Error("RistrettoPoint expected");
	}
	init(ep) {
		return new _RistrettoPoint(ep);
	}
	/** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
	static hashToCurve(hex) {
		return ristretto255_map(ensureBytes("ristrettoHash", hex, 64));
	}
	static fromBytes(bytes) {
		abytes(bytes, 32);
		const { a, d } = ed25519_CURVE;
		const P = ed25519_CURVE_p;
		const mod = (n) => Fp.create(n);
		const s = bytes255ToNumberLE(bytes);
		if (!equalBytes(Fp.toBytes(s), bytes) || isNegativeLE(s, P)) throw new Error("invalid ristretto255 encoding 1");
		const s2 = mod(s * s);
		const u1 = mod(_1n$1 + a * s2);
		const u2 = mod(_1n$1 - a * s2);
		const u1_2 = mod(u1 * u1);
		const u2_2 = mod(u2 * u2);
		const v = mod(a * d * u1_2 - u2_2);
		const { isValid, value: I } = invertSqrt(mod(v * u2_2));
		const Dx = mod(I * u2);
		const Dy = mod(I * Dx * v);
		let x = mod((s + s) * Dx);
		if (isNegativeLE(x, P)) x = mod(-x);
		const y = mod(u1 * Dy);
		const t = mod(x * y);
		if (!isValid || isNegativeLE(t, P) || y === _0n$1) throw new Error("invalid ristretto255 encoding 2");
		return new _RistrettoPoint(new ed25519.Point(x, y, _1n$1, t));
	}
	/**
	* Converts ristretto-encoded string to ristretto point.
	* Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
	* @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
	*/
	static fromHex(hex) {
		return _RistrettoPoint.fromBytes(ensureBytes("ristrettoHex", hex, 32));
	}
	static msm(points, scalars) {
		return pippenger(_RistrettoPoint, ed25519.Point.Fn, points, scalars);
	}
	/**
	* Encodes ristretto point to Uint8Array.
	* Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
	*/
	toBytes() {
		let { X, Y, Z, T } = this.ep;
		const P = ed25519_CURVE_p;
		const mod = (n) => Fp.create(n);
		const u1 = mod(mod(Z + Y) * mod(Z - Y));
		const u2 = mod(X * Y);
		const { value: invsqrt } = invertSqrt(mod(u1 * mod(u2 * u2)));
		const D1 = mod(invsqrt * u1);
		const D2 = mod(invsqrt * u2);
		const zInv = mod(D1 * D2 * T);
		let D;
		if (isNegativeLE(T * zInv, P)) {
			let _x = mod(Y * SQRT_M1);
			let _y = mod(X * SQRT_M1);
			X = _x;
			Y = _y;
			D = mod(D1 * INVSQRT_A_MINUS_D);
		} else D = D2;
		if (isNegativeLE(X * zInv, P)) Y = mod(-Y);
		let s = mod((Z - Y) * D);
		if (isNegativeLE(s, P)) s = mod(-s);
		return Fp.toBytes(s);
	}
	/**
	* Compares two Ristretto points.
	* Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
	*/
	equals(other) {
		this.assertSame(other);
		const { X: X1, Y: Y1 } = this.ep;
		const { X: X2, Y: Y2 } = other.ep;
		const mod = (n) => Fp.create(n);
		const one = mod(X1 * Y2) === mod(Y1 * X2);
		const two = mod(Y1 * Y2) === mod(X1 * X2);
		return one || two;
	}
	is0() {
		return this.equals(_RistrettoPoint.ZERO);
	}
};
_RistrettoPoint.BASE = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519.Point.BASE))();
_RistrettoPoint.ZERO = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519.Point.ZERO))();
_RistrettoPoint.Fp = /* @__PURE__ */ (() => Fp)();
_RistrettoPoint.Fn = /* @__PURE__ */ (() => Fn)();
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/hashes/esm/hmac.js
/**
* HMAC: RFC2104 message authentication code.
* @module
*/
var HMAC = class extends Hash {
	constructor(hash, _key) {
		super();
		this.finished = false;
		this.destroyed = false;
		ahash(hash);
		const key = toBytes(_key);
		this.iHash = hash.create();
		if (typeof this.iHash.update !== "function") throw new Error("Expected instance of class which extends utils.Hash");
		this.blockLen = this.iHash.blockLen;
		this.outputLen = this.iHash.outputLen;
		const blockLen = this.blockLen;
		const pad = new Uint8Array(blockLen);
		pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
		for (let i = 0; i < pad.length; i++) pad[i] ^= 54;
		this.iHash.update(pad);
		this.oHash = hash.create();
		for (let i = 0; i < pad.length; i++) pad[i] ^= 106;
		this.oHash.update(pad);
		clean(pad);
	}
	update(buf) {
		aexists(this);
		this.iHash.update(buf);
		return this;
	}
	digestInto(out) {
		aexists(this);
		abytes(out, this.outputLen);
		this.finished = true;
		this.iHash.digestInto(out);
		this.oHash.update(out);
		this.oHash.digestInto(out);
		this.destroy();
	}
	digest() {
		const out = new Uint8Array(this.oHash.outputLen);
		this.digestInto(out);
		return out;
	}
	_cloneInto(to) {
		to || (to = Object.create(Object.getPrototypeOf(this), {}));
		const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
		to = to;
		to.finished = finished;
		to.destroyed = destroyed;
		to.blockLen = blockLen;
		to.outputLen = outputLen;
		to.oHash = oHash._cloneInto(to.oHash);
		to.iHash = iHash._cloneInto(to.iHash);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
	destroy() {
		this.destroyed = true;
		this.oHash.destroy();
		this.iHash.destroy();
	}
};
/**
* HMAC: RFC2104 message authentication code.
* @param hash - function that would be used e.g. sha256
* @param key - message key
* @param message - message data
* @example
* import { hmac } from '@noble/hashes/hmac';
* import { sha256 } from '@noble/hashes/sha2';
* const mac1 = hmac(sha256, 'key', 'message');
*/
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/abstract/weierstrass.js
/**
* Short Weierstrass curve methods. The formula is: y² = x³ + ax + b.
*
* ### Design rationale for types
*
* * Interaction between classes from different curves should fail:
*   `k256.Point.BASE.add(p256.Point.BASE)`
* * For this purpose we want to use `instanceof` operator, which is fast and works during runtime
* * Different calls of `curve()` would return different classes -
*   `curve(params) !== curve(params)`: if somebody decided to monkey-patch their curve,
*   it won't affect others
*
* TypeScript can't infer types for classes created inside a function. Classes is one instance
* of nominative types in TypeScript and interfaces only check for shape, so it's hard to create
* unique type for every function call.
*
* We can use generic types via some param, like curve opts, but that would:
*     1. Enable interaction between `curve(params)` and `curve(params)` (curves of same params)
*     which is hard to debug.
*     2. Params can be generic and we can't enforce them to be constant value:
*     if somebody creates curve from non-constant params,
*     it would be allowed to interact with other curves with non-constant params
*
* @todo https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n$1) / den;
/**
* Splits scalar for GLV endomorphism.
*/
function _splitEndoScalar(k, basis, n) {
	const [[a1, b1], [a2, b2]] = basis;
	const c1 = divNearest(b2 * k, n);
	const c2 = divNearest(-b1 * k, n);
	let k1 = k - c1 * a1 - c2 * a2;
	let k2 = -c1 * b1 - c2 * b2;
	const k1neg = k1 < _0n;
	const k2neg = k2 < _0n;
	if (k1neg) k1 = -k1;
	if (k2neg) k2 = -k2;
	const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n;
	if (k1 < _0n || k1 >= MAX_NUM || k2 < _0n || k2 >= MAX_NUM) throw new Error("splitScalar (endomorphism): failed, k=" + k);
	return {
		k1neg,
		k1,
		k2neg,
		k2
	};
}
function validateSigFormat(format) {
	if (![
		"compact",
		"recovered",
		"der"
	].includes(format)) throw new Error("Signature format must be \"compact\", \"recovered\", or \"der\"");
	return format;
}
function validateSigOpts(opts, def) {
	const optsn = {};
	for (let optName of Object.keys(def)) optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
	_abool2(optsn.lowS, "lowS");
	_abool2(optsn.prehash, "prehash");
	if (optsn.format !== void 0) validateSigFormat(optsn.format);
	return optsn;
}
var DERErr = class extends Error {
	constructor(m = "") {
		super(m);
	}
};
/**
* ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
*
*     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
*
* Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
*/
var DER = {
	Err: DERErr,
	_tlv: {
		encode: (tag, data) => {
			const { Err: E } = DER;
			if (tag < 0 || tag > 256) throw new E("tlv.encode: wrong tag");
			if (data.length & 1) throw new E("tlv.encode: unpadded data");
			const dataLen = data.length / 2;
			const len = numberToHexUnpadded(dataLen);
			if (len.length / 2 & 128) throw new E("tlv.encode: long form length too big");
			const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
			return numberToHexUnpadded(tag) + lenLen + len + data;
		},
		decode(tag, data) {
			const { Err: E } = DER;
			let pos = 0;
			if (tag < 0 || tag > 256) throw new E("tlv.encode: wrong tag");
			if (data.length < 2 || data[pos++] !== tag) throw new E("tlv.decode: wrong tlv");
			const first = data[pos++];
			const isLong = !!(first & 128);
			let length = 0;
			if (!isLong) length = first;
			else {
				const lenLen = first & 127;
				if (!lenLen) throw new E("tlv.decode(long): indefinite length not supported");
				if (lenLen > 4) throw new E("tlv.decode(long): byte length is too big");
				const lengthBytes = data.subarray(pos, pos + lenLen);
				if (lengthBytes.length !== lenLen) throw new E("tlv.decode: length bytes not complete");
				if (lengthBytes[0] === 0) throw new E("tlv.decode(long): zero leftmost byte");
				for (const b of lengthBytes) length = length << 8 | b;
				pos += lenLen;
				if (length < 128) throw new E("tlv.decode(long): not minimal encoding");
			}
			const v = data.subarray(pos, pos + length);
			if (v.length !== length) throw new E("tlv.decode: wrong value length");
			return {
				v,
				l: data.subarray(pos + length)
			};
		}
	},
	_int: {
		encode(num) {
			const { Err: E } = DER;
			if (num < _0n) throw new E("integer: negative integers are not allowed");
			let hex = numberToHexUnpadded(num);
			if (Number.parseInt(hex[0], 16) & 8) hex = "00" + hex;
			if (hex.length & 1) throw new E("unexpected DER parsing assertion: unpadded hex");
			return hex;
		},
		decode(data) {
			const { Err: E } = DER;
			if (data[0] & 128) throw new E("invalid signature integer: negative");
			if (data[0] === 0 && !(data[1] & 128)) throw new E("invalid signature integer: unnecessary leading zero");
			return bytesToNumberBE(data);
		}
	},
	toSig(hex) {
		const { Err: E, _int: int, _tlv: tlv } = DER;
		const data = ensureBytes("signature", hex);
		const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
		if (seqLeftBytes.length) throw new E("invalid signature: left bytes after parsing");
		const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
		const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
		if (sLeftBytes.length) throw new E("invalid signature: left bytes after parsing");
		return {
			r: int.decode(rBytes),
			s: int.decode(sBytes)
		};
	},
	hexFromSig(sig) {
		const { _tlv: tlv, _int: int } = DER;
		const seq = tlv.encode(2, int.encode(sig.r)) + tlv.encode(2, int.encode(sig.s));
		return tlv.encode(48, seq);
	}
};
var _0n = BigInt(0);
var _1n = BigInt(1);
var _2n$1 = BigInt(2);
var _3n = BigInt(3);
var _4n = BigInt(4);
function _normFnElement(Fn, key) {
	const { BYTES: expected } = Fn;
	let num;
	if (typeof key === "bigint") num = key;
	else {
		let bytes = ensureBytes("private key", key);
		try {
			num = Fn.fromBytes(bytes);
		} catch (error) {
			throw new Error(`invalid private key: expected ui8a of size ${expected}, got ${typeof key}`);
		}
	}
	if (!Fn.isValidNot0(num)) throw new Error("invalid private key: out of range [1..N-1]");
	return num;
}
/**
* Creates weierstrass Point constructor, based on specified curve options.
*
* @example
```js
const opts = {
p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
h: BigInt(1),
a: BigInt('0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc'),
b: BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'),
Gx: BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
Gy: BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'),
};
const p256_Point = weierstrass(opts);
```
*/
function weierstrassN(params, extraOpts = {}) {
	const validated = _createCurveFields("weierstrass", params, extraOpts);
	const { Fp, Fn } = validated;
	let CURVE = validated.CURVE;
	const { h: cofactor, n: CURVE_ORDER } = CURVE;
	_validateObject(extraOpts, {}, {
		allowInfinityPoint: "boolean",
		clearCofactor: "function",
		isTorsionFree: "function",
		fromBytes: "function",
		toBytes: "function",
		endo: "object",
		wrapPrivateKey: "boolean"
	});
	const { endo } = extraOpts;
	if (endo) {
		if (!Fp.is0(CURVE.a) || typeof endo.beta !== "bigint" || !Array.isArray(endo.basises)) throw new Error("invalid endo: expected \"beta\": bigint and \"basises\": array");
	}
	const lengths = getWLengths(Fp, Fn);
	function assertCompressionIsSupported() {
		if (!Fp.isOdd) throw new Error("compression is not supported: Field does not have .isOdd()");
	}
	function pointToBytes(_c, point, isCompressed) {
		const { x, y } = point.toAffine();
		const bx = Fp.toBytes(x);
		_abool2(isCompressed, "isCompressed");
		if (isCompressed) {
			assertCompressionIsSupported();
			return concatBytes(pprefix(!Fp.isOdd(y)), bx);
		} else return concatBytes(Uint8Array.of(4), bx, Fp.toBytes(y));
	}
	function pointFromBytes(bytes) {
		_abytes2(bytes, void 0, "Point");
		const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
		const length = bytes.length;
		const head = bytes[0];
		const tail = bytes.subarray(1);
		if (length === comp && (head === 2 || head === 3)) {
			const x = Fp.fromBytes(tail);
			if (!Fp.isValid(x)) throw new Error("bad point: is not on curve, wrong x");
			const y2 = weierstrassEquation(x);
			let y;
			try {
				y = Fp.sqrt(y2);
			} catch (sqrtError) {
				const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
				throw new Error("bad point: is not on curve, sqrt error" + err);
			}
			assertCompressionIsSupported();
			const isYOdd = Fp.isOdd(y);
			if ((head & 1) === 1 !== isYOdd) y = Fp.neg(y);
			return {
				x,
				y
			};
		} else if (length === uncomp && head === 4) {
			const L = Fp.BYTES;
			const x = Fp.fromBytes(tail.subarray(0, L));
			const y = Fp.fromBytes(tail.subarray(L, L * 2));
			if (!isValidXY(x, y)) throw new Error("bad point: is not on curve");
			return {
				x,
				y
			};
		} else throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
	}
	const encodePoint = extraOpts.toBytes || pointToBytes;
	const decodePoint = extraOpts.fromBytes || pointFromBytes;
	function weierstrassEquation(x) {
		const x2 = Fp.sqr(x);
		const x3 = Fp.mul(x2, x);
		return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
	}
	/** Checks whether equation holds for given x, y: y² == x³ + ax + b */
	function isValidXY(x, y) {
		const left = Fp.sqr(y);
		const right = weierstrassEquation(x);
		return Fp.eql(left, right);
	}
	if (!isValidXY(CURVE.Gx, CURVE.Gy)) throw new Error("bad curve params: generator point");
	const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n), _4n);
	const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
	if (Fp.is0(Fp.add(_4a3, _27b2))) throw new Error("bad curve params: a or b");
	/** Asserts coordinate is valid: 0 <= n < Fp.ORDER. */
	function acoord(title, n, banZero = false) {
		if (!Fp.isValid(n) || banZero && Fp.is0(n)) throw new Error(`bad point coordinate ${title}`);
		return n;
	}
	function aprjpoint(other) {
		if (!(other instanceof Point)) throw new Error("ProjectivePoint expected");
	}
	function splitEndoScalarN(k) {
		if (!endo || !endo.basises) throw new Error("no endo");
		return _splitEndoScalar(k, endo.basises, Fn.ORDER);
	}
	const toAffineMemo = memoized((p, iz) => {
		const { X, Y, Z } = p;
		if (Fp.eql(Z, Fp.ONE)) return {
			x: X,
			y: Y
		};
		const is0 = p.is0();
		if (iz == null) iz = is0 ? Fp.ONE : Fp.inv(Z);
		const x = Fp.mul(X, iz);
		const y = Fp.mul(Y, iz);
		const zz = Fp.mul(Z, iz);
		if (is0) return {
			x: Fp.ZERO,
			y: Fp.ZERO
		};
		if (!Fp.eql(zz, Fp.ONE)) throw new Error("invZ was invalid");
		return {
			x,
			y
		};
	});
	const assertValidMemo = memoized((p) => {
		if (p.is0()) {
			if (extraOpts.allowInfinityPoint && !Fp.is0(p.Y)) return;
			throw new Error("bad point: ZERO");
		}
		const { x, y } = p.toAffine();
		if (!Fp.isValid(x) || !Fp.isValid(y)) throw new Error("bad point: x or y not field elements");
		if (!isValidXY(x, y)) throw new Error("bad point: equation left != right");
		if (!p.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
		return true;
	});
	function finishEndo(endoBeta, k1p, k2p, k1neg, k2neg) {
		k2p = new Point(Fp.mul(k2p.X, endoBeta), k2p.Y, k2p.Z);
		k1p = negateCt(k1neg, k1p);
		k2p = negateCt(k2neg, k2p);
		return k1p.add(k2p);
	}
	/**
	* Projective Point works in 3d / projective (homogeneous) coordinates:(X, Y, Z) ∋ (x=X/Z, y=Y/Z).
	* Default Point works in 2d / affine coordinates: (x, y).
	* We're doing calculations in projective, because its operations don't require costly inversion.
	*/
	class Point {
		/** Does NOT validate if the point is valid. Use `.assertValidity()`. */
		constructor(X, Y, Z) {
			this.X = acoord("x", X);
			this.Y = acoord("y", Y, true);
			this.Z = acoord("z", Z);
			Object.freeze(this);
		}
		static CURVE() {
			return CURVE;
		}
		/** Does NOT validate if the point is valid. Use `.assertValidity()`. */
		static fromAffine(p) {
			const { x, y } = p || {};
			if (!p || !Fp.isValid(x) || !Fp.isValid(y)) throw new Error("invalid affine point");
			if (p instanceof Point) throw new Error("projective point not allowed");
			if (Fp.is0(x) && Fp.is0(y)) return Point.ZERO;
			return new Point(x, y, Fp.ONE);
		}
		static fromBytes(bytes) {
			const P = Point.fromAffine(decodePoint(_abytes2(bytes, void 0, "point")));
			P.assertValidity();
			return P;
		}
		static fromHex(hex) {
			return Point.fromBytes(ensureBytes("pointHex", hex));
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		/**
		*
		* @param windowSize
		* @param isLazy true will defer table computation until the first multiplication
		* @returns
		*/
		precompute(windowSize = 8, isLazy = true) {
			wnaf.createCache(this, windowSize);
			if (!isLazy) this.multiply(_3n);
			return this;
		}
		/** A point on curve is valid if it conforms to equation. */
		assertValidity() {
			assertValidMemo(this);
		}
		hasEvenY() {
			const { y } = this.toAffine();
			if (!Fp.isOdd) throw new Error("Field doesn't support isOdd");
			return !Fp.isOdd(y);
		}
		/** Compare one point to another. */
		equals(other) {
			aprjpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
			const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
			return U1 && U2;
		}
		/** Flips point to one corresponding to (x, -y) in Affine coordinates. */
		negate() {
			return new Point(this.X, Fp.neg(this.Y), this.Z);
		}
		double() {
			const { a, b } = CURVE;
			const b3 = Fp.mul(b, _3n);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
			let t0 = Fp.mul(X1, X1);
			let t1 = Fp.mul(Y1, Y1);
			let t2 = Fp.mul(Z1, Z1);
			let t3 = Fp.mul(X1, Y1);
			t3 = Fp.add(t3, t3);
			Z3 = Fp.mul(X1, Z1);
			Z3 = Fp.add(Z3, Z3);
			X3 = Fp.mul(a, Z3);
			Y3 = Fp.mul(b3, t2);
			Y3 = Fp.add(X3, Y3);
			X3 = Fp.sub(t1, Y3);
			Y3 = Fp.add(t1, Y3);
			Y3 = Fp.mul(X3, Y3);
			X3 = Fp.mul(t3, X3);
			Z3 = Fp.mul(b3, Z3);
			t2 = Fp.mul(a, t2);
			t3 = Fp.sub(t0, t2);
			t3 = Fp.mul(a, t3);
			t3 = Fp.add(t3, Z3);
			Z3 = Fp.add(t0, t0);
			t0 = Fp.add(Z3, t0);
			t0 = Fp.add(t0, t2);
			t0 = Fp.mul(t0, t3);
			Y3 = Fp.add(Y3, t0);
			t2 = Fp.mul(Y1, Z1);
			t2 = Fp.add(t2, t2);
			t0 = Fp.mul(t2, t3);
			X3 = Fp.sub(X3, t0);
			Z3 = Fp.mul(t2, t1);
			Z3 = Fp.add(Z3, Z3);
			Z3 = Fp.add(Z3, Z3);
			return new Point(X3, Y3, Z3);
		}
		add(other) {
			aprjpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
			const a = CURVE.a;
			const b3 = Fp.mul(CURVE.b, _3n);
			let t0 = Fp.mul(X1, X2);
			let t1 = Fp.mul(Y1, Y2);
			let t2 = Fp.mul(Z1, Z2);
			let t3 = Fp.add(X1, Y1);
			let t4 = Fp.add(X2, Y2);
			t3 = Fp.mul(t3, t4);
			t4 = Fp.add(t0, t1);
			t3 = Fp.sub(t3, t4);
			t4 = Fp.add(X1, Z1);
			let t5 = Fp.add(X2, Z2);
			t4 = Fp.mul(t4, t5);
			t5 = Fp.add(t0, t2);
			t4 = Fp.sub(t4, t5);
			t5 = Fp.add(Y1, Z1);
			X3 = Fp.add(Y2, Z2);
			t5 = Fp.mul(t5, X3);
			X3 = Fp.add(t1, t2);
			t5 = Fp.sub(t5, X3);
			Z3 = Fp.mul(a, t4);
			X3 = Fp.mul(b3, t2);
			Z3 = Fp.add(X3, Z3);
			X3 = Fp.sub(t1, Z3);
			Z3 = Fp.add(t1, Z3);
			Y3 = Fp.mul(X3, Z3);
			t1 = Fp.add(t0, t0);
			t1 = Fp.add(t1, t0);
			t2 = Fp.mul(a, t2);
			t4 = Fp.mul(b3, t4);
			t1 = Fp.add(t1, t2);
			t2 = Fp.sub(t0, t2);
			t2 = Fp.mul(a, t2);
			t4 = Fp.add(t4, t2);
			t0 = Fp.mul(t1, t4);
			Y3 = Fp.add(Y3, t0);
			t0 = Fp.mul(t5, t4);
			X3 = Fp.mul(t3, X3);
			X3 = Fp.sub(X3, t0);
			t0 = Fp.mul(t3, t1);
			Z3 = Fp.mul(t5, Z3);
			Z3 = Fp.add(Z3, t0);
			return new Point(X3, Y3, Z3);
		}
		subtract(other) {
			return this.add(other.negate());
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		/**
		* Constant time multiplication.
		* Uses wNAF method. Windowed method may be 10% faster,
		* but takes 2x longer to generate and consumes 2x memory.
		* Uses precomputes when available.
		* Uses endomorphism for Koblitz curves.
		* @param scalar by which the point would be multiplied
		* @returns New point
		*/
		multiply(scalar) {
			const { endo } = extraOpts;
			if (!Fn.isValidNot0(scalar)) throw new Error("invalid scalar: out of range");
			let point, fake;
			const mul = (n) => wnaf.cached(this, n, (p) => normalizeZ(Point, p));
			/** See docs for {@link EndomorphismOpts} */
			if (endo) {
				const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(scalar);
				const { p: k1p, f: k1f } = mul(k1);
				const { p: k2p, f: k2f } = mul(k2);
				fake = k1f.add(k2f);
				point = finishEndo(endo.beta, k1p, k2p, k1neg, k2neg);
			} else {
				const { p, f } = mul(scalar);
				point = p;
				fake = f;
			}
			return normalizeZ(Point, [point, fake])[0];
		}
		/**
		* Non-constant-time multiplication. Uses double-and-add algorithm.
		* It's faster, but should only be used when you don't care about
		* an exposed secret key e.g. sig verification, which works over *public* keys.
		*/
		multiplyUnsafe(sc) {
			const { endo } = extraOpts;
			const p = this;
			if (!Fn.isValid(sc)) throw new Error("invalid scalar: out of range");
			if (sc === _0n || p.is0()) return Point.ZERO;
			if (sc === _1n) return p;
			if (wnaf.hasCache(this)) return this.multiply(sc);
			if (endo) {
				const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(sc);
				const { p1, p2 } = mulEndoUnsafe(Point, p, k1, k2);
				return finishEndo(endo.beta, p1, p2, k1neg, k2neg);
			} else return wnaf.unsafe(p, sc);
		}
		multiplyAndAddUnsafe(Q, a, b) {
			const sum = this.multiplyUnsafe(a).add(Q.multiplyUnsafe(b));
			return sum.is0() ? void 0 : sum;
		}
		/**
		* Converts Projective point to affine (x, y) coordinates.
		* @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
		*/
		toAffine(invertedZ) {
			return toAffineMemo(this, invertedZ);
		}
		/**
		* Checks whether Point is free of torsion elements (is in prime subgroup).
		* Always torsion-free for cofactor=1 curves.
		*/
		isTorsionFree() {
			const { isTorsionFree } = extraOpts;
			if (cofactor === _1n) return true;
			if (isTorsionFree) return isTorsionFree(Point, this);
			return wnaf.unsafe(this, CURVE_ORDER).is0();
		}
		clearCofactor() {
			const { clearCofactor } = extraOpts;
			if (cofactor === _1n) return this;
			if (clearCofactor) return clearCofactor(Point, this);
			return this.multiplyUnsafe(cofactor);
		}
		isSmallOrder() {
			return this.multiplyUnsafe(cofactor).is0();
		}
		toBytes(isCompressed = true) {
			_abool2(isCompressed, "isCompressed");
			this.assertValidity();
			return encodePoint(Point, this, isCompressed);
		}
		toHex(isCompressed = true) {
			return bytesToHex(this.toBytes(isCompressed));
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
		get px() {
			return this.X;
		}
		get py() {
			return this.X;
		}
		get pz() {
			return this.Z;
		}
		toRawBytes(isCompressed = true) {
			return this.toBytes(isCompressed);
		}
		_setWindowSize(windowSize) {
			this.precompute(windowSize);
		}
		static normalizeZ(points) {
			return normalizeZ(Point, points);
		}
		static msm(points, scalars) {
			return pippenger(Point, Fn, points, scalars);
		}
		static fromPrivateKey(privateKey) {
			return Point.BASE.multiply(_normFnElement(Fn, privateKey));
		}
	}
	Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
	Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
	Point.Fp = Fp;
	Point.Fn = Fn;
	const bits = Fn.BITS;
	const wnaf = new wNAF(Point, extraOpts.endo ? Math.ceil(bits / 2) : bits);
	Point.BASE.precompute(8);
	return Point;
}
function pprefix(hasEvenY) {
	return Uint8Array.of(hasEvenY ? 2 : 3);
}
function getWLengths(Fp, Fn) {
	return {
		secretKey: Fn.BYTES,
		publicKey: 1 + Fp.BYTES,
		publicKeyUncompressed: 1 + 2 * Fp.BYTES,
		publicKeyHasPrefix: true,
		signature: 2 * Fn.BYTES
	};
}
/**
* Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
* This helper ensures no signature functionality is present. Less code, smaller bundle size.
*/
function ecdh(Point, ecdhOpts = {}) {
	const { Fn } = Point;
	const randomBytes_ = ecdhOpts.randomBytes || randomBytes;
	const lengths = Object.assign(getWLengths(Point.Fp, Fn), { seed: getMinHashLength(Fn.ORDER) });
	function isValidSecretKey(secretKey) {
		try {
			return !!_normFnElement(Fn, secretKey);
		} catch (error) {
			return false;
		}
	}
	function isValidPublicKey(publicKey, isCompressed) {
		const { publicKey: comp, publicKeyUncompressed } = lengths;
		try {
			const l = publicKey.length;
			if (isCompressed === true && l !== comp) return false;
			if (isCompressed === false && l !== publicKeyUncompressed) return false;
			return !!Point.fromBytes(publicKey);
		} catch (error) {
			return false;
		}
	}
	/**
	* Produces cryptographically secure secret key from random of size
	* (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
	*/
	function randomSecretKey(seed = randomBytes_(lengths.seed)) {
		return mapHashToField(_abytes2(seed, lengths.seed, "seed"), Fn.ORDER);
	}
	/**
	* Computes public key for a secret key. Checks for validity of the secret key.
	* @param isCompressed whether to return compact (default), or full key
	* @returns Public key, full when isCompressed=false; short when isCompressed=true
	*/
	function getPublicKey(secretKey, isCompressed = true) {
		return Point.BASE.multiply(_normFnElement(Fn, secretKey)).toBytes(isCompressed);
	}
	function keygen(seed) {
		const secretKey = randomSecretKey(seed);
		return {
			secretKey,
			publicKey: getPublicKey(secretKey)
		};
	}
	/**
	* Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
	*/
	function isProbPub(item) {
		if (typeof item === "bigint") return false;
		if (item instanceof Point) return true;
		const { secretKey, publicKey, publicKeyUncompressed } = lengths;
		if (Fn.allowedLengths || secretKey === publicKey) return void 0;
		const l = ensureBytes("key", item).length;
		return l === publicKey || l === publicKeyUncompressed;
	}
	/**
	* ECDH (Elliptic Curve Diffie Hellman).
	* Computes shared public key from secret key A and public key B.
	* Checks: 1) secret key validity 2) shared key is on-curve.
	* Does NOT hash the result.
	* @param isCompressed whether to return compact (default), or full key
	* @returns shared public key
	*/
	function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
		if (isProbPub(secretKeyA) === true) throw new Error("first arg must be private key");
		if (isProbPub(publicKeyB) === false) throw new Error("second arg must be public key");
		const s = _normFnElement(Fn, secretKeyA);
		return Point.fromHex(publicKeyB).multiply(s).toBytes(isCompressed);
	}
	return Object.freeze({
		getPublicKey,
		getSharedSecret,
		keygen,
		Point,
		utils: {
			isValidSecretKey,
			isValidPublicKey,
			randomSecretKey,
			isValidPrivateKey: isValidSecretKey,
			randomPrivateKey: randomSecretKey,
			normPrivateKeyToScalar: (key) => _normFnElement(Fn, key),
			precompute(windowSize = 8, point = Point.BASE) {
				return point.precompute(windowSize, false);
			}
		},
		lengths
	});
}
/**
* Creates ECDSA signing interface for given elliptic curve `Point` and `hash` function.
* We need `hash` for 2 features:
* 1. Message prehash-ing. NOT used if `sign` / `verify` are called with `prehash: false`
* 2. k generation in `sign`, using HMAC-drbg(hash)
*
* ECDSAOpts are only rarely needed.
*
* @example
* ```js
* const p256_Point = weierstrass(...);
* const p256_sha256 = ecdsa(p256_Point, sha256);
* const p256_sha224 = ecdsa(p256_Point, sha224);
* const p256_sha224_r = ecdsa(p256_Point, sha224, { randomBytes: (length) => { ... } });
* ```
*/
function ecdsa(Point, hash, ecdsaOpts = {}) {
	ahash(hash);
	_validateObject(ecdsaOpts, {}, {
		hmac: "function",
		lowS: "boolean",
		randomBytes: "function",
		bits2int: "function",
		bits2int_modN: "function"
	});
	const randomBytes$4 = ecdsaOpts.randomBytes || randomBytes;
	const hmac$2 = ecdsaOpts.hmac || ((key, ...msgs) => hmac(hash, key, concatBytes(...msgs)));
	const { Fp, Fn } = Point;
	const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
	const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, ecdsaOpts);
	const defaultSigOpts = {
		prehash: false,
		lowS: typeof ecdsaOpts.lowS === "boolean" ? ecdsaOpts.lowS : false,
		format: void 0,
		extraEntropy: false
	};
	const defaultSigOpts_format = "compact";
	function isBiggerThanHalfOrder(number) {
		return number > CURVE_ORDER >> _1n;
	}
	function validateRS(title, num) {
		if (!Fn.isValidNot0(num)) throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
		return num;
	}
	function validateSigLength(bytes, format) {
		validateSigFormat(format);
		const size = lengths.signature;
		return _abytes2(bytes, format === "compact" ? size : format === "recovered" ? size + 1 : void 0, `${format} signature`);
	}
	/**
	* ECDSA signature with its (r, s) properties. Supports compact, recovered & DER representations.
	*/
	class Signature {
		constructor(r, s, recovery) {
			this.r = validateRS("r", r);
			this.s = validateRS("s", s);
			if (recovery != null) this.recovery = recovery;
			Object.freeze(this);
		}
		static fromBytes(bytes, format = defaultSigOpts_format) {
			validateSigLength(bytes, format);
			let recid;
			if (format === "der") {
				const { r, s } = DER.toSig(_abytes2(bytes));
				return new Signature(r, s);
			}
			if (format === "recovered") {
				recid = bytes[0];
				format = "compact";
				bytes = bytes.subarray(1);
			}
			const L = Fn.BYTES;
			const r = bytes.subarray(0, L);
			const s = bytes.subarray(L, L * 2);
			return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
		}
		static fromHex(hex, format) {
			return this.fromBytes(hexToBytes(hex), format);
		}
		addRecoveryBit(recovery) {
			return new Signature(this.r, this.s, recovery);
		}
		recoverPublicKey(messageHash) {
			const FIELD_ORDER = Fp.ORDER;
			const { r, s, recovery: rec } = this;
			if (rec == null || ![
				0,
				1,
				2,
				3
			].includes(rec)) throw new Error("recovery id invalid");
			if (CURVE_ORDER * _2n$1 < FIELD_ORDER && rec > 1) throw new Error("recovery id is ambiguous for h>1 curve");
			const radj = rec === 2 || rec === 3 ? r + CURVE_ORDER : r;
			if (!Fp.isValid(radj)) throw new Error("recovery id 2 or 3 invalid");
			const x = Fp.toBytes(radj);
			const R = Point.fromBytes(concatBytes(pprefix((rec & 1) === 0), x));
			const ir = Fn.inv(radj);
			const h = bits2int_modN(ensureBytes("msgHash", messageHash));
			const u1 = Fn.create(-h * ir);
			const u2 = Fn.create(s * ir);
			const Q = Point.BASE.multiplyUnsafe(u1).add(R.multiplyUnsafe(u2));
			if (Q.is0()) throw new Error("point at infinify");
			Q.assertValidity();
			return Q;
		}
		hasHighS() {
			return isBiggerThanHalfOrder(this.s);
		}
		toBytes(format = defaultSigOpts_format) {
			validateSigFormat(format);
			if (format === "der") return hexToBytes(DER.hexFromSig(this));
			const r = Fn.toBytes(this.r);
			const s = Fn.toBytes(this.s);
			if (format === "recovered") {
				if (this.recovery == null) throw new Error("recovery bit must be present");
				return concatBytes(Uint8Array.of(this.recovery), r, s);
			}
			return concatBytes(r, s);
		}
		toHex(format) {
			return bytesToHex(this.toBytes(format));
		}
		assertValidity() {}
		static fromCompact(hex) {
			return Signature.fromBytes(ensureBytes("sig", hex), "compact");
		}
		static fromDER(hex) {
			return Signature.fromBytes(ensureBytes("sig", hex), "der");
		}
		normalizeS() {
			return this.hasHighS() ? new Signature(this.r, Fn.neg(this.s), this.recovery) : this;
		}
		toDERRawBytes() {
			return this.toBytes("der");
		}
		toDERHex() {
			return bytesToHex(this.toBytes("der"));
		}
		toCompactRawBytes() {
			return this.toBytes("compact");
		}
		toCompactHex() {
			return bytesToHex(this.toBytes("compact"));
		}
	}
	const bits2int = ecdsaOpts.bits2int || function bits2int_def(bytes) {
		if (bytes.length > 8192) throw new Error("input is too large");
		const num = bytesToNumberBE(bytes);
		const delta = bytes.length * 8 - fnBits;
		return delta > 0 ? num >> BigInt(delta) : num;
	};
	const bits2int_modN = ecdsaOpts.bits2int_modN || function bits2int_modN_def(bytes) {
		return Fn.create(bits2int(bytes));
	};
	const ORDER_MASK = bitMask(fnBits);
	/** Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`. */
	function int2octets(num) {
		aInRange("num < 2^" + fnBits, num, _0n, ORDER_MASK);
		return Fn.toBytes(num);
	}
	function validateMsgAndHash(message, prehash) {
		_abytes2(message, void 0, "message");
		return prehash ? _abytes2(hash(message), void 0, "prehashed message") : message;
	}
	/**
	* Steps A, D of RFC6979 3.2.
	* Creates RFC6979 seed; converts msg/privKey to numbers.
	* Used only in sign, not in verify.
	*
	* Warning: we cannot assume here that message has same amount of bytes as curve order,
	* this will be invalid at least for P521. Also it can be bigger for P224 + SHA256.
	*/
	function prepSig(message, privateKey, opts) {
		if (["recovered", "canonical"].some((k) => k in opts)) throw new Error("sign() legacy options not supported");
		const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
		message = validateMsgAndHash(message, prehash);
		const h1int = bits2int_modN(message);
		const d = _normFnElement(Fn, privateKey);
		const seedArgs = [int2octets(d), int2octets(h1int)];
		if (extraEntropy != null && extraEntropy !== false) {
			const e = extraEntropy === true ? randomBytes$4(lengths.secretKey) : extraEntropy;
			seedArgs.push(ensureBytes("extraEntropy", e));
		}
		const seed = concatBytes(...seedArgs);
		const m = h1int;
		function k2sig(kBytes) {
			const k = bits2int(kBytes);
			if (!Fn.isValidNot0(k)) return;
			const ik = Fn.inv(k);
			const q = Point.BASE.multiply(k).toAffine();
			const r = Fn.create(q.x);
			if (r === _0n) return;
			const s = Fn.create(ik * Fn.create(m + r * d));
			if (s === _0n) return;
			let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n);
			let normS = s;
			if (lowS && isBiggerThanHalfOrder(s)) {
				normS = Fn.neg(s);
				recovery ^= 1;
			}
			return new Signature(r, normS, recovery);
		}
		return {
			seed,
			k2sig
		};
	}
	/**
	* Signs message hash with a secret key.
	*
	* ```
	* sign(m, d) where
	*   k = rfc6979_hmac_drbg(m, d)
	*   (x, y) = G × k
	*   r = x mod n
	*   s = (m + dr) / k mod n
	* ```
	*/
	function sign(message, secretKey, opts = {}) {
		message = ensureBytes("message", message);
		const { seed, k2sig } = prepSig(message, secretKey, opts);
		return createHmacDrbg(hash.outputLen, Fn.BYTES, hmac$2)(seed, k2sig);
	}
	function tryParsingSig(sg) {
		let sig = void 0;
		const isHex = typeof sg === "string" || isBytes(sg);
		const isObj = !isHex && sg !== null && typeof sg === "object" && typeof sg.r === "bigint" && typeof sg.s === "bigint";
		if (!isHex && !isObj) throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
		if (isObj) sig = new Signature(sg.r, sg.s);
		else if (isHex) {
			try {
				sig = Signature.fromBytes(ensureBytes("sig", sg), "der");
			} catch (derError) {
				if (!(derError instanceof DER.Err)) throw derError;
			}
			if (!sig) try {
				sig = Signature.fromBytes(ensureBytes("sig", sg), "compact");
			} catch (error) {
				return false;
			}
		}
		if (!sig) return false;
		return sig;
	}
	/**
	* Verifies a signature against message and public key.
	* Rejects lowS signatures by default: see {@link ECDSAVerifyOpts}.
	* Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
	*
	* ```
	* verify(r, s, h, P) where
	*   u1 = hs^-1 mod n
	*   u2 = rs^-1 mod n
	*   R = u1⋅G + u2⋅P
	*   mod(R.x, n) == r
	* ```
	*/
	function verify(signature, message, publicKey, opts = {}) {
		const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
		publicKey = ensureBytes("publicKey", publicKey);
		message = validateMsgAndHash(ensureBytes("message", message), prehash);
		if ("strict" in opts) throw new Error("options.strict was renamed to lowS");
		const sig = format === void 0 ? tryParsingSig(signature) : Signature.fromBytes(ensureBytes("sig", signature), format);
		if (sig === false) return false;
		try {
			const P = Point.fromBytes(publicKey);
			if (lowS && sig.hasHighS()) return false;
			const { r, s } = sig;
			const h = bits2int_modN(message);
			const is = Fn.inv(s);
			const u1 = Fn.create(h * is);
			const u2 = Fn.create(r * is);
			const R = Point.BASE.multiplyUnsafe(u1).add(P.multiplyUnsafe(u2));
			if (R.is0()) return false;
			return Fn.create(R.x) === r;
		} catch (e) {
			return false;
		}
	}
	function recoverPublicKey(signature, message, opts = {}) {
		const { prehash } = validateSigOpts(opts, defaultSigOpts);
		message = validateMsgAndHash(message, prehash);
		return Signature.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
	}
	return Object.freeze({
		keygen,
		getPublicKey,
		getSharedSecret,
		utils,
		lengths,
		Point,
		sign,
		verify,
		recoverPublicKey,
		Signature,
		hash
	});
}
function _weierstrass_legacy_opts_to_new(c) {
	const CURVE = {
		a: c.a,
		b: c.b,
		p: c.Fp.ORDER,
		n: c.n,
		h: c.h,
		Gx: c.Gx,
		Gy: c.Gy
	};
	const Fp = c.Fp;
	let allowedLengths = c.allowedPrivateKeyLengths ? Array.from(new Set(c.allowedPrivateKeyLengths.map((l) => Math.ceil(l / 2)))) : void 0;
	return {
		CURVE,
		curveOpts: {
			Fp,
			Fn: Field(CURVE.n, {
				BITS: c.nBitLength,
				allowedLengths,
				modFromBytes: c.wrapPrivateKey
			}),
			allowInfinityPoint: c.allowInfinityPoint,
			endo: c.endo,
			isTorsionFree: c.isTorsionFree,
			clearCofactor: c.clearCofactor,
			fromBytes: c.fromBytes,
			toBytes: c.toBytes
		}
	};
}
function _ecdsa_legacy_opts_to_new(c) {
	const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
	const ecdsaOpts = {
		hmac: c.hmac,
		randomBytes: c.randomBytes,
		lowS: c.lowS,
		bits2int: c.bits2int,
		bits2int_modN: c.bits2int_modN
	};
	return {
		CURVE,
		curveOpts,
		hash: c.hash,
		ecdsaOpts
	};
}
function _ecdsa_new_output_to_legacy(c, _ecdsa) {
	const Point = _ecdsa.Point;
	return Object.assign({}, _ecdsa, {
		ProjectivePoint: Point,
		CURVE: Object.assign({}, c, nLength(Point.Fn.ORDER, Point.Fn.BITS))
	});
}
function weierstrass(c) {
	const { CURVE, curveOpts, hash, ecdsaOpts } = _ecdsa_legacy_opts_to_new(c);
	return _ecdsa_new_output_to_legacy(c, ecdsa(weierstrassN(CURVE, curveOpts), hash, ecdsaOpts));
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/_shortw_utils.js
/**
* Utilities for short weierstrass curves, combined with noble-hashes.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/** @deprecated use new `weierstrass()` and `ecdsa()` methods */
function createCurve(curveDef, defHash) {
	const create = (hash) => weierstrass({
		...curveDef,
		hash
	});
	return {
		...create(defHash),
		create
	};
}
//#endregion
//#region node_modules/@solana/web3.js/node_modules/@noble/curves/esm/secp256k1.js
/**
* SECG secp256k1. See [pdf](https://www.secg.org/sec2-v2.pdf).
*
* Belongs to Koblitz curves: it has efficiently-computable GLV endomorphism ψ,
* check out {@link EndomorphismOpts}. Seems to be rigid (not backdoored).
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var secp256k1_CURVE = {
	p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
	n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
	h: BigInt(1),
	a: BigInt(0),
	b: BigInt(7),
	Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
	Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
};
var secp256k1_ENDO = {
	beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
	basises: [[BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")], [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]]
};
var _2n = /* @__PURE__ */ BigInt(2);
/**
* √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
* (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
*/
function sqrtMod(y) {
	const P = secp256k1_CURVE.p;
	const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
	const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
	const b2 = y * y * y % P;
	const b3 = b2 * b2 * y % P;
	const b11 = pow2(pow2(pow2(b3, _3n, P) * b3 % P, _3n, P) * b3 % P, _2n, P) * b2 % P;
	const b22 = pow2(b11, _11n, P) * b11 % P;
	const b44 = pow2(b22, _22n, P) * b22 % P;
	const b88 = pow2(b44, _44n, P) * b44 % P;
	const root = pow2(pow2(pow2(pow2(pow2(pow2(b88, _88n, P) * b88 % P, _44n, P) * b44 % P, _3n, P) * b3 % P, _23n, P) * b22 % P, _6n, P) * b2 % P, _2n, P);
	if (!Fpk1.eql(Fpk1.sqr(root), y)) throw new Error("Cannot find square root");
	return root;
}
var Fpk1 = Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
/**
* secp256k1 curve, ECDSA and ECDH methods.
*
* Field: `2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n`
*
* @example
* ```js
* import { secp256k1 } from '@noble/curves/secp256k1';
* const { secretKey, publicKey } = secp256k1.keygen();
* const msg = new TextEncoder().encode('hello');
* const sig = secp256k1.sign(msg, secretKey);
* const isValid = secp256k1.verify(sig, msg, publicKey) === true;
* ```
*/
var secp256k1 = createCurve({
	...secp256k1_CURVE,
	Fp: Fpk1,
	lowS: true,
	endo: secp256k1_ENDO
}, sha256);
//#endregion
export { bytes as A, Hash$1 as C, toBytes$1 as D, createView$1 as E, ed25519$1 as F, sha256$2 as I, bytesToHex$3 as L, hash as M, number as N, u32$1 as O, output as P, hexToBytes$3 as R, SHA2 as S, checkOpts as T, toBytes as _, rotlBL as a, hmac$1 as b, split as c, aexists as d, anumber as f, swap32IfBE as g, createHasher as h, rotlBH as i, exists as j, wrapConstructor as k, Hash as l, clean as m, ed25519 as n, rotlSH as o, aoutput as p, sha256 as r, rotlSL as s, secp256k1 as t, abytes as u, u32 as v, asyncLoop as w, sha256$1 as x, secp256k1$1 as y };
