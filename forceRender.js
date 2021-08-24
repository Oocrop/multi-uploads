const { React } = require("powercord/webpack");

module.exports = function forceRender(callback) {
	const reactInternals =
		React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
			.ReactCurrentDispatcher.current;
	const ogUseMemo = reactInternals.useMemo;
	const ogUseState = reactInternals.useState;
	const ogUseEffect = reactInternals.useEffect;
	const ogUseLayoutEffect = reactInternals.useLayoutEffect;
	const ogUseRef = reactInternals.useRef;
	const ogUseCallback = reactInternals.useCallback;

	reactInternals.useMemo = f => f();
	reactInternals.useState = v => [v, () => void 0];
	reactInternals.useEffect = () => null;
	reactInternals.useLayoutEffect = () => null;
	reactInternals.useRef = () => ({});
	reactInternals.useCallback = c => c;

	const result = callback();

	reactInternals.useMemo = ogUseMemo;
	reactInternals.useState = ogUseState;
	reactInternals.useEffect = ogUseEffect;
	reactInternals.useLayoutEffect = ogUseLayoutEffect;
	reactInternals.useRef = ogUseRef;
	reactInternals.useCallback = ogUseCallback;

	return result;
};
