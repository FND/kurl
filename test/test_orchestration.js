/* global suite, test */
import awaitServer from "../src/orchestration";
import httpRequest from "../src/http";
import { wait } from "../src/util";
import { assert, assertSame, SERVER, URI, FIXTURES_DIR } from "./util";
import path from "path";

suite("orchestration");

test("server availability", async () => {
	let online = await probeAvailablity();
	assertSame(online, false);

	let ready = awaitServer(SERVER, URI, {
		env: { PYTHONUNBUFFERED: 1 },
		cwd: FIXTURES_DIR,
		delay: [10, 15, 20, 25],
		retries: 10
	});
	online = await probeAvailablity();
	assertSame(online, false);

	let terminate = await ready;
	online = await probeAvailablity();
	assertSame(online, true);

	terminate();
	await wait(100);
	online = await probeAvailablity();
	assertSame(online, false);
});

test("working directory", async () => {
	let terminate = await awaitServer(SERVER, URI, {
		cwd: path.resolve(FIXTURES_DIR, "assets"),
		delay: 20,
		retries: 10
	});

	let html = await httpRequest("GET", URI);
	assert(html.includes('<ul>\n<li><a href="logo.png">logo.png</a></li>\n</ul>'));
	terminate();
});

async function probeAvailablity() {
	try {
		await httpRequest("HEAD", URI);
		return true;
	} catch(err) {
		if(err.code !== "ECONNREFUSED") {
			throw err;
		}
		return false;
	}
}
