import { o as __toESM } from "./_runtime.mjs";
import { C as require_jsx_runtime, J as require_react, b as Link } from "./_libs/@tanstack/react-router+[...].mjs";
// node_modules/.nitro/vite/services/ssr/assets/_-CIIpLl95.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ParticleOrb({ className, disperse = false }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const points = Array.from({ length: 320 }, (_, index) => {
			const y = 1 - index / 319 * 2;
			return {
				y,
				radius: Math.sqrt(Math.max(0, 1 - y * y)),
				theta: Math.PI * (3 - Math.sqrt(5)) * index
			};
		});
		let frame = 0;
		let raf = 0;
		const draw = () => {
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;
			const ratio = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.max(1, Math.floor(width * ratio));
			canvas.height = Math.max(1, Math.floor(height * ratio));
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			ctx.clearRect(0, 0, width, height);
			const spin = reduce ? .8 : frame * .007;
			const cx = width / 2;
			const cy = height / 2;
			const fade = disperse ? Math.max(.15, 1 - frame / 140) : 1;
			const scale = Math.min(width, height) * .36 * (disperse ? 1 + Math.min(frame, 90) / 90 : 1);
			for (const point of points) {
				const x = Math.cos(point.theta + spin) * point.radius;
				const depth = (Math.sin(point.theta + spin) * point.radius + 1) / 2;
				ctx.fillStyle = depth > .72 ? "#ffffff" : depth > .4 ? "#479ffa" : "#ffa16c";
				ctx.globalAlpha = fade * (.3 + depth * .7);
				ctx.beginPath();
				ctx.arc(cx + x * scale, cy + point.y * scale, 1 + depth * 1.2, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			frame += 1;
			if (!reduce) raf = window.requestAnimationFrame(draw);
		};
		draw();
		return () => window.cancelAnimationFrame(raf);
	}, [disperse]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		role: "img",
		"aria-label": "Slowly rotating sphere of teal, foam, and white points",
		className
	});
}
function MissingPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex flex-col items-center px-4 py-16 text-center space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ParticleOrb, {
				className: "h-48 w-48",
				disperse: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-caption text-fey-ember",
				children: "Error 404"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-display text-fey-white",
				children: ["This page drifted ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-fey-ember",
					children: "off."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-sm text-body text-fey-mist",
				children: "That link is not on the terminal. Jump back to live markets or check your portfolio."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 pt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/markets",
					className: "ghost-pill-cta inline-flex h-11 items-center px-6 text-body font-medium",
					children: "Open Markets"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "inline-flex h-11 items-center rounded-pill bg-fey-charcoal border border-fey-smoke px-5 text-body font-medium text-fey-mist hover:text-fey-white",
					children: "Home"
				})]
			})
		]
	});
}
export { MissingPage as component };
