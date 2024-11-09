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

function hexToRGBA(hex) {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16),
    a = parseInt(hex.slice(7, 9), 16) / 255;
  return [r, g, b, a];
}

async function getAddressFromLatLon(latitude, longitude) {
  const url =
    "https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json";

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

export default function Landing() {
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
  const [metadata, setMetadata] = React.useState({});
  const map = useRef();
  const isMounted = useRef(false);
  const [coords, setCoords] = useState([0, 0]);

  const fetchMetadata = async () => {
    const uri = await contract.uri(id);
    let tempMetadata = await getMetadata(uri);
    let info = await contract.properties(id);
    info = {
      fractionAmount: info.fractionAmount,
      pricePerFraction: info.pricePerFraction,
      isPublic: info.isPublic,
      tokenId: info.tokenId,
    };
    const metadata = { ...tempMetadata, ...info };
    const temp = metadata.attributes[2].value.split(", ");
    setCoords([parseFloat(temp[1]), parseFloat(temp[0])]);
    setMetadata(metadata);
  };

  React.useEffect(() => {
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
  }, [coords]);

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
    fetchMetadata();
  }, []);

  return (
    <React.Fragment>
      <MyHeader />
      <div className="contentProperty">
        <div id="map" style={{ height: "90vh", width: "50vw" }} />
        {Object.keys(metadata).length !== 0 &&
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
                {metadata.attributes[0].value} | {metadata.attributes[3].value}
                m2 | {metadata.attributes[4].value} |{" "}
                {metadata.isPublic ? "Public" : "Private"} |{" "}
                {metadata.attributes[6].value}
              </div>
              <div className="propertyTextNormal">
                {/*
                addresses[0].substring(0, 40) + "..."
                */}
              </div>
            </div>
          )}
        {Object.keys(metadata).length !== 0 &&
          metadata.attributes.some(
            (attribute) => attribute.value === "Merge"
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
                {metadata.attributes[0].value} | {metadata.attributes[3].value}
                m2 | {metadata.attributes[4].value} |{" "}
                {metadata.isPublic ? "Public" : "Private"} |{" "}
                {metadata.attributes[6].value}
              </div>
              <div className="propertyTextNormal">
                {/*
                addresses[0].substring(0, 40) + "..."
                */}
              </div>
            </div>
          )}
      </div>
    </React.Fragment>
  );
}
