"use client";
import { getMetadata } from "@/api/getMetadata";
import MyHeader from "@/app/components/myHeader";
import { abiTokens } from "@/contracts/properties";
import { ethers } from "ethers";
import React, { useRef, useState } from "react";
import { Feature } from "ol";
import Map from "ol/Map";
import View from "ol/View";
import { Circle, Polygon } from "ol/geom";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { Fill, Style, Stroke, Text } from "ol/style";

const optionsUSD = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

function haversineDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateZoomLevel(coordinates, mapWidth, mapHeight) {
  const R = 6371000; // Earth's radius in meters

  // Step 1: Determine the bounding box
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLon = Infinity,
    maxLon = -Infinity;

  coordinates.forEach(([lon, lat]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  });

  // Step 2: Convert latitude and longitude differences to meters
  const latDistance = haversineDistance([minLon, minLat], [minLon, maxLat]);
  const lonDistance = haversineDistance([minLon, minLat], [maxLon, minLat]);

  // Step 3: Choose the larger of the two distances
  const maxDistance = Math.max(latDistance, lonDistance);

  // Step 4: Estimate zoom level based on distance and map dimensions
  // These values are approximate; you may need to adjust them based on your specific map.
  const zoomLevel = Math.floor(
    8 - Math.log(maxDistance / Math.max(mapWidth, mapHeight)) / Math.log(2)
  );

  return Math.max(0, Math.min(zoomLevel, 21)); // Ensure zoom level is within [0, 21]
}

function getCentralPoint(coords) {
  let x = 0,
    y = 0,
    z = 0;

  coords.forEach(([lon, lat]) => {
    // Convert latitude and longitude from degrees to radians
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    // Convert to Cartesian coordinates
    x += Math.cos(latRad) * Math.cos(lonRad);
    y += Math.cos(latRad) * Math.sin(lonRad);
    z += Math.sin(latRad);
  });

  // Average the Cartesian coordinates
  const total = coords.length;
  x /= total;
  y /= total;
  z /= total;

  // Convert averaged Cartesian coordinates back to latitude and longitude
  const centralLon = Math.atan2(y, x);
  const centralHyp = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralHyp);

  // Convert back to degrees
  return {
    longitude: (centralLon * 180) / Math.PI,
    latitude: (centralLat * 180) / Math.PI,
  };
}

function hexToRGBA(hex) {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16),
    a = parseInt(hex.slice(7, 9), 16) / 255;
  return [r, g, b, a];
}

async function getAddressFromLatLon(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "YourAppName/1.0 (your_email@example.com)",
      },
    });

    const data = await response.json();
    return data.display_name; // Return only the display_name field
  } catch (error) {
    console.error("Error fetching address:", error);
    return null; // Return null in case of an error
  }
}

