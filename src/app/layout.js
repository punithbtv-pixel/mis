import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "PowerHouse MIS",
  description: "ZYN Electrical power house daily monitoring & dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
