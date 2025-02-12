import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <UserProfile
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background",
          },
        }}
        path="/user-profile"
      />
    </div>
  );
}
