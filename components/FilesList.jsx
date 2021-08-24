const {
	React,
	Flux: { connectStores },
	getModule,
	getModuleByDisplayName,
	i18n: { Messages }
} = require("powercord/webpack");
const {
	AsyncComponent,
	FormTitle,
	Tooltip,
	Clickable,
	Icon,
	settings: { FormItem }
} = require("powercord/components");
const filesStorePromise = require("../filesStore");
const FileCard = require("./FileCard");

module.exports = AsyncComponent.from(
	(async () => {
		const filesStore = await filesStorePromise;

		const Checkbox = await getModuleByDisplayName("Checkbox");

		const { flex, directionRow, wrap, alignCenter, spacer } =
			await getModule(["flex"]);
		const { marginLeft8 } = await getModule(["marginLeft8"]);
		const { pointer } = await getModule(["pointer"]);

		class FilesList extends React.Component {
			render() {
				const { get, removeFile, removeBatch, channelId } = this.props;
				const batches = get(channelId);
				if (!batches || batches.length === 0) return null;
				return (
					<div className="multiuploads-list">
						{batches.map((files, batchIndex) => {
							return (
								<FormItem className="multiuploads-batch">
									<FormTitle
										className={[
											"multiuploads-batchTitle",
											flex,
											directionRow,
											alignCenter
										].join(" ")}
									>
										{Messages.MULTI_UPLOADS_BATCH_NUMERATED.format(
											{
												n: batchIndex + 1
											}
										)}
										<div
											className={[
												flex,
												directionRow,
												alignCenter,
												marginLeft8
											].join(" ")}
										>
											<Checkbox
												value={files.spoiler}
												onChange={(_, value) => {
													files.spoiler = value;
													this.forceUpdate();
												}}
											/>
											<span className={marginLeft8}>
												{Messages.SPOILER_MARK_SELECTED}
											</span>
										</div>
										<div className={spacer} />
										<Tooltip
											text={
												Messages.MULTI_UPLOADS_REMOVE_ALL
											}
										>
											<Clickable
												onClick={() =>
													removeBatch(
														channelId,
														batchIndex
													)
												}
												className={[
													"multiuploads-removeBatchButton",
													pointer
												].join(" ")}
											>
												<Icon name="Close" />
											</Clickable>
										</Tooltip>
									</FormTitle>
									<div
										className={[
											"multiuploads-batchGrid",
											flex,
											wrap
										].join(" ")}
									>
										{files.map((file, index) => (
											<FileCard
												file={file}
												remove={() =>
													removeFile(
														channelId,
														batchIndex,
														index
													)
												}
											/>
										))}
									</div>
								</FormItem>
							);
						})}
					</div>
				);
			}
		}

		return connectStores([filesStore], () => ({
			get: filesStore.getFiles,
			removeFile: filesStore.removeFile.bind(filesStore),
			removeBatch: filesStore.removeBatch.bind(filesStore)
		}))(FilesList);
	})()
);
