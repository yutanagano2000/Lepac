import { GSI_PHOTO_ZOOM, TILE_SIZE, type TileTextureResult } from "./types";

/** 緯度経度 → タイル座標 (x, y) */
function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/** タイル座標 → そのタイル左上の緯度経度 */
function tileToLatLon(tileX: number, tileY: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lon = (tileX / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

/** 緯度経度 → タイル内ピクセル座標 (0~255) */
function latLonToPixelInTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xFloat = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const px = (xFloat - Math.floor(xFloat)) * TILE_SIZE;
  const py = (yFloat - Math.floor(yFloat)) * TILE_SIZE;
  return { px, py };
}

/**
 * グリッド範囲をカバーするGSI航空写真タイルを取得し
 * 1枚のCanvasに合成して返す
 */
export async function fetchGsiPhotoTiles(
  originLat: number,
  originLon: number,
  interval: number,
  rows: number,
  cols: number
): Promise<TileTextureResult | null> {
  const EARTH_RADIUS = 6371000;
  const dLat = (interval / EARTH_RADIUS) * (180 / Math.PI);
  const dLon =
    (interval / (EARTH_RADIUS * Math.cos((originLat * Math.PI) / 180))) *
    (180 / Math.PI);

  // グリッドの四隅
  const north = originLat;
  const south = originLat - (rows - 1) * dLat;
  const west = originLon;
  const east = originLon + (cols - 1) * dLon;

  const zoom = GSI_PHOTO_ZOOM;

  // 必要なタイル範囲
  const tlTile = latLonToTile(north, west, zoom);
  const brTile = latLonToTile(south, east, zoom);

  const minTileX = Math.min(tlTile.x, brTile.x);
  const maxTileX = Math.max(tlTile.x, brTile.x);
  const minTileY = Math.min(tlTile.y, brTile.y);
  const maxTileY = Math.max(tlTile.y, brTile.y);

  const tilesX = maxTileX - minTileX + 1;
  const tilesY = maxTileY - minTileY + 1;

  const canvas = document.createElement("canvas");
  canvas.width = tilesX * TILE_SIZE;
  canvas.height = tilesY * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 全タイルを並列fetch
  const promises: Promise<void>[] = [];
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const url = `https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/${zoom}/${tx}/${ty}.jpg`;
      const offsetX = (tx - minTileX) * TILE_SIZE;
      const offsetY = (ty - minTileY) * TILE_SIZE;
      promises.push(
        loadImage(url).then((img) => {
          ctx.drawImage(img, offsetX, offsetY, TILE_SIZE, TILE_SIZE);
        }).catch(() => {
          // タイルが取得できなかった場合はグレーで塗りつぶし
          ctx.fillStyle = "#888";
          ctx.fillRect(offsetX, offsetY, TILE_SIZE, TILE_SIZE);
        })
      );
    }
  }
  await Promise.all(promises);

  // グリッド範囲がCanvas上のどこにあるかをUVオフセットとして計算
  const nwPixel = latLonToPixelInTile(north, west, zoom);
  const nwTile = latLonToTile(north, west, zoom);
  const startPxX = (nwTile.x - minTileX) * TILE_SIZE + nwPixel.px;
  const startPxY = (nwTile.y - minTileY) * TILE_SIZE + nwPixel.py;

  const sePixel = latLonToPixelInTile(south, east, zoom);
  const seTile = latLonToTile(south, east, zoom);
  const endPxX = (seTile.x - minTileX) * TILE_SIZE + sePixel.px;
  const endPxY = (seTile.y - minTileY) * TILE_SIZE + sePixel.py;

  const totalW = canvas.width;
  const totalH = canvas.height;

  return {
    canvas,
    uvOffsetX: startPxX / totalW,
    uvOffsetY: 1 - endPxY / totalH, // Y軸反転（テクスチャUV座標系）
    uvScaleX: (endPxX - startPxX) / totalW,
    uvScaleY: (endPxY - startPxY) / totalH,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 緯度経度座標をグリッドローカル座標（メートル）に変換
 * originLat/originLonを原点とし、X=東方向、Z=南方向
 */
export function latLonToLocalXZ(
  lat: number,
  lon: number,
  originLat: number,
  originLon: number
): { x: number; z: number } {
  const EARTH_RADIUS = 6371000;
  const x =
    ((lon - originLon) * Math.PI / 180) *
    EARTH_RADIUS *
    Math.cos((originLat * Math.PI) / 180);
  const z = -((lat - originLat) * Math.PI / 180) * EARTH_RADIUS;
  return { x, z };
}
