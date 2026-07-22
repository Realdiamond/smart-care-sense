import Link from "next/link";
import { HeartPulse } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="relative mx-auto mb-6 w-fit">
          <div className="absolute inset-0 rounded-full pulse-ring" />
          <div className="relative h-16 w-16 rounded-full bg-gradient-vital flex items-center justify-center shadow-vital">
            <HeartPulse className="h-8 w-8 text-vital-foreground" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-gradient-primary mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          This page doesn't exist in the KennyPulse system.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-glow"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
