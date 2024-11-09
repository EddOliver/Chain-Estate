"use client";
import { Button } from "@mui/material";
import { useWeb3Modal, useWeb3ModalAccount } from "@web3modal/ethers5/react";
import { Fragment } from "react";

export default function ConnectButton() {
  // 4. Use modal hook
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();

  return (
    <Fragment>
      <Button variant="contained" color="darkShadow" onClick={() => open()}>
        <div style={{ color: "white" }}>
          {isConnected
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect Wallet"}
        </div>
      </Button>
    </Fragment>
  );
}
