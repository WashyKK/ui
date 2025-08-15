import Image from "next/image";

export default function TeamPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 space-y-10">
      <section className="w-full max-w-5xl text-center">
        <h1 className="text-3xl font-semibold mb-2">Our Team</h1>
        <div className="h-0.5 w-24 bg-accent mx-auto mb-6 rounded-full" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We bring deep experience across robotics, AI, and large‑scale systems engineering.
        </p>
      </section>

      <section className="w-full max-w-4xl">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="rounded-xl overflow-hidden border bg-gray-50">
            <Image
              src="/ceo.jpg"
              alt="CEO portrait"
              width={240}
              height={240}
              className="object-cover w-[240px] h-[240px]"
            />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-semibold">Chief Executive Officer</h2>
            <p className="text-muted-foreground mt-2">
              Leads product strategy, enterprise partnerships, and operational execution across our robotics portfolio.
              Prior experience spans embedded AI, autonomy stacks, and launching production‑grade robotic systems.
            </p>
            <ul className="mt-4 text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Focus: autonomy, safety/governance, GTM alignment</li>
              <li>Programs: Jetson Orin NX edge deployment, sim‑to‑real research</li>
              <li>Commitment: reliability, measurable ROI, and responsible AI</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

