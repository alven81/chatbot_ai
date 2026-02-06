import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Chatbot AI",
  description: "AI Chatbot powered by LangChain",
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
