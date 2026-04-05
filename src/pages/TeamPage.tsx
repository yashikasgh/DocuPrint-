import { motion } from "framer-motion";
import { ArrowLeft, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { teamMembers } from "@/lib/siteContent";

const TeamPage = () => {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 md:px-10">
        <motion.header
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Project Team</p>
            <h1 className="mt-2 text-4xl font-bold uppercase tracking-tight md:text-5xl">Meet The Team</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              The same team credits from the landing page now live here so visitors can open a dedicated page and focus on the people behind DocuPrint.
            </p>
          </div>
          <Link to="/" className="brutal-btn-outline inline-flex items-center gap-2 py-2">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back to Home
          </Link>
        </motion.header>

        <main className="flex-1 py-10 md:py-14">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-4 w-10 bg-primary brutal-border" />
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Project Team</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                className="brutal-card min-h-[230px]"
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.07, duration: 0.28 }}
              >
                <div className="brutal-border flex h-12 w-12 items-center justify-center bg-secondary">
                  <Rocket className="h-5 w-5 text-secondary-foreground" strokeWidth={2.5} />
                </div>
                <h2 className="mt-5 text-lg font-bold uppercase">{member.name}</h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {member.role}
                </p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{member.contribution}</p>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeamPage;
