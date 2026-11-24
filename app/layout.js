import "./globals.css";
import DataProvider from "@/components/DataProvider";
import AppShell from "@/components/AppShell";
import ErrorToast from "@/components/ErrorToast";

export const metadata = {
  title: "KuliahKu",
  description: "Pengingat deadline tugas & kalkulator IPK realtime",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#FFFBEF] text-slate-800 antialiased">
        <DataProvider>
          <AppShell>{children}</AppShell>
          <ErrorToast />
        </DataProvider>
      </body>
    </html>
  );
}
