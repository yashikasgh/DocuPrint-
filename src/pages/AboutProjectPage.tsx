import { motion } from "framer-motion";
import { ArrowLeft, Github, Youtube, Zap, Users, Target, Lightbulb, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";

const AboutProjectPage = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const features = [
    { icon: "📄", title: "Report Generation", color: "from-blue-500/20 to-blue-600/20" },
    { icon: "📋", title: "Attendance Management System", color: "from-purple-500/20 to-purple-600/20" },
    { icon: "🎨", title: "Flyer Generation", color: "from-pink-500/20 to-pink-600/20" },
    { icon: "📝", title: "Proposal Creation", color: "from-green-500/20 to-green-600/20" },
    { icon: "🤖", title: "Timeline Generation", color: "from-orange-500/20 to-orange-600/20" },
    { icon: "🔐", title: "Frontend & Authentication System", color: "from-red-500/20 to-red-600/20" },
    { icon: "💰", title: "Budget Estimation Module", color: "from-yellow-500/20 to-yellow-600/20" },
    { icon: "📅", title: "Event Management System", color: "from-cyan-500/20 to-cyan-600/20" },
  ];

  const teamMembers = [
    { name: "Manal Ulde", contribution: "Report Generation Feature" },
    { name: "Amey Zode", contribution: "Attendance Sheet Generation Feature" },
    { name: "Nancy Verma", contribution: "Flyer Generation Feature" },
    { name: "Rushabh Singh", contribution: "Flyer Generation Feature" },
    { name: "Aakash Valliyil", contribution: "Proposal Generation Feature" },
    { name: "Pranav Tahsildar", contribution: "Proposal Generation Feature" },
    { name: "Sneha Yadav", contribution: "Timeline Feature" },
    { name: "Yashika Singh", contribution: "Frontend, Authentication, Backend and Deployment" },
    { name: "Aryan Yadav", contribution: "Budget Preparation Feature" },
    { name: "Yedhukrishna Vijayan", contribution: "Events Integration Feature" },
    { name: "Vijayraghavan Udaiyar", contribution: "Deployment of Project" },
  ];

  const futureScope = [
    "Real-time event tracking and updates",
    "Team collaboration features",
    "Notification and reminder system",
    "Integration with external tools (Google Calendar, etc.)",
    "Advanced AI recommendations for event optimization",
    "Mobile application version",
    "Cloud-based storage for secure data management",
    "AI-based chatbot for event planning assistance",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-40 border-b-2 border-foreground/15 bg-background/95 backdrop-blur-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <Link to="/" className="brutal-btn-outline flex items-center gap-2 py-2">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight">About Project</h1>
          <div className="w-[100px]" />
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-12">
        {/* Project Overview */}
        <motion.section
          className="mb-16 scroll-mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-primary brutal-border">
              <Target className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">Problem & Solution</h2>
          </div>
          <div className="brutal-card space-y-4">
            <p className="font-mono text-sm leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">The Challenge:</span> Organizing events in colleges or
              organizations involves multiple steps like planning, budgeting, scheduling, documentation and
              coordination. These tasks are often handled manually, leading to inefficiencies, lack of clarity, and
              poor tracking.
            </p>
            <p className="font-mono text-sm leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">Our Solution:</span> This project aims to simplify event
              management by providing an integrated system that automates planning, generates timelines, manages
              budgets, and improves overall organization using AI-based solutions.
            </p>
          </div>
        </motion.section>

        {/* Key Features */}
        <motion.section
          className="mb-16 scroll-mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-secondary brutal-border">
              <Zap className="h-5 w-5 text-secondary-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">Key Features</h2>
          </div>
          <motion.div className="grid gap-4 md:grid-cols-2" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={item}
                className={`brutal-card group flex items-start gap-4 bg-gradient-to-br ${feature.color} p-5 transition-all duration-200 hover:shadow-md`}
              >
                <span className="text-2xl">{feature.icon}</span>
                <div className="flex-1">
                  <p className="font-bold uppercase tracking-tight">{feature.title}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Team Members */}
        <motion.section
          className="mb-16 scroll-mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-accent brutal-border">
              <Users className="h-5 w-5 text-accent-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">Team Members</h2>
          </div>
          <motion.div
            className="grid gap-3 md:grid-cols-2"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {teamMembers.map((member, index) => (
              <motion.div key={member.name} variants={item} className="brutal-card brutal-border p-4 transition-all duration-200 hover:bg-muted/40">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary brutal-border text-xs font-bold text-primary-foreground">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase tracking-tight">{member.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{member.contribution}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Links Section */}
        <motion.section
          className="mb-16 scroll-mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-primary brutal-border">
              <GitBranch className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">Project Links</h2>
          </div>
          <motion.div className="grid gap-4 md:grid-cols-2" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
            <motion.a
              href="https://github.com/PranavTahsildar/Event_generator"
              target="_blank"
              rel="noreferrer"
              variants={item}
              className="brutal-card brutal-border group flex items-center justify-between p-6 transition-all duration-200 hover:bg-primary/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center bg-secondary brutal-border">
                  <Github className="h-6 w-6 text-secondary-foreground" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold uppercase tracking-tight">GitHub Repository</p>
                  <p className="font-mono text-xs text-muted-foreground">View source code</p>
                </div>
              </div>
              <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
            </motion.a>

            <motion.a
              href="#"
              variants={item}
              className="brutal-card brutal-border group flex items-center justify-between p-6 transition-all duration-200 hover:bg-secondary/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center bg-accent brutal-border">
                  <Youtube className="h-6 w-6 text-accent-foreground" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold uppercase tracking-tight">YouTube Demo</p>
                  <p className="font-mono text-xs text-muted-foreground">(Coming soon)</p>
                </div>
              </div>
              <span className="text-accent group-hover:translate-x-1 transition-transform">→</span>
            </motion.a>
          </motion.div>
        </motion.section>

        {/* Future Scope */}
        <motion.section
          className="mb-16 scroll-mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-secondary brutal-border">
              <Lightbulb className="h-5 w-5 text-secondary-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">Future Scope</h2>
          </div>
          <motion.div
            className="brutal-card space-y-3"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {futureScope.map((item, index) => (
              <motion.div key={index} variants={item} className="flex items-start gap-3 border-b border-foreground/10 pb-3 last:border-b-0 last:pb-0">
                <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                <p className="font-mono text-sm text-muted-foreground">{item}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </main>

      {/* Footer */}
      <motion.footer
        className="border-t-2 border-foreground/15 px-6 py-6 md:px-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        viewport={{ once: true }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 md:flex-row">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            This project was developed as a part of learning at PCE.
          </p>
          <a
            href="https://www.pce.ac.in/"
            target="_blank"
            rel="noreferrer"
            className="font-bold uppercase underline decoration-2 underline-offset-4"
          >
            PILLAI COLLEGE OF ENGINEERING WEBSITE
          </a>
        </div>
      </motion.footer>
    </div>
  );
};

export default AboutProjectPage;
