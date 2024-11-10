"use client";
import React from "react";
import MyHeader from "./components/myHeader";
import { ethers } from "ethers";
import { abiTokens } from "@/contracts/properties";
import { getMetadata } from "@/api/getMetadata";
import { useRouter } from "next/navigation";

const optionsUSD = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

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
  const [metadatas, setMetadatas] = React.useState([]);
  const [usd, setUsd] = React.useState(0);
  const router = useRouter();

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

  const getPropertiesCounter = async () => {
    try {
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT,
        abiTokens,
        provider
      );
      const count = await contract.propertiesMinted();
      const array = new Array(count.toNumber()).fill(""); // to do the map
      const results = await Promise.all(
        array.map(async (_, index) => {
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
      const metadata = tempMetadata.map((metadata, index) => ({
        ...metadata,
        ...infos[index],
      }));
      setMetadatas(metadata);
      console.log(metadata);
    } catch (error) {
      console.error(error);
    }
  };

  /**
    const fetchAddress = async (index) => {
      try {
        let addressTemp = [...addresses];
        addressTemp[index] = await getAddressFromLatLon(37.7749, -122.4194);
        console.log(addressTemp);
        setAddresses(addressTemp);
      } catch (error) {
        console.error("Error fetching address:", error);
      }
    };
  */

  React.useEffect(() => {
    geUSD();
    getPropertiesCounter();
    //fetchAddress(0);
  }, []);
  return (
    <React.Fragment>
      <MyHeader />
      <div className="content">
        <div className="landingImage">
          <div className="landingImageText">
            Buy. Merge.
            <br />
            Sell. Property.
          </div>
        </div>
        <div className="landingContainer">
          <div className="landingContainerText">Assets Available</div>
          <div className="landingContainerText2">
            Based on Assets you recently owned
          </div>
          <div className="landingPropertiesContainer">
            {metadatas.map((metadata, index) => (
              <React.Fragment key={"Metadata:" + index}>
                {metadata.attributes.some(
                  (attribute) =>
                    attribute.value === "Full property" ||
                    attribute.value === "Fractional"
                ) &&
                  metadata.fractionAmount.toNumber() > 0 && (
                    <div className="propertyCard" key={"Property:" + index}>
                      <img
                        onClick={() =>
                          (window.location.href = "/property?id=" + index)
                        }
                        src={metadata.image}
                        className="propertyImg"
                      />
                      <div className="propertyTextBold">
                        {(
                          usd *
                          ethers.utils.formatEther(metadata.pricePerFraction)
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
                      <div className="propertyTextNormal">
                        {metadata.attributes[0].value} |{" "}
                        {metadata.attributes[3].value}m2 |{" "}
                        {metadata.attributes[4].value} |{" "}
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
                {metadata.attributes.some(
                  (attribute) => attribute.value === "Merge"
                ) && (
                  <div className="propertyCard" key={"Property:" + index}>
                    <img
                      onClick={() =>
                        (window.location.href = "/property?id=" + index)
                      }
                      src={metadata.image}
                      className="propertyImg"
                    />
                    <div className="propertyTextBold">
                      {(
                        usd *
                        ethers.utils.formatEther(metadata.pricePerFraction)
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
                    <div className="propertyTextNormal">
                      {metadata.isPublic ? "Public" : "Private"} |{" Merge"}
                    </div>
                    <div className="propertyTextNormal">
                      {/*
                addresses[0].substring(0, 40) + "..."
                */}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
