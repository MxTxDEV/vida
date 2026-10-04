import type { Metadata, Viewport } from "next";
import { DotGothic16, Press_Start_2P } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const title = Press_Start_2P({
  variable: "--font-pixel-title",
  weight: "400",
  subsets: ["latin"],
});

const body = DotGothic16({
  variable: "--font-pixel-body",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vida",
  description: "Diário, finanças, academia, leitura, projetos e metas em forma de jogo",
};

export const viewport: Viewport = {
  themeColor: "#120c2e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${title.variable} ${body.variable} h-full`}>
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
