import SignupOne from "@/components/ui/signup-1";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(115deg,#f8fafc_0%,#eef2ff_45%,#ecfeff_100%)] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(14,165,233,0.12),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.10),transparent_45%)]" />
      <div className="relative z-10 w-full max-w-5xl">
        <SignupOne mode="login" />
      </div>
    </main>
  );
}
