"use client";
import { ContextProvider } from "@/app/utils/contextModule";
import { Web3Modal } from "@/app/utils/web3Modal";
import { ThemeProvider, createTheme } from "@mui/material";
import { common } from "@mui/material/colors";
import { light } from "@mui/material/styles/createPalette";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const theme = createTheme({
  palette: {
    darkShadow: {
      main: common.black,
    }
  },
});

export default function Providers({ children }) {
  return (
    <ContextProvider>
      <ToastContainer />
        <ThemeProvider theme={theme}>
          <Web3Modal>{children}</Web3Modal>
        </ThemeProvider>
    </ContextProvider>
  );
}
