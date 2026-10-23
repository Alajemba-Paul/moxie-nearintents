import { Y as require_jsx_runtime, b as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as ParticleOrb } from "./_ssr/particle-orb-CMeWoiZI.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_-ByDWy_AF.js
var import_jsx_runtime = require_jsx_runtime();
function Missing() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex flex-col items-center px-4 py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ParticleOrb, {
				className: "h-56 w-56",
				disperse: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-4 text-3xl",
				children: "This page drifted off"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-sm",
				children: "The route is not part of the terminal."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "mt-6 inline-flex h-11 items-center rounded-control bg-cta px-4 text-sm font-medium text-abyss",
				children: "Return to markets"
			})
		]
	});
}
//#endregion
export { Missing as component };
