// node_modules/@scure/base/index.js
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
var freeze = (fn) => Object.freeze(fn());
function isBytes(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
/** Asserts something is Uint8Array. */
function abytes(b) {
	if (!isBytes(b)) throw new TypeError("Uint8Array expected");
}
function afn(input) {
	if (typeof input !== "function") throw new TypeError("function expected");
	return true;
}
function astr(label, input) {
	if (typeof input !== "string") throw new TypeError(`${label}: string expected`);
	return true;
}
function anumber(n, title = "number") {
	if (typeof n !== "number") throw new TypeError(`${title}: expected number, got ${typeof n}`);
	if (!Number.isSafeInteger(n)) throw new RangeError(`${title}: expected safe integer, got ${n}`);
}
function chain(...args) {
	const id = (a) => a;
	const wrap = (a, b) => (c) => a(b(c));
	return {
		encode: args.map((x) => x.encode).reduceRight(wrap, id),
		decode: args.map((x) => x.decode).reduce(wrap, id)
	};
}
function normalize(fn) {
	afn(fn);
	return {
		encode: (from) => from,
		decode: (to) => fn(to)
	};
}
var powers = /* @__PURE__ */ (() => {
	let res = [];
	for (let i = 0; i < 40; i++) res.push(2 ** i);
	return res;
})();
var asciiDecoder = /* @__PURE__ */ (() => {
	try {
		const decoder = new TextDecoder();
		return decoder.decode(Uint8Array.of(65, 48, 43, 127)) === "A0+" ? decoder : void 0;
	} catch (e) {
		return;
	}
})();
var B2S_CHUNK = 8192;
function charcodesToString(codes) {
	const len = codes.length;
	if (asciiDecoder !== void 0 && len >= 12) return asciiDecoder.decode(codes);
	if (len <= B2S_CHUNK) return String.fromCharCode.apply(null, codes);
	let res = "";
	for (let i = 0; i < len; i += B2S_CHUNK) res += String.fromCharCode.apply(null, codes.subarray(i, i + B2S_CHUNK));
	return res;
}
/**
* Linear 8 <-> bits regrouping (radix2Slow semantics), with Uint8Array digits and
* preallocated output.
*/
function radix2(bits) {
	anumber(bits);
	if (bits <= 0 || bits > 8) throw new RangeError("radix2: bits should be in (0..8]");
	const mask = powers[bits] - 1;
	return {
		encode: (bytes) => {
			abytes(bytes);
			const len = bytes.length;
			const res = new Uint8Array(Math.ceil(len * 8 / bits));
			let carry = 0;
			let pos = 0;
			let j = 0;
			for (let i = 0; i < len;) {
				if (i + 2 < len) {
					carry = carry << 24 | bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
					pos += 24;
					i += 3;
				} else {
					carry = (carry << 8 | bytes[i]) & 65535;
					pos += 8;
					i++;
				}
				for (;;) {
					pos -= bits;
					res[j++] = carry >> pos & mask;
					if (pos < bits) break;
				}
			}
			if (pos > 0) res[j] = carry << bits - pos & mask;
			return res;
		},
		decode: (digits) => {
			const len = digits.length;
			const res = new Uint8Array(Math.floor(len * bits / 8));
			let carry = 0;
			let pos = 0;
			let j = 0;
			for (let i = 0; i < len; i++) {
				carry = (carry << bits | digits[i]) & 65535;
				pos += bits;
				for (; pos >= 8; pos -= 8) res[j++] = carry >> pos - 8 & 255;
			}
			carry = carry << 8 - pos & 255;
			if (pos >= bits) throw new Error("Excess padding");
			if (carry > 0) throw new Error(`Non-zero padding: ${carry}`);
			return res;
		}
	};
}
/**
* Digit <-> letter mapping fused with string join (chain(alphabetSlow(letters), join(''))
* semantics), via char-code lookup tables.
*/
function alphabet(letters, aliases) {
	const len = letters.length;
	if (len > 128) throw new Error("alphabet: max 128 letters");
	const encTable = new Uint8Array(len);
	const decTable = (/* @__PURE__ */ new Int8Array(128)).fill(-1);
	for (let i = 0; i < len; i++) {
		const code = letters.charCodeAt(i);
		if (letters.codePointAt(i) !== code || code > 127) throw new Error("alphabet: single-char ASCII letters only");
		encTable[i] = code;
		decTable[code] = i;
	}
	if (aliases !== void 0) for (const alias of Object.keys(aliases)) {
		const code = alias.charCodeAt(0);
		const target = decTable[aliases[alias].charCodeAt(0)];
		if (alias.length !== 1 || code > 127 || target === void 0 || target === -1) throw new Error(`alphabet: invalid alias ${alias}`);
		decTable[code] = target;
	}
	return {
		encode: (digits) => {
			const codes = new Uint8Array(digits.length);
			for (let i = 0; i < digits.length; i++) {
				const d = digits[i];
				const code = encTable[d];
				if (code === void 0) throw new Error(`alphabet.encode: invalid digit ${d}`);
				codes[i] = code;
			}
			return charcodesToString(codes);
		},
		decode: (input) => {
			astr("decode", input);
			const slen = input.length;
			const digits = new Uint8Array(slen);
			for (let i = 0; i < slen; i++) {
				const code = input.charCodeAt(i);
				const digit = code < 128 ? decTable[code] : -1;
				if (digit === -1) throw new Error(`Unknown letter "${input[i]}". Allowed: ${letters}`);
				digits[i] = digit;
			}
			return digits;
		}
	};
}
var B58_GROUP = 656356768;
var RADIX_BASE_N_MAX_LENGTH = 65536;
var BASE_N_MAX_BYTES = 2048;
var BASE_N_MAX_CHARS = 4096;
var radixBaseN = (BASE, GROUP) => ({
	encode: (bytes) => {
		abytes(bytes);
		const blen = bytes.length;
		if (blen === 0) return /* @__PURE__ */ new Uint8Array(0);
		if (blen >= RADIX_BASE_N_MAX_LENGTH) throw new Error("invalid length");
		let zeros = 0;
		while (zeros < blen - 1 && bytes[zeros] === 0) zeros++;
		const nlimbs = Math.ceil(blen / 2);
		const limbs = new Uint16Array(nlimbs);
		const odd = blen & 1;
		if (odd) limbs[0] = bytes[0];
		for (let i = odd, j = odd; i < blen; i += 2, j++) limbs[j] = bytes[i] << 8 | bytes[i + 1];
		const groups = [];
		let pos = 0;
		while (pos < nlimbs) {
			let carry = 0;
			for (let i = pos; i < nlimbs; i++) {
				const cur = carry * 65536 + limbs[i];
				const q = Math.floor(cur / GROUP);
				carry = cur - q * GROUP;
				limbs[i] = q;
				if (q === 0 && i === pos) pos++;
			}
			groups.push(carry);
		}
		const top = groups.length - 1;
		let sig = top * 5;
		for (let v = groups[top];; v = Math.floor(v / BASE)) {
			sig++;
			if (v < BASE) break;
		}
		const res = new Uint8Array(zeros + sig);
		let j = res.length - 1;
		for (let g = 0; g < top; g++) {
			let v = groups[g];
			for (let k = 0; k < 5; k++) {
				res[j--] = v % BASE;
				v = Math.floor(v / BASE);
			}
		}
		for (let v = groups[top]; j >= zeros; v = Math.floor(v / BASE)) res[j--] = v % BASE;
		return res;
	},
	decode: (digits) => {
		abytes(digits);
		const dlen = digits.length;
		if (dlen === 0) return /* @__PURE__ */ new Uint8Array(0);
		if (dlen >= RADIX_BASE_N_MAX_LENGTH) throw new Error("invalid length");
		let zeros = 0;
		while (zeros < dlen - 1 && digits[zeros] === 0) zeros++;
		const limbs = new Uint16Array(Math.ceil(dlen * 6 / 16) + 1);
		let used = 0;
		let i = 0;
		let group = dlen % 5 || 5;
		while (i < dlen) {
			let gval = 0;
			let factor = 1;
			for (const end = i + group; i < end; i++) {
				const d = digits[i];
				if (d >= BASE) throw new Error(`invalid integer: ${d}`);
				gval = gval * BASE + d;
				factor *= BASE;
			}
			group = 5;
			let carry = gval;
			for (let k = 0; k < used; k++) {
				const cur = limbs[k] * factor + carry;
				carry = Math.floor(cur / 65536);
				limbs[k] = cur - carry * 65536;
			}
			for (; carry > 0; carry = Math.floor(carry / 65536)) limbs[used++] = carry % 65536;
		}
		const valueBytes = used === 0 ? 1 : used * 2 - (limbs[used - 1] < 256 ? 1 : 0);
		const res = new Uint8Array(zeros + valueBytes);
		let j = res.length - 1;
		for (let k = 0; k < used; k++) {
			const limb = limbs[k];
			res[j--] = limb & 255;
			if (j >= zeros) res[j--] = limb >> 8;
		}
		return res;
	}
});
var genBaseN = (radix, abc) => {
	const letters = alphabet(abc);
	return {
		encode(bytes) {
			abytes(bytes);
			if (bytes.length > BASE_N_MAX_BYTES) throw new Error("invalid length");
			return letters.encode(radix.encode(bytes));
		},
		decode(str) {
			astr("baseN.decode", str);
			if (str.length > BASE_N_MAX_CHARS) throw new Error("invalid length");
			return radix.decode(letters.decode(str));
		}
	};
};
var radix58 = /* @__PURE__ */ radixBaseN(58, B58_GROUP);
var genBase58 = (abc) => genBaseN(radix58, abc);
/**
* base58: base64 without ambigous characters +, /, 0, O, I, l.
* Quadratic (O(n^2)) - so, can't be used on large inputs.
* @example
* ```js
* const text = base58.encode(Uint8Array.from([0, 1, 2]));
* base58.decode(text);
* // => Uint8Array.from([0, 1, 2])
* ```
*/
var base58 = /* @__PURE__ */ freeze(() => genBase58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"));
/** Lowercase hex with case-insensitive decoding. Pure JS version. */
var hexFallback = /* @__PURE__ */ freeze(() => chain(radix2(4), alphabet("0123456789abcdef", {
	A: "a",
	B: "b",
	C: "c",
	D: "d",
	E: "e",
	F: "f"
}), normalize((s) => {
	astr("hex", s);
	if (s.length % 2 !== 0) throw new TypeError(`hex.decode: odd-length string (${s.length})`);
	return s;
})));
var hasHexBuiltin = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function")();
var hexBuiltin = {
	encode(data) {
		abytes(data);
		return data.toHex();
	},
	decode(s) {
		astr("hex", s);
		return Uint8Array.fromHex(s);
	}
};
/**
* hex string decoder. Uses built-in function, when available.
* Lowercase codec; unlike `base16`, this variant accepts either hex case and emits lowercase.
* @example
* ```js
* const b = hex.decode("0102ff"); // => new Uint8Array([ 1, 2, 255 ])
* const str = hex.encode(b); // "0102ff"
* ```
*/
var hex = /* @__PURE__ */ freeze(() => hasHexBuiltin ? hexBuiltin : hexFallback);
export { hex as n, base58 as t };
