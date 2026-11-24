import Link from "next/link";

export default function Logo({ href = "/", large = false }) {
  const box = large ? "h-7 w-7" : "h-5 w-5";
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className={`relative ${large ? "h-9 w-12" : "h-7 w-9"}`}>
        <span className={`absolute left-0 top-1 ${box} rotate-45 rounded-[4px] bg-yellow-400`} />
        <span
          className={`absolute ${large ? "left-4" : "left-3"} top-1 ${box} rotate-45 rounded-[4px] bg-orange-300/80`}
        />
      </span>
      <span className={`${large ? "text-2xl" : "text-lg"} font-bold tracking-tight`}>KuliahKu</span>
    </Link>
  );
}
