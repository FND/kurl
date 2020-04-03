import httpRequest from "./http";
import { abort, wait } from "./util";
import { spawn } from "child_process";

// `cmd` is an array specifying how to start the server
// `uri` is the URI to probe for availability
// `delay` is the polling delay in milliseconds or an array of such values
// `retries` is the the maximum number of polling attempts
// `env` (optional) is an object with environment variables for `cmd`
// `cwd` (optional) is `cmd`'s working directory
export default async function awaitServer(cmd, uri, { delay, retries, env, cwd }) {
	let pid = launch(cmd, { env, cwd });
	await probe(uri, delay, retries);
	return () => pid.kill("SIGHUP");
}

// polls `uri` for availability and throws an exception if `retries` is exceeded
// if `delay` is an array, the respective values will be used in sequence, with
// the last one being used repeatedly if necessary
export async function probe(uri, delay, retries, i = 0) {
	try {
		await httpRequest("HEAD", uri);
		return true;
	} catch(err) {
		if(err.code !== "ECONNREFUSED") {
			throw err;
		}
	}

	if(i === retries) {
		throw new Error(`timeout while probing ${uri}`);
	}
	i++;

	let nextDelay = delay;
	if(delay.pop) { // allows for exponential backoff
		if(delay.length === 1) {
			delay = nextDelay = delay[0];
		} else {
			[delay, ...nextDelay] = delay;
		}
	}
	await wait(delay);
	return probe(uri, nextDelay, retries, i);
}

function launch(cmd, { env, cwd }) {
	let args;
	[cmd, ...args] = cmd;

	let _env = Object.create(process.env); // less overhead than copying
	let pid = spawn(cmd, args, {
		env: Object.assign(_env, env),
		cwd,
		stdio: ["pipe", "inherit", "inherit"]
	});
	process.on("exit", code => {
		pid.kill("SIGHUP");
	});
	pid.on("error", err => {
		abort(1, "ERROR: child process died unexpectedly", err);
	});
	pid.on("close", code => {
		if(code) {
			abort(code, `ERROR: child process died unexpectedly (exit code ${code})`);
		}
	});
	return pid;
}
