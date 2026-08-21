import type { Metadata } from "next";
import { DM_Sans, Exo_2 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FontScaleProvider } from "@/lib/fontScaleContext";

const dmSans = DM_Sans({ 
  subsets: ["latin"], 
  variable: "--font-dm-sans" 
});
// preload desactivado a proposito. El App Router vuelve a inyectar las
// etiquetas <link rel="preload"> en cada navegacion del cliente, y el
// navegador avisa de cada preload que ya no usa porque la fuente ya estaba
// cargada. Eran ~75 advertencias por sesion tapando errores reales.
//
// DM Sans si conserva preload: es el texto corrido y se ve en el primer
// pintado. Exo 2 y Neuropol son titulos e identidad, y con display swap
// entran sin salto perceptible.
const exo2 = Exo_2({ 
  subsets: ["latin"], 
  variable: "--font-exo",
  display: "swap",
  preload: false
});

// Neuropol es la tipografia de identidad de Grupo Shuma. Licencia CC0, sin
// derechos reservados, asi que puede auto-hospedarse. Se convirtio de OTF a
// WOFF2 y bajo de 51 KB a 30 KB.
//
// Se reserva para la portada y los rotulos de identidad. En texto corrido no
// funciona: es una display geometrica de mayusculas dominantes, con poca
// diferencia entre caracteres.
const neuropol = localFont({
  src: "../public/fonts/Neuropol-Regular.woff2",
  variable: "--font-neuropol",
  display: "swap",
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: "Tablero Operativo | Grupo Shuma",
  description: "Indicadores operativos por área de Grupo Shuma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('shuma-bi-font-scale');if(s&&[1,1.15,1.3,1.5].indexOf(parseFloat(s))>-1){document.documentElement.style.setProperty('--font-scale',s);}}catch(e){}}())`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${exo2.variable} ${neuropol.variable} font-sans min-h-screen`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={true}
        >
          <FontScaleProvider>
            {children}
          </FontScaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
