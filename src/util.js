export function abort(code, ...msg) {
	console.error(...msg);
	process.exit(code);
}

export function wait(delay) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, delay);
	});
}
