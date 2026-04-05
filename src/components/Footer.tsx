import { Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground/15 px-6 py-6 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            This project was developed as a part of learning at PCE.
          </p>
        </div>
        <div className="flex items-center justify-center md:justify-end">
          <a
            href="https://www.pce.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold uppercase underline decoration-2 underline-offset-4 transition-colors hover:text-primary"
          >
            <Globe className="h-4 w-4" />
            <span>PILLAI COLLEGE OF ENGINEERING WEBSITE</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
