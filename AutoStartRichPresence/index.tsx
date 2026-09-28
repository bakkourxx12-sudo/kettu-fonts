import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    clientId: {
        type: OptionType.STRING,
        description: "Discord Application Client ID",
        default: "",
    },

    name: {
        type: OptionType.STRING,
        description: "Activity name",
        default: "Discord",
    },

    details: {
        type: OptionType.STRING,
        description: "Activity details",
        default: "",
    },

    state: {
        type: OptionType.STRING,
        description: "Activity state",
        default: "",
    },

    largeImageKey: {
        type: OptionType.STRING,
        description: "Large image asset key",
        default: "",
    },

    largeImageText: {
        type: OptionType.STRING,
        description: "Large image hover text",
        default: "",
    },

    smallImageKey: {
        type: OptionType.STRING,
        description: "Small image asset key",
        default: "",
    },

    smallImageText: {
        type: OptionType.STRING,
        description: "Small image hover text",
        default: "",
    },

    enableTimestamp: {
        type: OptionType.BOOLEAN,
        description: "Show elapsed time",
        default: true,
    },

    button1Label: {
        type: OptionType.STRING,
        description: "Button 1 text",
        default: "",
    },

    button1Url: {
        type: OptionType.STRING,
        description: "Button 1 URL",
        default: "",
    },

    button2Label: {
        type: OptionType.STRING,
        description: "Button 2 text",
        default: "",
    },

    button2Url: {
        type: OptionType.STRING,
        description: "Button 2 URL",
        default: "",
    },
});

let interval: ReturnType<typeof setInterval> | null = null;
let startedAt = Date.now();

function nonEmpty(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function validUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

async function assetId(
    clientId: string,
    key: string
): Promise<string | undefined> {
    if (!nonEmpty(clientId) || !nonEmpty(key)) {
        return undefined;
    }

    try {
        const result = await ApplicationAssetUtils.fetchAssetIds(
            clientId.trim(),
            [key.trim()]
        );

        return result?.[0] || undefined;
    } catch {
        return undefined;
    }
}

async function buildActivity() {
    const s = settings.store;
    const clientId = s.clientId.trim();

    if (!nonEmpty(clientId)) {
        return null;
    }

    const activity: any = {
        application_id: clientId,
        name: nonEmpty(s.name) ? s.name.trim() : "Discord",
        type: 0,
        flags: 1,
    };

    if (nonEmpty(s.details)) {
        activity.details = s.details.trim();
    }

    if (nonEmpty(s.state)) {
        activity.state = s.state.trim();
    }

    if (s.enableTimestamp) {
        activity.timestamps = {
            start: startedAt,
        };
    }

    const assets: any = {};

    const large = await assetId(
        clientId,
        s.largeImageKey
    );

    const small = await assetId(
        clientId,
        s.smallImageKey
    );

    if (large) {
        assets.large_image = large;

        if (nonEmpty(s.largeImageText)) {
            assets.large_text = s.largeImageText.trim();
        }
    }

    if (small) {
        assets.small_image = small;

        if (nonEmpty(s.smallImageText)) {
            assets.small_text = s.smallImageText.trim();
        }
    }

    if (Object.keys(assets).length > 0) {
        activity.assets = assets;
    }

    const buttons: string[] = [];
    const buttonUrls: string[] = [];

    if (
        nonEmpty(s.button1Label) &&
        nonEmpty(s.button1Url) &&
        validUrl(s.button1Url.trim())
    ) {
        buttons.push(
            s.button1Label.trim().slice(0, 32)
        );

        buttonUrls.push(
            s.button1Url.trim()
        );
    }

    if (
        nonEmpty(s.button2Label) &&
        nonEmpty(s.button2Url) &&
        validUrl(s.button2Url.trim())
    ) {
        buttons.push(
            s.button2Label.trim().slice(0, 32)
        );

        buttonUrls.push(
            s.button2Url.trim()
        );
    }

    if (buttons.length > 0) {
        activity.buttons = buttons;

        activity.metadata = {
            button_urls: buttonUrls,
        };
    }

    return activity;
}

function setActivity(activity: any) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "Kettu-AutoStartRichPresence",
    });
}

async function update() {
    try {
        const activity = await buildActivity();

        setActivity(activity);
    } catch {}
}

export default definePlugin({
    name: "AutoStartRichPresence",

    description:
        "Automatically starts and maintains a customizable Rich Presence on Kettu.",

    authors: [
        {
            name: "bakkourxx12-sudo",
            id: 0n,
        },
    ],

    settings,

    start() {
        startedAt = Date.now();

        void update();

        if (interval) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            void update();
        }, 60_000);
    },

    stop() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }

        setActivity(null);
    },
});
