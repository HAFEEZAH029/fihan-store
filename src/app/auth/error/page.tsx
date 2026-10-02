import Link from "next/link";

export default function AuthError() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-serif text-3xl">Sign-in could not be completed</h1>
      <p>Please try again.</p>
      <Link href="/auth/login" className="bg-black px-6 py-3 text-white">Continue with Google</Link>
      <Link href="/">Return home</Link>
    </main>
  );
}
