"use client";

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type Item = { title: string; body: string };

const items: Item[] = [
  { title: "Zero‑Shot Policy Learning", body: "Foundation models + VLM pretraining to generalize skills without task‑specific labels." },
  { title: "Jetson Orin NX Benchmarks", body: "INT8 quantization, TensorRT pipelines, and real‑time SLAM on edge compute." },
  { title: "Sim‑to‑Real Transfer", body: "Domain randomization in Isaac Gym with on‑robot RL fine‑tuning for stability." },
  { title: "Self‑Supervised Navigation", body: "Contrastive pretraining and trajectory cloning for map‑free navigation indoors." },
  { title: "GRASP: Few‑Shot Manipulation", body: "Prompted grasp synthesis using geometric priors on novel objects with minimal demos." },
  { title: "Safety & Compliance", body: "Operational governance with ISO 10218/TS 15066 and risk assessment playbooks." },
  { title: "Perception: Multi‑View Fusion", body: "Faster depth fusion and 3D occupancy mapping with CUDA‑accelerated pipelines." },
  { title: "Planning With LLMs", body: "Task decomposition and tool‑use for embodied agents with structured constraints." },
  { title: "ROS 2 Stack Updates", body: "Jazzy/Iron upgrades, improved QoS profiles, and deterministic control loops." },
  { title: "Fleet Ops & MLOps", body: "OTA updates, dataset curation, eval gates, and rollback strategies for robots." },
  { title: "Tactile + Vision", body: "Sensor fusion for manipulation under occlusion and variable lighting." },
  { title: "Warehouse AMRs", body: "Traffic mgmt, mission scheduling, and SLAM robustness in mixed‑traffic aisles." },
];

export default function ResearchCarousel() {
  const [api, setApi] = React.useState<CarouselApi | null>(null);

  React.useEffect(() => {
    if (!api) return;
    const id = setInterval(() => {
      api.scrollNext();
    }, 4000);
    return () => clearInterval(id);
  }, [api]);

  return (
    <div className="relative">
      <Carousel opts={{ align: "start", loop: true }} setApi={setApi} className="w-full">
        <CarouselContent>
          {items.map((item, idx) => (
            <CarouselItem key={idx} className="md:basis-1/2 lg:basis-1/3">
              <article className="h-full w-full rounded-lg p-4 bg-white dark:bg-zinc-900 border shadow-sm">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{item.body}</p>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4" />
        <CarouselNext className="-right-4" />
      </Carousel>
    </div>
  );
}

