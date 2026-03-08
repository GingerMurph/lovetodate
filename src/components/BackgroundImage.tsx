import heroBg from "@/assets/hero-bg.png";

export default function BackgroundImage() {
  return (
    <div className="fixed inset-0 z-0">
      <img src={heroBg} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
}
