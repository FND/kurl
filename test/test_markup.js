/* global suite, test, before, after */
import { Document, DocumentFragment } from "../src/document";
import awaitServer from "../src/orchestration";
import { assert, assertSame, assertDeep, SERVER, URI, FIXTURES_DIR } from "./util";
import path from "path";

suite("markup");

let DOC, TERMINATE;

before(async () => {
	TERMINATE = await awaitServer(SERVER, URI, {
		cwd: path.resolve(FIXTURES_DIR),
		delay: 10,
		retries: 10
	});
	DOC = await Document.from(`${URI}/splash.html`);
});

after(() => {
	TERMINATE();
});

test("selectors", async () => {
	assertSame(DOC.select("body").children.length, 4);
	assertSame(DOC.select("head meta[charset]"), "utf-8");
	assertSame(DOC.select("title::text"), "Hello World");
	assertSame(DOC.select("body img[src]"), "vista.png");
	assertSame(DOC.select("body h1::text"), "Hello World");
	assertSame(DOC.select("body p::text"), "\n\t\tlorem ipsum\n\t\tdolor sit amet\n\t");
	assertDeep(DOC.selectAll("footer img").map(img => img.src),
			["beacon.gif", "logo.png"]);
});

test("components", async () => {
	let main = {
		container: "body",
		title: "h1::text",
		hero: "img[src]",
		content: "p::text"
	};
	let footer = {
		container: "footer",
		logo: "> img[src]"
	};
	let img = {
		container: "img",
		uri: "[src]"
	};

	let mainArea = DOC.select(main);
	let footerArea = DOC.select(footer);
	assertSame(mainArea.title, "Hello World");
	assertSame(mainArea.hero, "vista.png");
	assertSame(mainArea.content, "\n\t\tlorem ipsum\n\t\tdolor sit amet\n\t");
	assert.throws(() => {
		mainArea.dummy; // eslint-disable-line no-unused-expressions
	}, /invalid component property `dummy`/);
	assertSame(DOC.select(img).uri, "vista.png");
	assertSame(footerArea.select(img).uri, "beacon.gif");
	assertSame(footerArea.logo, "logo.png");
});

test("nesting", async () => {
	let body = {
		container: "body"
	};
	let nav = {
		container: ".site-nav",
		jumpLink: "> a"
	};
	let link = {
		container: "ul a",
		uri: "[href]",
		caption: "::text"
	};

	let doc = await Document.from(`${URI}/sample.html`);
	let navArea = doc.select(body).select(nav);
	let navLink = navArea.select(link);
	assertSame(navArea.jumpLink.getAttribute("href"), "#main");
	assertSame(navLink.uri, "/");
	assertSame(navLink.caption, "home");
});

test("DTD validation", async () => {
	assert.throws(() => {
		new Document("<html>…</html>"); // eslint-disable-line no-new
	}, /missing or invalid document-type declaration/);
	assert.throws(() => { // eslint-disable-next-line no-new
		new Document("<!DOCTYPE html><html>…</html>", "<!DOCTYPE HTML PUBLIC>");
	}, /missing or invalid document-type declaration/);

	assert.throws(() => { // eslint-disable-next-line no-new
		new DocumentFragment("<!DOCTYPE html><html>…</html>");
	}, /document fragment must not include document-type declaration/);
	assert.throws(() => { // eslint-disable-next-line no-new
		new DocumentFragment('  <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" ' +
			'https://www.w3.org/TR/html4/strict.dtd">');
	}, /document fragment must not include document-type declaration/);
});
