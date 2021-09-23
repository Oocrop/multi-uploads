const { Plugin } = require("powercord/entities");
const {
	React,
	FluxDispatcher,
	getModule,
	getModuleByDisplayName,
	channels: { getChannelId },
	modal: { push, pop },
	messages,
	constants: {
		Endpoints,
		AbortCodes: { EXPLICIT_CONTENT },
		MessageTypes
	},
	i18n: { Messages }
} = require("powercord/webpack");
const { inject, uninject } = require("powercord/injector");
const { findInReactTree } = require("powercord/util");
const filesStorePromise = require("./filesStore");
const forceRender = require("./forceRender");
const FilesList = require("./components/FilesList");

powercord.api.i18n.loadAllStrings(require("./i18n"));

module.exports = class MultiUploads extends Plugin {
	async startPlugin() {
		this.loadStylesheet("style.css");
		this.filesStore = await filesStorePromise;
		this.abortUploadFunctions = {};

		this.filesModule = await getModule(m => m.default?.pushFiles);
		this.originalFilesModule = this.filesModule.default;
		this.filesModule.default = {
			pushFiles: (...args) => {
				this.filesStore.addFiles(...args);
			},
			clearAll: () => {
				this.filesStore.clear(getChannelId());
			},
			popFirstFile() {}
		};

		this.createRequest = await getModule(
			m => typeof m === "function" && m.post
		);
		this.UploadErrorModal = await getModuleByDisplayName("UploadError");

		const Channel = await getModule(m => m.prototype?.getRecipientId);
		const ChannelChatMemo = await getModule(
			m => m.type?.toString().indexOf("renderThreadNotice") > -1
		);
		const ChannelChat = forceRender(
			() => ChannelChatMemo.type({ channel: new Channel({}) }).type
		);
		inject(
			"multiuploads-ChannelChat",
			ChannelChat.prototype,
			"render",
			function (_, res) {
				const { channel } = this.props;
				const form = findInReactTree(res, e => e.type === "form");
				form.props.children.splice(
					1,
					0,
					React.createElement(FilesList, { channelId: channel.id })
				);
				return res;
			}
		);

		const modalStore = await getModule(["isModalOpen"]);
		inject(
			"multiuploads-isModalOpen",
			modalStore,
			"isModalOpen",
			([modal], res) => {
				if (modal.displayName === "UploadModal") return true;
				return res;
			}
		);

		const uploadModule = await getModule(["instantBatchUpload"]);
		inject(
			"multiuploads-cancelUpload",
			uploadModule,
			"cancel",
			([{ id }]) => {
				if (this.abortUploadFunctions[id]) {
					this.abortUploadFunctions[id]();
					delete this.abortUploadFunctions[id];
				}
			}
		);

		const { default: createMessage } = await getModule([
			"createBotMessage"
		]);
		inject(
			"multiuploads-pre-sendMessage",
			messages,
			"sendMessage",
			args => {
				const [
					channelId,
					{ content, tts },
					_,
					{ allowedMentions, messageReference }
				] = args;
				if (this.filesStore.getFiles(channelId)) {
					const message = createMessage(
						channelId,
						content,
						tts,
						messageReference
							? MessageTypes.REPLY
							: MessageTypes.DEFAULT,
						messageReference,
						allowedMentions
					);
					this.uploadFiles(channelId, message);
					return false;
				}
				return args;
			},
			true
		);
		// const { getPendingReply } = await getModule(["getPendingReply"]);
		// const ChannelTextAreaContainer = await getModule(
		// 	m => m.type?.render?.displayName === "ChannelTextAreaContainer"
		// );
		// inject(
		// 	"multiuploads-pre-ChannelTextAreaContainer",
		// 	ChannelTextAreaContainer.type,
		// 	"render",
		// 	args => {
		// 		args[0].onSubmit = new Proxy(args[0].onSubmit, {
		// 			apply: (target, thisArg, args1) => {
		// 				if (
		// 					args1[0] === "" &&
		// 					this.filesStore.getFiles(args[0].channel.id)
		// 				) {
		// 					const reply = getPendingReply(args[0].channel.id);
		// 					const message = createMessage(
		// 						args[0].channel.id,
		// 						"",
		// 						false,
		// 						reply
		// 							? MessageTypes.REPLY
		// 							: MessageTypes.DEFAULT,
		// 						reply
		// 							? {
		// 									guild_id: reply.channel.guild_id,
		// 									channel_id: reply.channel.id,
		// 									message_id: reply.message.id
		// 							  }
		// 							: undefined,
		// 						reply?.shouldMention
		// 							? undefined
		// 							: {
		// 									parse: [
		// 										"users",
		// 										"roles",
		// 										"everyone"
		// 									],
		// 									replied_user: false
		// 							  }
		// 					);
		// 					this.uploadFiles(args[0].channel.id, message);
		// 					return Promise.resolve({
		// 						shouldClear: true,
		// 						shouldRefocus: true
		// 					});
		// 				}
		// 				return target.apply(thisArg, args1);
		// 			}
		// 		});
		// 		return args;
		// 	},
		// 	true
		// );
		// ChannelTextAreaContainer.type.render.displayName =
		// 	"ChannelTextAreaContainer";
	}

	pluginWillUnload() {
		this.filesModule.default = this.originalFilesModule;
		uninject("multiuploads-ChannelChat");
		uninject("multiuploads-isModalOpen");
		uninject("multiuploads-cancelUpload");
		uninject("multiuploads-pre-sendMessage");
		// uninject("multiuploads-pre-ChannelTextAreaContainer");
	}

	async uploadFiles(channelId, json) {
		const files = this.filesStore.getFiles(channelId)[0];
		this.filesStore.removeBatch(channelId, 0);
		var size = 0;
		files.forEach(f => {
			size += f.size;
		});
		const filenames = files.map(f => f.name);
		filenames.forEach((f, i) => {
			var name =
				(files.spoiler ? "SPOILER_" : "") + f.replaceAll(" ", "_");
			filenames[i] = name;
			if (filenames.indexOf(name) !== i) {
				var i1 = 1;
				name =
					(files.spoiler ? "SPOILER_" : "") +
					i1 +
					f.replaceAll(" ", "_");
				filenames[i] = name;
				while (filenames.indexOf(name) !== i) {
					name =
						(files.spoiler ? "SPOILER_" : "") +
						++i1 +
						f.replaceAll(" ", "_");
					filenames[i] = name;
				}
			}
		});

		const request = this.createRequest.post(Endpoints.MESSAGES(channelId));
		const formData = request._getFormData();
		formData.set("payload_json", JSON.stringify(json));
		for (var i in files) {
			const copyFile = new File(
				[await files[i].arrayBuffer()],
				filenames[i],
				{ type: files[i].type }
			);
			formData.set("file" + i, copyFile);
		}
		this.abortUploadFunctions[channelId + size] = () => request.abort();
		request.on("abort", () => {
			this.uploadProgress(channelId, filenames, size, 100);
		});
		request.on("error", (_, code) => {
			this.uploadProgress(channelId, filenames, size, -1);
			if (code === EXPLICIT_CONTENT) {
				push(this.UploadErrorModal, {
					title: Messages.UPLOAD_AREA_UPLOAD_FAILED_TITLE,
					help: Messages.UPLOAD_AREA_UPLOAD_FAILED_HELP.format({
						onClick: () => {
							this.filesStore.addFiles({ files, channelId });
							pop();
							this.uploadFiles(channelId, json);
						}
					})
				});
			}
		});
		request.on("progress", _ => {
			this.uploadProgress(channelId, filenames, size, _.percent);
		});
		request.on("complete", () => {
			this.uploadProgress(channelId, filenames, size, 100);
		});
		request.end();

		this.uploadProgress(channelId, filenames, size, 0);
	}

	uploadProgress(channelId, filenames, size, progress) {
		const first =
			filenames[0] +
			(filenames.length > 2 ? ", " : filenames === 2 ? " and " : ".");
		const second = filenames[1]
			? filenames[1] +
			  (filenames.length > 3
					? ", "
					: filenames.length === 3
					? " and "
					: "")
			: "";
		const third = filenames[2]
			? filenames[2] + (filenames > 3 ? " and " : ".")
			: "";
		const finalName =
			first + second + third + filenames.length > 3
				? filenames.length - 3 + " more"
				: "";
		const dispatchFile = {
			id: channelId + size,
			progress,
			size,
			name: finalName
		};
		if (progress === 0) {
			return FluxDispatcher.dispatch({
				type: "UPLOAD_START",
				channelId,
				file: dispatchFile
			});
		}
		if (progress === 100) {
			return FluxDispatcher.dispatch({
				type: "UPLOAD_COMPLETE",
				channelId,
				file: dispatchFile
			});
		}
		if (progress === -1) {
			return FluxDispatcher.dispatch({
				type: "UPLOAD_FAIL",
				channelId,
				file: dispatchFile
			});
		}
		FluxDispatcher.dispatch({
			type: "UPLOAD_PROGRESS",
			channelId,
			file: dispatchFile
		});
	}
};
