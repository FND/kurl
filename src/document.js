import httpRequest from "./http";
import { nid } from "./uid";
import { JSDOM } from "jsdom";

let DTD = "document-type declaration";

export class Document {
	static async from(uri) {
		let html = await httpRequest("GET", uri);
		return new Document(html);
	}

	constructor(html, doctype = "<!DOCTYPE html>") {
		if(doctype && !html.startsWith(doctype)) {
			throw new Error(`missing or invalid ${DTD}; expected \`${doctype}\``);
		}
		this.root = new JSDOM(html).window.document;
	}

	selectAll(selector) {
		return select(selector, this.root, true);
	}

	select(selector) {
		return select(selector, this.root);
	}
}

export class DocumentFragment extends Document {
	constructor(html) { // eslint-disable-line constructor-super
		if(html.trimStart().substr(0, 9).toUpperCase().includes("<!DOCTYPE")) {
			throw new Error(`document fragment must not include ${DTD}`);
		}
		this.root = JSDOM.fragment(html); // eslint-disable-line no-this-before-super
	}
}

function makeComponent(container, definition) {
	return new Proxy(container, {
		get(node, prop) {
			if(prop === "container") {
				return container;
			}
			if(prop === "select") {
				return selector => select(selector, container);
			}

			let selector = definition[prop];
			if(!selector) {
				throw new Error(`invalid component property \`${prop}\``);
			}
			return select(selector, container);
		}
	});
}

function select(selector, root, multi) {
	let { container } = selector;
	if(container) { // component
		var component = selector; // eslint-disable-line no-var
		selector = container;
	}

	// custom selectors
	let slot; // XXX: misnomer
	if(selector.endsWith("::text")) {
		selector = selector.substr(0, selector.length - 6);
		slot = "::text";
	} else if(selector.endsWith("]")) { // attribute
		let i = selector.lastIndexOf("[");
		if(i === -1) {
			throw new Error(`invalid selector \`${selector}\``);
		} // eslint-disable-next-line no-var
		slot = selector.substring(i + 1, selector.length - 1);
		selector = selector.substr(0, i);
	}

	let res = root;
	if(selector.startsWith(">")) { // direct child
		selector = selector.substr(1).trimStart();
		let nodes = selectFromChildren(selector, root);
		res = multi ? nodes : nodes[0];
	} else {
		res = multi ? findAll(selector, res) : find(selector, res);
	}

	let makeRes = node => {
		if(slot) {
			return slot === "::text" ? node.textContent : node.getAttribute(slot);
		}
		return component ? makeComponent(node, component) : node;
	};
	return multi ? res.map(node => makeRes(node)) : makeRes(res);
}

function selectFromChildren(selector, root) {
	let cls = `container-${nid()}`;
	root.classList.add(cls);
	let nodes = root.parentNode.querySelectorAll(`.${cls} > ${selector}`);
	root.classList.remove(cls);
	if(!nodes.length) {
		throw new Error(`no matching child nodes for \`${selector}\``);
	}
	return [...nodes];
}

function findAll(selector, root) {
	let nodes = root.querySelectorAll(selector);
	if(!nodes.length) {
		throw new Error(`no matching nodes for \`${selector}\``);
	}
	return [...nodes];
}

function find(selector, root) {
	if(selector === "") { // implicit self reference (e.g. `[href]` on `a`)
		return root;
	}
	let node = root.querySelector(selector);
	if(!node) {
		throw new Error(`no matching node for \`${selector}\``);
	}
	return node;
}
