import Image from "next/image";
import React from "react";
import ConnectButton from "./connectButton";

export default function MyHeader() {
  const logoSize = 70;
  return (
    <div className="myHeader">
      <div className="myHeaderMenu">
        <div className="myHeaderMenuText">Buy</div>
        <div className="myHeaderMenuText">Sell</div>
        <div className="myHeaderMenuText">Merge</div>
      </div>
      <Image src="/logo.png" alt="logo" width={logoSize} height={logoSize} />
      <ConnectButton />
    </div>
  );
}
