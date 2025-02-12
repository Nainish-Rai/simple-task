"use client";

import { Leaf, User, SliceIcon } from "lucide-react";
import { OrbitingCirclesComponent } from "./orbiting-circles";
import { TITLE_TAILWIND_CLASS } from "@/utils/constants";

const features = [
  {
    name: "Aesthetic Design",
    description:
      "Enjoy a visually pleasing workspace that promotes calmness and clarity.",
    icon: Leaf,
  },
  {
    name: "Focused Environment",
    description:
      "Eliminate distractions and harness your productivity in a serene digital space.",
    icon: SliceIcon,
  },
  {
    name: "Tailored for You",
    description:
      "Whether you're a student, professional, or creative, TheSpace adapts to fit your unique workflow.",
    icon: User,
  },
];

export default function SideBySide() {
  return (
    <div className="overflow-hidden ">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="lg:pr-8 lg:pt-4">
            <div className="lg:max-w-lg">
              <p
                className={`${TITLE_TAILWIND_CLASS} mt-2 font-semibold tracking-tight dark:text-white text-gray-900`}
              >
                The Space: Your Digital Home
              </p>
              <p className="mt-6 leading-8 text-gray-600 dark:text-gray-400">
                A new way to organize your life.
              </p>
              <dl className="mt-10 max-w-xl space-y-8 leading-7 text-gray-600 lg:max-w-none">
                {features.map((feature) => (
                  <div key={feature.name} className="relative pl-9">
                    <dt className="inline font-semibold dark:text-gray-100 text-gray-900">
                      <feature.icon
                        className="absolute left-1 top-1 h-5 w-5"
                        aria-hidden="true"
                      />
                      {feature.name}
                    </dt>{" "}
                    <dd className="inline dark:text-gray-400">
                      {feature.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <OrbitingCirclesComponent />
        </div>
      </div>
    </div>
  );
}
