import type { Metadata } from "next";
import { DM_Sans, Exo_2 } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ 
  subsets: ["latin"], 
  variable: "--font-dm-sans" 
});
const exo2 = Exo_2({ 
  subsets: ["latin"], 
  variable: "--font-exo" 
});

export const metadata: Metadata = {
  title: "Tiempos de Entrega | Grupo Shuma",
  description: "Dashboard de operación logística de Grupo Shuma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${dmSans.variable} ${exo2.variable} font-sans min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
