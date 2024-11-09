import NoSSRWrapper from "@/app/components/noSSR";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./components/providers";
import "./globals.css";

export const metadata = {
  title: "Chain Estate",
  description: "Chain Estate UI",
  icons: {
    icon: "/icon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.ico" />
      </head>
      <body>
        <NoSSRWrapper>
          <Providers>{children}</Providers>
          <Analytics />
        </NoSSRWrapper>
      </body>
    </html>
  );
}