export default function Property() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC
  );
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_CONTRACT,
    abiTokens,
    provider
  );
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const id = urlParams.get("id");
  const [usd, setUsd] = React.useState(0);
  // Not Merged
  const [metadata, setMetadata] = React.useState({});
  const [address, setAddress] = React.useState("");
  // Merged
  const [metadatas, setMetadatas] = React.useState([]);
  // Maps
  const map = useRef();
  const isMounted = useRef(false);

  const fetchMetadata = async () => {
    const properties = await contract.propertiesMinted();
    const uri = await contract.uri(id);
    let tempMetadata = await getMetadata(uri);
    let info = await contract.properties(id);
    info = {
      fractionAmount: info.fractionAmount,
      pricePerFraction: info.pricePerFraction,
      isPublic: info.isPublic,
      tokenId: info.tokenId,
    };
    const meta = { ...tempMetadata, ...info };
    if (meta.attributes.some((attribute) => attribute.value === "Merge")) {
      const indexes = meta.attributes[0].value;
      const results = await Promise.all(
        indexes.map(async (index) => {
          const [info, uri] = await Promise.all([
            contract.properties(index),
            contract.uri(index),
          ]);
          return {
            info: {
              fractionAmount: info.fractionAmount,
              pricePerFraction: info.pricePerFraction,
              isPublic: info.isPublic,
              tokenId: info.tokenId,
            },
            uri: uri,
          };
        })
      );
      const infos = results.map((result) => result.info);
      const uris = results.map((result) => result.uri);
      const tempMetadata = await Promise.all(
        uris.map((uri) => getMetadata(uri))
      );
      const met = tempMetadata.map((meta, index) => ({
        ...meta,
        ...infos[index],
      }));
      const coordinates = met.map((meta) => {
        const temp = meta.attributes[2].value.split(", ");
        return [parseFloat(temp[1]), parseFloat(temp[0])];
      });
      setMetadatas(met);
      setupMapMerge(coordinates);
    } else {
      const temp = meta.attributes[2].value.split(", ");
      const addr = await getAddressFromLatLon(
        parseFloat(temp[0]),
        parseFloat(temp[1])
      );
      setAddress(addr);
      setupMapNoMerge([parseFloat(temp[1]), parseFloat(temp[0])]);
    }
    setMetadata(meta);
  };

  const setupMapMerge = async (coords) => {
    let coords2 = getCentralPoint(coords);
    if (!isMounted.current) return;
    map.current = new Map({
      target: "map",
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            crossOrigin: "anonymous",
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([coords2.longitude, coords2.latitude]),
        zoom: 14,
      }),
    });
    const circles = coords.map((coord) => {
      const circle = new Circle(fromLonLat(coord), 200);
      const circleFeature = new Feature({
        geometry: circle,
      });
      return circleFeature;
    });
    const vectorSource = new VectorSource({
      projection: "EPSG:4326",
    });
    vectorSource.addFeatures(circles);
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: [
        new Style({
          fill: new Fill({
            color: hexToRGBA("#fce700" + "77"),
          }),
          stroke: new Stroke({
            color: hexToRGBA("#fce700" + "FF"),
            width: 3,
          }),
          text: new Text({
            text: "Property",
            font: `bold 15px sans-serif`,
            fill: new Fill({ color: hexToRGBA("#000000FF") }),
            overflow: true,
            textAlign: "center",
          }),
        }),
      ],
    });
    map.current.addLayer(vectorLayer);
  };

  const setupMapNoMerge = async (coords) => {
    if (!isMounted.current) return;
    map.current = new Map({
      target: "map",
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            crossOrigin: "anonymous",
          }),
        }),
      ],
      view: new View({
        center: fromLonLat(coords),
        zoom: 18,
      }),
    });
    const circle = new Circle(fromLonLat(coords), 30);
    const circleFeature = new Feature({
      geometry: circle,
    });
    const vectorSource = new VectorSource({
      projection: "EPSG:4326",
    });
    vectorSource.addFeatures([circleFeature]);
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: [
        new Style({
          fill: new Fill({
            color: hexToRGBA("#fce700" + "77"),
          }),
          stroke: new Stroke({
            color: hexToRGBA("#fce700" + "FF"),
            width: 3,
          }),
          text: new Text({
            text: "Property",
            font: `bold 15px sans-serif`,
            fill: new Fill({ color: hexToRGBA("#000000FF") }),
            overflow: true,
            textAlign: "center",
          }),
        }),
      ],
    });
    map.current.addLayer(vectorLayer);
  };

  const geUSD = async () => {
    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    var requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
      requestOptions
    );
    const result = await response.json();
    const usd = result.binancecoin.usd;
    setUsd(usd);
  };

  React.useEffect(() => {
    isMounted.current = true;
    //geUSD();
    //fetchMetadata();
  }, []);

  return (
    <React.Fragment>
      <MyHeader />
      <div className="contentProperty">
        <div id="map" style={{ height: "90vh", width: "50vw" }} />
        {Object.keys(metadata).length > 0 &&
          metadata.attributes.some(
            (attribute) =>
              attribute.value === "Full property" ||
              attribute.value === "Fractional"
          ) && (
            <div className="propertyPageCard">
              <img src={metadata.image} className="propertyPageImg" />
              <div className="propertyPageTextBold">
                {(
                  usd * ethers.utils.formatEther(metadata.pricePerFraction)
                ).toLocaleString("en-US", optionsUSD)}{" "}
                USD |{" "}
                {parseFloat(
                  ethers.utils.formatEther(metadata.pricePerFraction)
                ).toFixed(2)}{" "}
                BNB{" "}
                {metadata.fractionAmount.toNumber() > 1 &&
                  "| " +
                    metadata.fractionAmount.toNumber().toString() +
                    " Fractions"}
              </div>
              <div className="propertyPageTextNormal">
                {address?.substring(0, 40) + "..."}
              </div>
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#eeeeeeaa",
                  margin: "15px 0px 5px 0px",
                }}
              />
              <div
                className="propertyPageTextNormal"
                style={{ paddingLeft: "20px" }}
              >
                Property Attributes:
              </div>
              <div className="propertyPageAttributes">
                {metadata.attributes.map((attribute) => (
                  <div className="propertyPageAttribute" key={attribute.value}>
                    <div className="propertyPageTextNormalAttribute">
                      {attribute.trait_type}
                    </div>
                    <div className="propertyPageTextNormalAttribute">
                      {attribute.trait_type === "Coordinates"
                        ? "Lat: " +
                          parseFloat(attribute.value.split(", ")[0]).toFixed(
                            4
                          ) +
                          " Lon: " +
                          parseFloat(attribute.value.split(", ")[1]).toFixed(4)
                        : attribute.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        {Object.keys(metadata).length !== 0 &&
          metadata.attributes.some(
            (attribute) => attribute.value === "Merge"
          ) && (
            <div className="propertyPageCard">
              <img src={metadata.image} className="propertyPageImg" />
              <div className="propertyTextBold">
                {(
                  usd * ethers.utils.formatEther(metadata.pricePerFraction)
                ).toLocaleString("en-US", optionsUSD)}{" "}
                USD |{" "}
                {parseFloat(
                  ethers.utils.formatEther(metadata.pricePerFraction)
                ).toFixed(2)}{" "}
                BNB{" "}
                {metadata.fractionAmount.toNumber() > 1 &&
                  "| " +
                    metadata.fractionAmount.toNumber().toString() +
                    " Fractions"}
              </div>
              <div className="landingPropertiesContainer" style={{ width: "100%" }}>
                {metadatas.map((metadata, index) => (
                  <React.Fragment key={"Metadata:" + index}>
                    {metadata.attributes.some(
                      (attribute) =>
                        attribute.value === "Full property" ||
                        attribute.value === "Fractional"
                    ) && (
                      <div className={"propertyCard"}  key={"Property:" + index}>
                        <img src={metadata.image} className="propertyImg" />
                        <div className="propertyTextNormal">
                          {metadata.attributes[0].value} |{" "}
                          {metadata.attributes[3].value}m2 |{" "}
                          {metadata.attributes[4].value} |{" "}
                          {metadata.isPublic ? "Public" : "Private"} |{" "}
                          {metadata.attributes[6].value}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
      </div>
    </React.Fragment>
  );
}
