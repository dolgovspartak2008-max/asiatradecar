import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return <Link className="logo" href="/" aria-label="ASIA TRADE CAR — на главную">
    <Image src="/media/asia-trade-car-logo.png" alt="" width={1334} height={803} priority />
  </Link>;
}
