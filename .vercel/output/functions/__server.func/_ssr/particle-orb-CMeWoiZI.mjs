import { o as __toESM } from "../_runtime.mjs";
import { X as require_react, Y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/particle-orb-CMeWoiZI.js
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
				ctx.fillStyle = depth > .72 ? "#ffffff" : depth > .4 ? "#cbfffc" : "#00827c";
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
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		role: "img",
		"aria-label": "Slowly rotating sphere of teal, foam, and white points",
		className
	});
}
//#endregion
export { ParticleOrb as t };
