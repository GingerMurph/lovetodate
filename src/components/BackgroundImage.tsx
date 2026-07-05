import heroBg from "@/assets/hero-bg.png";

export default function BackgroundImage() {
  return (
    <>
      <img
        src={heroBg}
        alt=""
        width={1920}
        height={1080}
        fetchPriority="high"
        decoding="async"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: -1 }}
      />
      <div
        className="fixed inset-0 bg-background/70 pointer-events-none"
        style={{ zIndex: -1 }}
      />
    </>
  );
}
