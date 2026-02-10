import React, { ReactNode } from "react";
import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.scss";
import "./App.scss";

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
