import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import { BorderBeam } from "../magicui/border-beam";
import { Button } from "../ui/button";
import Image from "next/image";
import { TITLE_TAILWIND_CLASS } from "@/utils/constants";

export default function HeroSection() {
  return (
    <section
      className="flex flex-col items-center justify-center leading-6 mt-[3rem]"
      aria-label="The Space"
    >
      <h1
        className={`${TITLE_TAILWIND_CLASS} scroll-m-20 font-semibold tracking-tight text-center max-w-[1120px] bg-gradient-to-b dark:text-white`}
      >
        Introducing The Space
      </h1>
      <p className="mx-auto max-w-[700px] text-gray-500 text-center mt-2 dark:text-gray-400">
        Your Digital Sanctuary for Productivity Discover a New Way to Organize
        Your Life
      </p>
      <div className="flex justify-center items-center gap-3">
        <Link href="/dashboard" className="mt-5">
          <Button className="animate-buttonheartbeat rounded-md bg-green-600 hover:bg-green-500 text-sm font-semibold text-white">
            Get Started
          </Button>
        </Link>

        <Link
          href=""
          target="_blank"
          className="mt-5"
          aria-label="Join Discord (opens in a new tab)"
        >
          <Button variant="outline" className="flex gap-1">
            Join Discord
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
        <Link
          href="https://github.com/nainish-rai/"
          target="_blank"
          className="animate-buttonheartbeat border p-2 rounded-full mt-5 hover:dark:bg-black hover:cursor-pointer"
          aria-label="Github"
        >
          <Github className="w-5 h-5" aria-hidden="true" />
        </Link>
      </div>
      <div>
        <div className="relative flex max-w-6xl justify-center overflow-hidden mt-7">
          <div className="relative rounded-xl">
            <Image
              src="https://utfs.io/f/31dba2ff-6c3b-4927-99cd-b928eaa54d5f-5w20ij.png"
              alt="Hero Image"
              width={1100}
              height={550}
              priority={true}
              className="block rounded-[inherit] border object-contain shadow-lg dark:hidden"
            />
            <Image
              src="https://utfs.io/f/69a12ab1-4d57-4913-90f9-38c6aca6c373-1txg2.png"
              width={1100}
              height={550}
              alt="Dark Hero Image"
              priority={true}
              className="dark:block rounded-[inherit] border object-contain shadow-lg hidden"
            />
            <BorderBeam size={250} duration={12} delay={9} />
          </div>
        </div>
      </div>
    </section>
  );
}
