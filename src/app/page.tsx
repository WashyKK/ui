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
      <section className="max-w-4xl w-full text-center">
        <h2 className="text-2xl font-bold mb-4">What People Say</h2>
        <blockquote className="italic text-gray-600 dark:text-gray-400">
          Elffie Robotics gave our startup the edge we needed to automate complex logistics—absolutely reliable.
          <br />
          <span className="font-semibold block mt-2">— CTO, GreenPort AI</span>
        </blockquote>
      </section>

      {/* CTA */}
      <section className="w-full bg-black text-white py-10 text-center rounded-xl">
        <h2 className="text-3xl font-bold">Ready to Build the Future?</h2>
        <p className="mt-2">Contact us today or join the Elffie Academy.</p>
        <div className="mt-4 flex justify-center gap-4">
          <Link href="/contact" className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200">
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


