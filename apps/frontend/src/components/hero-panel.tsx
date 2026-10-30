import Image from "next/image";

export function HeroPanel() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl">
      <Image
        src="/hero.jpg"
        alt="Hero banner"
        width={1400}
        height={800}
        className="w-full h-auto"
        priority
      />
    </div>
  );
}
