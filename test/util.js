import path from "path";
import assert, { strictEqual as assertSame, deepStrictEqual as assertDeep } from "assert";

export { assert, assertSame, assertDeep };

export let FIXTURES_DIR = path.resolve(__dirname, "fixtures");

let ADDRESS = "localhost";
let PORT = 3333;
export let URI = `http://${ADDRESS}:${PORT}`;
export let SERVER = `python3 -m http.server ${PORT} --bind ${ADDRESS}`.split(" ");
