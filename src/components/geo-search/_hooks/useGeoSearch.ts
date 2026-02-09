import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseCoordinateString, normalizeCoordinateString } from "@/lib/coordinates";

interface LocationInfo {
  prefecture: string;
  city: string;
  fullAddress: string;
  shortAddress: string;
}

interface JudgmentResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useGeoSearch() {
  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);

  const searchParams = useSearchParams();
  const initialSearchDone = useRef(false);

  // Parse coordinate input
  const handleCoordinateInput = useCallback((value: string) => {
    setCoordinateInput(value);
    const parsed = parseCoordinateString(value);
    if (parsed) {
      setLatitude(parsed.lat);
      setLongitude(parsed.lon);
      setCoordinateInput(normalizeCoordinateString(value));
    } else {
      setLatitude("");
      setLongitude("");
    }
  }, []);

  // Get location from coordinates
  const getLocationFromCoordinates = async (lat: number, lon: number): Promise<LocationInfo | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja&addressdetails=1&zoom=18`
      );
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }
      const data = await response.json();

      const address = data.address || {};
      const fullCityName = address.city || address.town || address.village || address.municipality || "";
      const wardName = address.suburb || address.neighbourhood || "";

      let cityName = fullCityName;
      if (fullCityName.includes("市")) {
        if (fullCityName.includes("区")) {
          cityName = fullCityName;
        } else {
          if (wardName && wardName.includes("区")) {
            cityName = fullCityName + wardName;
          } else {
            cityName = fullCityName.split("市")[0] + "市";
          }
        }
      }

      const prefectureName = address.state || address.prefecture || "";
      const area =
        (address.neighbourhood && !address.neighbourhood.includes("区") ? address.neighbourhood : "") ||
        (address.suburb && !address.suburb.includes("区") ? address.suburb : "") ||
        address.quarter || address.hamlet || address.village || "";
      const road = address.road || "";
      const houseNumber = address.house_number || "";

      const shortAddress = [prefectureName, cityName, area, road, houseNumber].filter(Boolean).join("");
      const fullAddress = (data.display_name || "").trim();

      return { prefecture: prefectureName, city: cityName, fullAddress, shortAddress };
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  // Run search
  const runSearch = useCallback(
    async (override?: { lat: number; lon: number; prefecture: string }) => {
      const lat = override ? override.lat : parseFloat(latitude);
      const lon = override ? override.lon : parseFloat(longitude);
      const pref = override ? override.prefecture : prefecture;
      if (isNaN(lat) || isNaN(lon) || !pref) return;

      setHasSearched(true);
      setResult(null);
      setIsLoading(true);

      try {
        const location = await getLocationFromCoordinates(lat, lon);
        if (location) setLocationInfo(location);

        const response = await fetch("/api/legal-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lon, prefecture: pref }),
        });
        if (!response.ok) {
          throw new Error(`Legal check API error: ${response.status}`);
        }
        const data: JudgmentResult = await response.json();
        setResult(data);
      } catch (error) {
        console.error("Judgment error:", error);
        alert("判定に失敗しました。もう一度お試しください。");
      } finally {
        setIsLoading(false);
      }
    },
    [latitude, longitude, prefecture]
  );

  const handleSearch = useCallback(() => runSearch(), [runSearch]);

  // Handle copy
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }, []);

  // URL parameters for auto-search
  useEffect(() => {
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const prefectureParam = searchParams.get("prefecture");
    if (!latParam || !lonParam || !prefectureParam || initialSearchDone.current) return;
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (isNaN(lat) || isNaN(lon)) return;

    initialSearchDone.current = true;
    setCoordinateInput(`${latParam},${lonParam}`);
    setLatitude(latParam);
    setLongitude(lonParam);
    setPrefecture(prefectureParam);
    runSearch({ lat, lon, prefecture: prefectureParam });
  }, [searchParams, runSearch]);

  // Get Mapple URL
  const getMappleUrl = useCallback(() => {
    if (!latitude || !longitude) return null;
    const lat = latitude.trim();
    const lng = longitude.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${lat}/${lng}`;
  }, [latitude, longitude]);

  return {
    coordinateInput,
    latitude,
    longitude,
    prefecture,
    result,
    isLoading,
    hasSearched,
    copiedText,
    locationInfo,
    setPrefecture,
    handleCoordinateInput,
    handleSearch,
    handleCopy,
    getMappleUrl,
  };
}
