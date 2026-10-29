import { createFileRoute } from "@tanstack/react-router";

// Digital Asset Links: lets the Android APK (TWA) open fullscreen without the address bar.
const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "app.boostmada.twa",
      sha256_cert_fingerprints: [
        "88:DC:49:0B:79:18:D2:2D:66:68:FF:99:1F:CB:5B:A6:E6:D9:0D:F6:10:4D:AE:F6:D7:60:00:20:95:31:EF:2F",
      ],
    },
  },
];

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(ASSET_LINKS), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=3600",
            "access-control-allow-origin": "*",
          },
        }),
    },
  },
});
