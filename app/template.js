// template.js dibuat ulang setiap pindah halaman,
// jadi animasi fade-up ini jalan tiap kali berpindah menu.
export default function Template({ children }) {
  return <div className="animate-fade-up">{children}</div>;
}
