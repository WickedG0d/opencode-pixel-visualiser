const VISUALIZER_URL = `http://localhost:${parseInt(process.env.OCV_SERVER_PORT || "5173", 10)}`;
const TuiVisualizerPlugin = async (api) => {
    api.keymap.registerLayer({
        id: "ocv-commands",
        bindings: {
            "/visualizer": {
                description: "Show the session visualizer URL",
                handler: () => {
                    api.ui.toast.show({
                        message: `Visualizer: ${VISUALIZER_URL}`,
                        variant: "info",
                    });
                },
            },
        },
    });
};
export { TuiVisualizerPlugin };
export default { tui: TuiVisualizerPlugin };
