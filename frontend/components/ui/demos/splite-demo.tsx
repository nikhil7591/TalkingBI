'use client';

import { Card } from "@/components/ui/card";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

export function SplineSceneBasic() {
  return (
    <Card className="relative h-[500px] w-full overflow-hidden bg-white">
      <Spotlight className="-top-20 left-20" />

      <div className="flex h-full">
        <div className="relative z-10 flex flex-1 flex-col justify-center p-8">
          <h1 className="bg-gradient-to-b from-slate-950 to-slate-600 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Interactive 3D
          </h1>
          <p className="mt-4 max-w-lg text-slate-600">
            Bring your UI to life with beautiful 3D scenes. Create immersive experiences
            that capture attention and enhance your design.
          </p>
        </div>

        <div className="relative flex-1">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="h-full w-full"
          />
        </div>
      </div>
    </Card>
  );
}
