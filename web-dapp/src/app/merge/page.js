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
  const [selected, setSelected] = React.useState([]);
  const [amounts, setAmounts] = React.useState([]);
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
        const [info, uri] = await Promise.all([
          contract.properties(index),
          contract.uri(index),
        ]);
        return {
          info: {
            fractionAmount: res[index],
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
    const tempMetadata = await Promise.all(uris.map((uri) => getMetadata(uri)));
    const metadata = tempMetadata.map((metadata, index) => ({
      ...metadata,
      ...infos[index],
    }));
    setSelected(new Array(metadata.length).fill(false));
    setAmounts(new Array(metadata.length).fill(1));
    setMetadatas(metadata);
    console.log(metadata);
  };

  const merge = async () => {
    const indexes = selected
      .map((selection, index) =>
        selection ? metadatas[index].tokenId.toNumber() : null
      )
      .filter((index) => index !== null);
    const ethersProvider = new providers.Web3Provider(walletProvider);
    const wallet = ethersProvider.getSigner();
    const contractSigner = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT,
      abiTokens,
      wallet
    );
    const tokens = indexes;
    const amountsTemp = indexes.map((index) => amounts[index]);
    let tx = await contractSigner.mergeTokens(tokens, amountsTemp, amount);
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
          <div className="landingContainerText">Assets Available to Merge</div>
          <div className="landingContainerText2">
            This process cannot be undone at this time, so please choose
            carefully.
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
                      selected[index] ? "propertyCardSelected" : "propertyCard"
                    }
                    key={"Property:" + index}
                  >
                    <img
                      onClick={() => {
                        const newSelected = [...selected];
                        newSelected[index] = !selected[index];
                        setSelected(newSelected);
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
                      {metadata.attributes[0].value} |{" "}
                      {metadata.attributes[3].value}m2 |{" "}
                      {metadata.attributes[4].value} |{" "}
                      {metadata.isPublic ? "Public" : "Private"} |{" "}
                      {metadata.attributes[6].value}
                    </div>
                    {metadata.fractionAmount.toNumber() > 1 && (
                      <div className="propertyTextNormal">
                        Amount to merge:
                        <Input
                          style={{ marginLeft: "10px" }}
                          type="number"
                          min="1"
                          max={metadata.fractionAmount.toNumber()}
                          className="propertyTextNumber"
                          defaultValue={1}
                          onChange={(e) => {
                            let amountsTemp = [...amounts];
                            amountsTemp[index] = e.target.value;
                            setAmounts(amountsTemp);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {metadata.attributes.some(
                  (attribute) => attribute.value === "Merge"
                ) && (
                  <div className="propertyCard" key={"Property:" + index}>
                    <img src={metadata.image} className="propertyImg" />
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
            <div className="propertyTextNormal">New Fraction Amount:</div>
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
              onClick={() => merge()}
              disabled={!hasAtLeastTwoTrues(selected)}
            >
              <div style={{ color: "white" }}>Merge</div>
            </Button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
