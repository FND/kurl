export default function httpRequest(method, uri) {
	return request(method, uri, (response, resolve, reject) => {
		let chunks = [];
		response.on("data", chunk => {
			chunks.push(chunk);
		});
		response.on("end", _ => {
			resolve(chunks.join("")); // XXX: assumes text chunks
			chunks = null;
		});
	});
}

function request(method, uri, handleResponse) {
	let proto = determineProtocol(uri);
	return new Promise((resolve, reject) => {
		let onError = err => reject(err);
		proto.request(uri, { method }, response => {
			let { statusCode } = response;
			if(statusCode < 200 || statusCode >= 300) { // XXX: crude
				let err = new Error(`unexpected HTTP response: ${statusCode} ${uri}`);
				reject(err);
				return;
			}

			response.on("error", onError);

			handleResponse(response, resolve, reject);
		}).on("error", onError).end();
	});
}

function determineProtocol(uri) {
	if(uri.startsWith("https://")) {
		return require("https");
	}
	if(uri.startsWith("http://")) {
		return require("http");
	}
	throw new Error(`unrecognized URI: ${uri}`);
}
