import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn
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
  );
}
