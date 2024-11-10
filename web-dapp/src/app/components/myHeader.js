import Image from "next/image";
import React from "react";
import ConnectButton from "./connectButton";
import { useWeb3ModalAccount } from "@web3modal/ethers5/react";

export default function MyHeader() {
  const { isConnected } = useWeb3ModalAccount();
  const logoSize = 70;
  return (
    <div className="myHeader">
      <div className="myHeaderMenu">
        {isConnected ? (
          <>
            <div
              onClick={() => (window.location.href = "/sell")}
              className="myHeaderMenuText"
            >
              Sell
            </div>
            <div
              onClick={() => (window.location.href = "/merge")}
              className="myHeaderMenuText"
            >
              Merge
            </div>
          </>
        ) : (
          <>
            <div className="myHeaderMenuText" />
            <div className="myHeaderMenuText" />
          </>
        )}
      </div>
      <Image onClick={() => (window.location.href = "/")} priority src="/logo.png" alt="logo" width={logoSize} height={logoSize} />
      <ConnectButton />
    </div>
  );
}
