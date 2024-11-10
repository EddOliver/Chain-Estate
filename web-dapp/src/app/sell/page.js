"use client";
import { getMetadata } from "@/api/getMetadata";
import MyHeader from "@/app/components/myHeader";
import { abiTokens } from "@/contracts/properties";
import { Button, Input } from "@mui/material";
import {
  useWeb3ModalAccount,
  useWeb3ModalProvider,
} from "@web3modal/ethers5/react";
import { ethers, providers } from "ethers";
import React from "react";

const optionsUSD = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export default function Merge() {
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [usd, setUsd] = React.useState(0);
  const [metadatas, setMetadatas] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [amount, setAmount] = React.useState(1);
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC
  );
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_CONTRACT,
    abiTokens,
    provider
  );

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

  const getPropertiesByOwner = async () => {
    const properties = await contract.propertiesMinted();
    const array = new Array(properties.toNumber()).fill(""); // to do the map
    const res = await Promise.all(
      array.map(async (_, index) => contract.balanceOf(address, index))
    );
    const indexes = res
      .map((result, index) => (result.toNumber() > 0 ? index : null))
      .filter((index) => index !== null);
    const results = await Promise.all(
      indexes.map(async (index) => {
        const [info, uri, saleableFractions] = await Promise.all([
          contract.properties(index),
          contract.uri(index),
          contract.saleableFractionsMap(address, index),
        ]);
        return {
          info: {
            fractionAmount: res[index],
            pricePerFraction: info.pricePerFraction,
            isPublic: info.isPublic,
            tokenId: info.tokenId,
          },
          uri: uri,
          saleableFractions: saleableFractions.saleableFractions,
        };
      })
    );
    const infos = results.map((result) => result.info);
    const uris = results.map((result) => result.uri);
    const saleableFractions = results.map((result) => result.saleableFractions);
    const tempMetadata = await Promise.all(uris.map((uri) => getMetadata(uri)));
    const metadata = tempMetadata.map((metadata, index) => ({
      ...metadata,
      ...infos[index],
      saleableFractions: saleableFractions[index],
    }));
    setMetadatas(metadata);
    console.log(metadata);
  };

  const sell = async () => {
    const ethersProvider = new providers.Web3Provider(walletProvider);
    const wallet = ethersProvider.getSigner();
    const contractSigner = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT,
      abiTokens,
      wallet
    );
    const tx = await contractSigner.approveForSale(metadatas[selected].tokenId, amount);
    await tx.wait();
    getPropertiesByOwner();
  };

  const hasAtLeastTwoTrues = (arr) => arr.filter(Boolean).length >= 2;

  React.useEffect(() => {
    if (isConnected) {
      geUSD();
      getPropertiesByOwner();
    }
  }, []);

  return (
    <React.Fragment>
      <MyHeader />
      <div className="content">
        <div className="landingContainer">
          <div className="landingContainerText">Assets Available to Sell</div>
          <div className="landingContainerText2">
            You can select how many fractions you want to sell
          </div>
          <div className="landingPropertiesContainer">
            {metadatas.map((metadata, index) => (
              <React.Fragment key={"Metadata:" + index}>
                {metadata.attributes.some(
                  (attribute) =>
                    attribute.value === "Full property" ||
                    attribute.value === "Fractional"
                ) && (
                  <div
                    className={
                      selected === index
                        ? "propertyCardSelected"
                        : "propertyCard"
                    }
                    key={"Property:" + index}
                  >
                    <img
                      onClick={() => {
                        setSelected(index);
                      }}
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
                      Public Sale Fractions:{" "}
                      {metadata.saleableFractions.toNumber().toString()}
                    </div>
                    <div className="propertyTextNormal">
                      {metadata.attributes[0].value} |{" "}
                      {metadata.attributes[3].value}m2 |{" "}
                      {metadata.attributes[4].value} |{" "}
                      {metadata.isPublic ? "Public" : "Private"} |{" "}
                      {metadata.attributes[6].value}
                    </div>
                  </div>
                )}
                {metadata.attributes.some(
                  (attribute) => attribute.value === "Merge"
                ) && (
                  <div
                    className={
                      selected === index
                        ? "propertyCardSelected"
                        : "propertyCard"
                    }
                    key={"Property:" + index}
                  >
                    <img
                      onClick={() => {
                        setSelected(index);
                      }}
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
                      Public Sale Fractions:{" "}
                      {metadata.saleableFractions.toNumber().toString()}
                    </div>
                    <div className="propertyTextNormal">
                      {metadata.isPublic ? "Public" : "Private"} |{" Merge"}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
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
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="propertyTextNormal">Amount to sell:</div>
            <Input
              style={{ marginLeft: "10px" }}
              type="number"
              min="1"
              className="propertyTextNumber"
              defaultValue={1}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
            />
            <Button
              style={{ marginTop: "10px" }}
              variant="contained"
              color="darkShadow"
              onClick={() => sell()}
              disabled={selected === null}
            >
              <div style={{ color: "white" }}>Sell</div>
            </Button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
