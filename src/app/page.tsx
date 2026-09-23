import { Pixeles } from "@/shared/ui/Pixeles";
import { HomeView } from "@/views/home/HomeView";

export default function Page() {
  return (
    <>
      <HomeView />
      {/* Solo en la landing: el panel (/panel) no debe medirse a sí mismo. */}
      <Pixeles />
    </>
  );
}
