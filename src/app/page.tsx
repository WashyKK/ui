import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 space-y-12">
      {/* Header */}
      <header className="w-full max-w-5xl text-center mt-4">
        <h1 className="text-4xl font-bold">Welcome to Elffie Robotics</h1>
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          From agile humanoids to rugged autonomous systems—engineered for the future.
        </p>
      </header>

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

      {/* Research & News (moving) */}
      <section className="w-full max-w-5xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Current Research & News</h2>
        <div className="marquee rounded-xl border bg-white/60 dark:bg-zinc-800/60">
          <div className="marquee__track gap-4 p-4">
            {[
              {
                title: "Zero‑Shot Learning for Robot Policies",
                body:
                  "Exploring foundation models and vision‑language pretraining to generalize skills to unseen tasks without additional labels.",
              },
              {
                title: "Jetson Orin NX Experiments",
                body:
                  "Benchmarking TensorRT pipelines, INT8 quantization, and on‑device SLAM for real‑time autonomy on edge compute.",
              },
              {
                title: "Sim‑to‑Real Transfer",
                body:
                  "Domain randomization in Isaac Gym and RL fine‑tuning to bridge the gap from simulation to physical robots.",
              },
              {
                title: "Self‑Supervised Visual Navigation",
                body:
                  "Contrastive pretraining and trajectory cloning to enable map‑free navigation in dynamic indoor spaces.",
              },
              {
                title: "Grasping With Few Shots",
                body:
                  "Prompted grasp synthesis with geometric priors to handle novel objects using minimal demonstrations.",
              },
              {
                title: "Robotics News",
                body:
                  "Weekly: open‑weight VLM updates, improved ORB‑SLAM variants, and embedded CUDA kernels for faster depth fusion.",
              },
            ].flatMap((item, i, arr) => [
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

      {/* Use Cases */}
      <section className="max-w-4xl w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Applications</h2>
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
        <h2 className="text-3xl font-bold mb-8">What Our Partners Say</h2>
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


      {/* CTA */}
      <section className="w-full bg-black text-white py-10 text-center rounded-xl">
        <h2 className="text-3xl font-bold">Ready to Build the Future?</h2>
        <p className="mt-2">Contact us today or join the Elffie Academy.</p>
        <div className="mt-4 flex justify-center gap-4">
          <Link href="#" className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200">
            Contact Us
          </Link>
          <Link href="/academy" className="border border-white px-6 py-2 rounded-lg hover:bg-white hover:text-black transition">
            Join Academy
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-sm text-gray-500 mt-12">
        © {new Date().getFullYear()} Elffie Robotics. All rights reserved.
      </footer>
    </main>
  );
}

