const {
	Flux: { Store },
	FluxDispatcher,
	getModule
} = require("powercord/webpack");

const cache = {};
var maxFileSize;

function sortBatches(channelId) {
	if (!cache[channelId]) return;
	const items = cache[channelId].flat().filter(i => typeof i === "object");
	const result = [];
	const itemHandler = (file, i) => {
		if (result.find(b => b.indexOf(i) > -1)) return;
		if (currentSize > -1) {
			if (currentSize + file.size > maxFileSize()) {
				return;
			}
			currentSize += file.size;
			result[result.length - 1].push(i);
			return;
		}
		currentSize = file.size;
		result.push([i]);
		items.forEach(itemHandler);
		currentSize = -1;
	};

	var currentSize = -1;

	items.forEach(itemHandler);

	cache[channelId] = result.map(b => b.map(i => items[i]));
	cache[channelId].forEach(b =>
		Object.defineProperty(b, "spoiler", {
			value: false,
			enumerable: false,
			writable: true
		})
	);
}

class FilesStore extends Store {
	addFiles({ files, channelId }) {
		if (!cache[channelId]) cache[channelId] = [...files];
		else cache[channelId].push(...files);
		FluxDispatcher.dirtyDispatch({
			type: "MULTI_UPLOADS_UPDATE",
			channelId
		});
	}
	clear(channelId) {
		delete cache[channelId];
		FluxDispatcher.dirtyDispatch({
			type: "MULTI_UPLOADS_UPDATE",
			channelId
		});
	}
	getFiles(channelId) {
		return cache[channelId];
	}
	removeBatch(channelId, index) {
		cache[channelId].splice(index, 1);
		if (cache[channelId].length === 0) return this.clear(channelId);
		FluxDispatcher.dirtyDispatch({
			type: "MULTI_UPLOADS_UPDATE",
			channelId
		});
	}
	removeFile(channelId, batchIndex, index) {
		cache[channelId][batchIndex].splice(index, 1);
		if (cache[channelId][batchIndex].length === 0)
			return this.removeBatch(channelId, batchIndex);
		FluxDispatcher.dirtyDispatch({
			type: "MULTI_UPLOADS_UPDATE",
			channelId
		});
	}
}
module.exports = (async () => {
	maxFileSize = (await getModule(["sizeString"])).maxFileSize;
	return new FilesStore(FluxDispatcher, {
		// yeah I don't know how to properly create stores
		MULTI_UPLOADS_UPDATE: e => {
			sortBatches(e.channelId);
		}
	});
})();
