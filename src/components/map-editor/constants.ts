import L from "leaflet";

export type TileLayerType = "std" | "photo" | "pale";

export const TILE_LAYERS: Record<TileLayerType, { url: string; attribution: string; maxZoom: number }> = {
  std: {
    url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
  },
  photo: {
    url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
  },
  pale: {
    url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
  },
};

// Helper: create site pin icon (red circle)
export function createSitePinIcon() {
  return L.divIcon({
    className: "site-pin-icon",
    html: `<div style="width:20px;height:20px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Helper: escape HTML to prevent XSS
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper: create leader box HTML
export function createLeaderBoxHtml(postalCode: string, address: string) {
  const safePostalCode = escapeHtml(postalCode);
  const safeAddress = escapeHtml(address);
  return `<div style="background:#fff;border:2px solid #333;padding:4px 8px;font-size:12px;white-space:nowrap;color:#000;font-family:sans-serif;line-height:1.4;">〒${safePostalCode}<br/>${safeAddress}</div>`;
}

// Helper: format coordinate display
export function formatCoord(lat: number, lng: number) {
  return `座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
