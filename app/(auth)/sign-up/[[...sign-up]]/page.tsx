"use client";
import PageWrapper from "@/components/wrapper/page-wrapper";
import config from "@/config";
import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  if (!config?.auth?.enabled) {
    router.back();
  }

  return (
    <PageWrapper>
      <div className="flex min-w-screen justify-center my-[5rem]">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-background",
              formButtonPrimary:
                "bg-primary text-primary-foreground hover:bg-primary/90",
              formFieldInput: "bg-background text-foreground",
              formFieldLabel: "text-foreground",
              headerTitle: "text-foreground",
              headerSubtitle: "text-foreground",
              socialButtonsBlockButton: "text-foreground",
              formResendCodeLink: "text-primary",
              footerActionLink: "text-primary",
            },
          }}
        />
      </div>
    </PageWrapper>
  );
}
