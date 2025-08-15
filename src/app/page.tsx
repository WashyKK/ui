import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 space-y-12">
      {/* Hero */}
      <section className="w-full">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-gradient-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900/40 px-6 py-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Enterprise Robotics & AI Systems</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
            Scalable Autonomy for Real‑World Operations
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            We design, integrate, and operate robotics platforms for critical environments —
            from humanoid R&D to industrial automation — with reliability, governance, and safety at the core.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid gap-10 md:grid-cols-3 text-center">
        {[
          { src: "/humanoid.png", title: "Humanoid", desc: "Mimics human behavior and interactions." },
          { src: "/mobile.png", title: "Mobile", desc: "Autonomous outdoor & indoor navigation." },
          { src: "/industrial.png", title: "Industrial", desc: "Optimized for robust factory automation." },
        ].map(({ src, title, desc }) => (
          <div key={title} className="flex flex-col items-center">
            <Image src={src} alt={`${title} robots`} width={200} height={200} />
            <h3 className="mt-2 text-xl font-semibold">{title}</h3>
            <p className="text-gray-500 text-sm">{desc}</p>
          </div>
        ))}
      </section>

      {/* Use Cases */}
      <section className="max-w-4xl w-full text-center">
        <h2 className="text-2xl font-semibold mb-2">Applications</h2>
        <div className="h-0.5 w-24 bg-accent mx-auto mb-6 rounded-full" />
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Elffie Robotics technology is trusted across diverse domains.
        </p>
        <div className="grid md:grid-cols-2 gap-6 text-left">
          <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            <h4 className="font-semibold">Disaster Response</h4>
            <p className="text-sm">Mobile robots deployed in search-and-rescue missions across rugged terrain.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            <h4 className="font-semibold">Smart Warehousing</h4>
            <p className="text-sm">Autonomous industrial robots streamline logistics and inventory management.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            <h4 className="font-semibold">Agritech Automation</h4>
            <p className="text-sm">Robots that monitor crops, automate irrigation, and optimize yields.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            <h4 className="font-semibold">Education & R&D</h4>
            <p className="text-sm">Affordable robots to support STEM programs and university research labs.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl w-full text-center mx-auto px-4 py-12">
        <h2 className="text-3xl font-semibold mb-2">What Our Partners Say</h2>
        <div className="h-0.5 w-24 bg-accent mx-auto mb-8 rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <p className="text-gray-700 dark:text-gray-300 italic">
              “Elffie Robotics has been instrumental in helping us prototype fast and scale smart systems for emerging markets.”
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">
              — Mr. Steve Nyaga, CEO, BrainGrid Tech
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <p className="text-gray-700 dark:text-gray-300 italic">
              “Their technical agility and focus on autonomous robotics sets a new standard in climate-smart automation.”
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">
              — Felix Wanyoike, CTO, Qualis Labs
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <p className="text-gray-700 dark:text-gray-300 italic">
              “Reliable, visionary, and execution-focused—Elffie has been our go-to partner for scalable robotics integrations.”
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">
              — Rodney Osodo, CEO, Qualis Labs
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <p className="text-gray-700 dark:text-gray-300 italic">
              “Working with Elffie enabled our engineering programs to embed advanced robotics into real-world applications.”
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">
              — Heritage Anziya, Programs Lead, GeHarashim Engineering
            </p>
          </div>
        </div>
      </section>

      {/* Research & News (moving) */}
      <section className="w-full max-w-5xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Current Research & News</h2>
        <div className="marquee rounded-2xl border bg-white/60 dark:bg-zinc-800/60">
          <div className="marquee__track gap-4 p-4">
            {[
              { title: "Zero‑Shot Policy Learning", body: "Foundation models + VLM pretraining to generalize skills without task‑specific labels." },
              { title: "Jetson Orin NX Benchmarks", body: "INT8 quantization, TensorRT pipelines, and real‑time SLAM on edge compute." },
              { title: "Sim‑to‑Real Transfer", body: "Domain randomization in Isaac Gym with on‑robot RL fine‑tuning for stability." },
              { title: "Self‑Supervised Navigation", body: "Contrastive pretraining and trajectory cloning for map‑free navigation indoors." },
              { title: "GRASP: Few‑Shot Manipulation", body: "Prompted grasp synthesis using geometric priors on novel objects with minimal demos." },
              { title: "Safety & Compliance", body: "Operational governance with ISO 10218/TS 15066 guidelines and risk assessment playbooks." },
              { title: "Perception: Multi‑View Fusion", body: "Faster depth fusion and 3D occupancy mapping with CUDA‑accelerated pipelines." },
              { title: "Planning With LLMs", body: "Task decomposition and tool‑use for embodied agents with structured constraints." },
              { title: "ROS 2 Stack Updates", body: "Jazzy/Iron upgrades, improved QoS profiles, and deterministic control loops." },
              { title: "Fleet Ops & MLOps", body: "Over‑the‑air updates, dataset curation, eval gates, and rollback strategies for robots." },
              { title: "Tactile + Vision", body: "Sensor fusion for robust manipulation under occlusion and variable lighting." },
              { title: "Warehouse AMRs", body: "Traffic management, mission scheduling, and SLAM robustness in mixed‑traffic aisles." },
            ].flatMap((item, i) => [
              // Duplicate content for seamless marquee loop
              <div key={`a-${i}`} className="marquee__item">
                <article className="h-full w-80 md:w-96 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{item.body}</p>
                </article>
              </div>,
              <div key={`b-${i}`} className="marquee__item">
                <article className="h-full w-80 md:w-96 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{item.body}</p>
                </article>
              </div>,
            ])}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full text-center rounded-2xl border bg-white dark:bg-zinc-900 py-10">
        <h2 className="text-3xl font-semibold">Ready to Build the Future?</h2>
        <p className="mt-2 text-muted-foreground">Let’s scope your use case and roadmap.</p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="#" className="px-6 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition">Contact Sales</Link>
          <Link href="/academy" className="px-6 py-2 rounded-lg border border-accent text-accent hover:bg-accent hover:text-white transition">Join Academy</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-sm text-gray-500 mt-12">
        © {new Date().getFullYear()} Elffie Robotics. All rights reserved.
      </footer>
    </main>
  );
}
