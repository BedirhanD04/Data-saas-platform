"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleLogin(){
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email, password})
    });

    const data = await response.json();

    if (response.ok) {
      router.push("/");
    } else {
      alert(data.error || data.message || "Login failed");
    }
  }

   return (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="w-full max-w-sm flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Welcome back</h1>
        <p className="text-sm text-foreground/60 mt-1">Log in to your account</p>
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border-b border-hairline bg-transparent px-1 py-2.5 text-foreground placeholder-foreground/40 focus:outline-none focus:border-rust transition-colors"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border-b border-hairline bg-transparent px-1 py-2.5 text-foreground placeholder-foreground/40 focus:outline-none focus:border-rust transition-colors"
      />

      <button
        onClick={handleLogin}
        className="bg-rust hover:bg-rust-dark transition-colors text-white font-medium rounded-md px-4 py-2.5 mt-2"
      >
        Log In
      </button>

      <p className="text-sm text-foreground/60">
        Don&apos;t have an account?{" "}
        <a href="/register" className="text-rust hover:underline">
          Register
        </a>
      </p>
    </div>
  </div>
);
}