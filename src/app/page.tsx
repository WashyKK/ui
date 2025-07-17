import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Robotics experts:&nbsp;
          <code className="font-mono font-bold">humanoid / mobile / industrial</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
          <Image
            src="/logo.svg"
            alt="Elffie Robotics Logo"
            className="dark:invert"
            width={120}
            height={50}
            priority
          />
        </div>
      </div>

      <section className="mt-12 text-center max-w-2xl">
        <h1 className="text-4xl font-bold">Welcome to Elffie Robotics</h1>
        <p className="mt-4 text-lg text-gray-700">
          We build cutting edge robots for research and industry. From agile
          humanoids to rugged mobile platforms, our team delivers reliable
          solutions.
        </p>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-3">
        <div className="flex flex-col items-center">
          <Image src="/humanoid.svg" alt="Humanoid robots" width={200} height={200} />
          <h3 className="mt-2 text-xl font-semibold">Humanoid</h3>
          <p className="text-center text-sm text-gray-500">
            Robots that mimic human motion and interaction.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <Image src="/mobile.svg" alt="Mobile robots" width={200} height={200} />
          <h3 className="mt-2 text-xl font-semibold">Mobile</h3>
          <p className="text-center text-sm text-gray-500">
            Autonomous platforms for indoor and outdoor tasks.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <Image src="/industrial.svg" alt="Industrial robots" width={200} height={200} />
          <h3 className="mt-2 text-xl font-semibold">Industrial</h3>
          <p className="text-center text-sm text-gray-500">
            Reliable automation for factories and warehouses.
          </p>
        </div>
      </section>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <Link
          href="/store"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Purchase{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Purchase components from our store.
          </p>
        </Link>

        <Link
          href="/academy"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Academy{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Join our training programs and master robotics.
          </p>
        </Link>

        <Link
          href="/design"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Design{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Get designs for your next groundbreaking build!
          </p>
        </Link>

        <Link
          href="/design"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Build{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-balance text-sm opacity-50">
            Get a complete design and build of your next product.
          </p>
        </Link>
      </div>
    </main>
  );
}
