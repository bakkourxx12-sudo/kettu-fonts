(function () {
  "use strict";

  var storage = vendetta.plugin.storage;
  var findByProps = vendetta.metro.findByProps;
  var FluxDispatcher = vendetta.metro.common.FluxDispatcher;

  if (!storage.clientId) storage.clientId = "";
  if (!storage.name) storage.name = "Discord";
  if (storage.details == null) storage.details = "";
  if (storage.state == null) storage.state = "";
  if (storage.largeImageKey == null) storage.largeImageKey = "";
  if (storage.largeImageText == null) storage.largeImageText = "";
  if (storage.smallImageKey == null) storage.smallImageKey = "";
  if (storage.smallImageText == null) storage.smallImageText = "";
  if (storage.enableTimestamp == null) storage.enableTimestamp = true;
  if (storage.button1Label == null) storage.button1Label = "";
  if (storage.button1Url == null) storage.button1Url = "";
  if (storage.button2Label == null) storage.button2Label = "";
  if (storage.button2Url == null) storage.button2Url = "";

  var startedAt = Date.now();
  var interval = null;

  var assetManager = findByProps(
    "getAssetIds",
    "fetchAssetIds"
  );

  async function getAssets(clientId, keys) {
    if (!assetManager || !clientId || !keys.length) {
      return [];
    }

    try {
      var ids = assetManager.getAssetIds(clientId, keys);

      if (!ids || !ids.length) {
        ids = await assetManager.fetchAssetIds(clientId, keys);
      }

      return ids || [];
    } catch (_) {
      return [];
    }
  }

  function validUrl(url) {
    try {
      var u = new URL(url);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch (_) {
      return false;
    }
  }

  async function update() {
    var clientId = String(storage.clientId || "").trim();

    if (!clientId) {
      return;
    }

    var largeKey = String(storage.largeImageKey || "").trim();
    var smallKey = String(storage.smallImageKey || "").trim();

    var keys = [];

    if (largeKey) keys.push(largeKey);
    if (smallKey) keys.push(smallKey);

    var assetIds = await getAssets(clientId, keys);

    var activity = {
      name: String(storage.name || "Discord").trim(),
      application_id: clientId,
      type: 0,
      flags: 1
    };

    if (storage.details) {
      activity.details = String(storage.details);
    }

    if (storage.state) {
      activity.state = String(storage.state);
    }

    if (storage.enableTimestamp) {
      activity.timestamps = {
        start: startedAt
      };
    }

    if (largeKey || smallKey) {
      activity.assets = {};

      if (largeKey && assetIds[0]) {
        activity.assets.large_image = assetIds[0];

        if (storage.largeImageText) {
          activity.assets.large_text =
            String(storage.largeImageText);
        }
      }

      if (smallKey) {
        var smallIndex = largeKey ? 1 : 0;

        if (assetIds[smallIndex]) {
          activity.assets.small_image =
            assetIds[smallIndex];

          if (storage.smallImageText) {
            activity.assets.small_text =
              String(storage.smallImageText);
          }
        }
      }
    }

    var buttons = [];
    var urls = [];

    if (
      storage.button1Label &&
      storage.button1Url &&
      validUrl(String(storage.button1Url))
    ) {
      buttons.push(
        String(storage.button1Label).slice(0, 32)
      );
      urls.push(String(storage.button1Url));
    }

    if (
      storage.button2Label &&
      storage.button2Url &&
      validUrl(String(storage.button2Url))
    ) {
      buttons.push(
        String(storage.button2Label).slice(0, 32)
      );
      urls.push(String(storage.button2Url));
    }

    if (buttons.length) {
      activity.buttons = buttons;
      activity.metadata = {
        button_urls: urls
      };
    }

    FluxDispatcher.dispatch({
      type: "LOCAL_ACTIVITY_UPDATE",
      activity: activity,
      pid: 1608,
      socketId: "AutoStartRichPresence@Kettu"
    });
  }

  function clearActivity() {
    try {
      FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: null,
        pid: 1608,
        socketId: "AutoStartRichPresence@Kettu"
      });
    } catch (_) {}
  }

  return {
    onLoad: function () {
      startedAt = Date.now();

      update();

      if (interval) {
        clearInterval(interval);
      }

      interval = setInterval(function () {
        update();
      }, 60000);
    },

    onUnload: function () {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      clearActivity();
    },

    settings: {}
  };
})()
