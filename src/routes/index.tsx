import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const messages = [
  "Status pages that",
  "Uptime monitoring that",
  "Incident tracking that",
  "Customer trust that",
];

function TypewriterTitle() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentMessage = messages[currentIndex];
    const typeSpeed = isDeleting ? 40 : 80;
    const pauseTime = isDeleting ? 500 : 2000;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentMessage.length) {
          setDisplayText(currentMessage.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % messages.length);
        }
      }
    }, typeSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentIndex]);

  return (
    <span className="inline-block min-w-[200px]">
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[2px] h-[1em] bg-current ml-1 align-middle"
      />
    </span>
  );
}

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="px-6 py-5"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/Logo.png" alt="unstatus" className="size-10" />
            <span className="text-sm font-medium">unstatus</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              to="/status"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Status
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="flex-1 px-6">
        {/* Hero */}
        <section className="mx-auto max-w-5xl pt-32 pb-40">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center"
          >
            <motion.h1
              variants={itemVariants}
              className="text-[40px] font-medium leading-[1.1] tracking-[-0.02em] text-foreground"
            >
              <TypewriterTitle />
              <br />
              just work.
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              Keep your customers informed with real-time status updates.
              Simple, fast, and reliable.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center gap-4"
            >
              <Link to="/login">
                <Button className="h-10 px-6 text-[15px] font-normal">
                  Get started
                </Button>
              </Link>
              <Link
                to="/status"
                className="text-[15px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                View demo
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl border-t py-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-12 text-center sm:grid-cols-3"
          >
            <motion.div variants={fadeInVariants}>
              <h3 className="text-sm font-medium">Public pages</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Custom domains and branding that matches your company.
              </p>
            </motion.div>
            <motion.div variants={fadeInVariants}>
              <h3 className="text-sm font-medium">Notifications</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Email, SMS, and webhooks when incidents occur.
              </p>
            </motion.div>
            <motion.div variants={fadeInVariants}>
              <h3 className="text-sm font-medium">Monitoring</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Automated health checks with historical data.
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-auto border-t px-6 py-6"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-6">
          <span className="text-sm text-muted-foreground">© 2026 unstatus</span>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/status"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            System status
          </Link>
        </div>
      </motion.footer>
    </div>
  );
}
