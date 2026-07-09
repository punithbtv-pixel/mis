import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "ZYN ELECTRICAL MIS",
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
        <footer className="text-left text-xs text-slate-400 py-4">
          Developed by Punith L Naik
        </footer>
      </body>
    </html>
  );
}
