const {
	React,
	getModule,
	contextMenu: { openContextMenu },
	i18n: { Messages }
} = require("powercord/webpack");
const {
	AsyncComponent,
	Card,
	Clickable,
	Icon,
	Tooltip
} = require("powercord/components");
const { findInReactTree } = require("powercord/util");
const forceRender = require("../forceRender");

module.exports = AsyncComponent.from(
	(async () => {
		const { AttachmentUpload } = await getModule(["AttachmentUpload"]);
		forceRender(() => {
			findInReactTree(
				AttachmentUpload({}),
				m => m.type?.displayName === "AttachmentIcon"
			).type({});
		});
		const getIcon = await getModule(
			m =>
				m.resolve &&
				m.keys &&
				m.keys().indexOf("./icon-file-unknown.svg") > -1
		);
		const { sizeString, classifyFile } = await getModule(["sizeString"]);
		const {
			flex,
			directionRow,
			directionColumn,
			alignCenter,
			alignEnd,
			spacer
		} = await getModule(["flex"]);
		const { colorStandard, colorMuted } = await getModule([
			"colorStandard"
		]);
		const { pointer } = await getModule(["pointer"]);

		return function FileCard({ file, remove }) {
			const classification = classifyFile(file);
			const [imageUrl, setImageUrl] = React.useState("");
			React.useEffect(
				classification === "image"
					? () => {
							if (imageUrl !== "") return;
							const url = URL.createObjectURL(file);
							setImageUrl(url);
							return () => URL.revokeObjectURL(url);
					  }
					: () => {},
				[file]
			);
			return (
				<Card
					className={[
						"multiuploads-file",
						flex,
						directionColumn,
						colorStandard
					].join(" ")}
					style={{
						backgroundImage:
							"url(" +
							(classification === "image"
								? imageUrl
								: getIcon(
										"./icon-file-" + classification + ".svg"
								  )) +
							")"
					}}
				>
					<div
						className={[
							"multiuploads-topRow",
							flex,
							directionRow,
							alignCenter
						].join(" ")}
					>
						<div className={spacer} />
						<Clickable
							onClick={remove}
							className={[
								"multiuploads-removeFileButton",
								pointer
							].join(" ")}
						>
							<Icon name="Close" />
						</Clickable>
					</div>
					<div className={spacer} />
					<div
						className={[
							"multiuploads-bottomRow",
							flex,
							directionRow,
							alignEnd
						].join(" ")}
					>
						<div className="multiuploads-fileInfo">
							<div
								className={[
									"multiuploads-fileSize",
									colorMuted
								].join(" ")}
							>
								{sizeString(file.size)}
							</div>
							<div className="multiuploads-fileName">
								{file.name}
							</div>
						</div>
					</div>
				</Card>
			);
		};
	})()
);
