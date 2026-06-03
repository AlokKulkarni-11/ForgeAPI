import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  type LucideIcon,
  ArrowRight,
  Bot,
  Code2,
  GitBranch,
  HeartPulse,
  Server,
  ShieldCheck,
  TerminalSquare,
  TestTube,
} from 'lucide-react';
import NeonTunnelBackdrop from '../components/background/NeonTunnelBackdrop';
import { Badge } from '../components/ui/Badge';

interface PipelineStepProps {
  icon: LucideIcon;
  title: string;
  active: boolean;
}

interface FeatureCard {
  icon: LucideIcon;
  colorClass: string;
  title: string;
  description: string;
}

const animatedTexts = [
  'Node.js APIs in 60 seconds.',
  'Auto-healed for OWASP security.',
  'Live sandbox. Real endpoints.',
];

const pipelineSteps = [
  { title: 'Requirement', icon: Bot },
  { title: 'Generation', icon: Code2 },
  { title: 'Deploy', icon: Server },
  { title: 'Testing', icon: TestTube },
  { title: 'Scoring', icon: ShieldCheck },
  { title: 'Healing', icon: HeartPulse },
];

const featureCards: FeatureCard[] = [
  {
    icon: HeartPulse,
    colorClass: 'text-accent-warning',
    title: 'Self-Healing Loop',
    description: 'Agents iteratively heal failing tests and logic until the code passes requirements.',
  },
  {
    icon: ShieldCheck,
    colorClass: 'text-accent-danger',
    title: 'OWASP Security Scoring',
    description: 'Local security agents scan and enforce top OWASP measures automatically.',
  },
  {
    icon: Server,
    colorClass: 'text-accent-secondary',
    title: 'Live Sandbox',
    description: 'Zero setup container sandboxes to ping real HTTP routes dynamically.',
  },
  {
    icon: TerminalSquare,
    colorClass: 'text-blue-400',
    title: 'Monaco Editor',
    description: 'View auto-generated source code vividly in a VSCode-like environment.',
  },
  {
    icon: Bot,
    colorClass: 'text-accent-primary',
    title: 'Multi-Agent AI',
    description: 'Gemini + Ollama orchestrate seamless specification-to-repo pipelines.',
  },
  {
    icon: GitBranch,
    colorClass: 'text-text-primary',
    title: 'GitHub Export',
    description: 'Push fully configured repositories directly to GitHub. Done, ready for prod.',
  },
];

function AnimatedSubtext() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % animatedTexts.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="h-8 mt-4 overflow-hidden text-center relative w-full flex justify-center items-center">
      {animatedTexts.map((text, index) => (
        <p
          key={text}
          className={`absolute text-xl md:text-2xl text-text-secondary font-medium transition-all duration-500 ease-in-out ${
            index === activeIndex ? 'opacity-100 transform-none' : 'opacity-0 translate-y-8'
          }`}
        >
          {text}
        </p>
      ))}
    </div>
  );
}

function PipelineStep({ icon: Icon, title, active }: PipelineStepProps) {
  return (
    <div
      className={`flex max-w-[120px] flex-1 flex-col items-center transition-all duration-500 ${
        active ? 'scale-110' : 'scale-100'
      }`}
    >
      <div
        className={`relative mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-[0_0_20px_rgba(0,0,0,0)] ${
          active
            ? 'border-accent-primary bg-[#0c102b]/92 shadow-[0_0_36px_rgba(98,114,255,0.3)]'
            : 'border-[#3d4573] bg-[#090c1d]/96'
        }`}
      >
        <div className="absolute -inset-2 -z-10 rounded-full bg-[#05060f]/95" />
        <div
          className={`absolute inset-[5px] rounded-full ${
            active ? 'bg-accent-primary/12' : 'bg-white/[0.03]'
          }`}
        />
        <Icon className={`relative z-10 w-8 h-8 ${active ? 'text-accent-primary' : 'text-[#8b91bc]'}`} />
      </div>
      <span
        className={`text-center text-sm font-semibold [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] ${
          active ? 'text-text-primary' : 'text-[#c3c8e6]'
        }`}
      >
        {title}
      </span>
    </div>
  );
}

function PipelineVisual() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % pipelineSteps.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto py-24 relative overflow-hidden hidden md:flex items-center justify-between">
      <div className="absolute left-12 right-12 top-1/2 z-0 h-[2px] -translate-y-6">
        <div className="absolute inset-0 bg-white/12" />
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#8b93ff] via-[#7a80ff] to-[#af62ff] shadow-[0_0_16px_rgba(122,128,255,0.45)] transition-all duration-1000"
          style={{ width: `${(activeStep / (pipelineSteps.length - 1)) * 100}%` }}
        />
      </div>
      {pipelineSteps.map((step, index) => (
        <div key={step.title} className="relative z-10 flex w-24 justify-center">
          <PipelineStep icon={step.icon} title={step.title} active={index <= activeStep} />
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const demoRef = useRef<HTMLElement | null>(null);
  const [revealedFeature, setRevealedFeature] = useState<string | null>(null);

  return (
    <div className="relative isolate min-h-[200vh] overflow-hidden bg-[#05060b]">
      <NeonTunnelBackdrop />

      <section className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-16 text-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="h-[560px] w-[560px] rounded-full bg-[#3e5cff]/25 blur-[150px]" />
        </div>

        <Badge variant="info" className="mb-6 animate-fade-in-up">
          ForgeAPI Beta
        </Badge>
        <h1
          className="text-5xl md:text-7xl font-extrabold text-text-primary max-w-4xl leading-tight tracking-tight animate-fade-in-up"
          style={{ animationDelay: '0.1s' }}
        >
          Describe. Generate. <br /> Forge APIs.
        </h1>

        <div className="w-full max-w-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <AnimatedSubtext />
        </div>

        <div
          className="flex gap-4 mt-12 animate-fade-in-up z-10 relative"
          style={{ animationDelay: '0.3s' }}
        >
          <Link
            to="/register"
            className="bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold flex items-center gap-2 px-8 py-4 rounded-xl shadow-lg shadow-accent-primary/25 transition"
          >
            Start Building Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 px-4">
        <PipelineVisual />
      </section>

      <section
        ref={demoRef}
        className="relative z-10 bg-background-secondary/10 px-4 py-24 backdrop-blur-[1px]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary">Engineering at AI speed</h2>
            <p className="text-text-secondary mt-4 max-w-2xl mx-auto text-lg">
              Not just an API generator - an autonomous backend engineering, testing, and security
              platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feature) => {
              const isRevealed = revealedFeature === feature.title;

              return (
                <button
                  key={feature.title}
                  type="button"
                  aria-expanded={isRevealed}
                  onMouseEnter={() => setRevealedFeature(feature.title)}
                  onMouseLeave={() => setRevealedFeature((current) => (current === feature.title ? null : current))}
                  onFocus={() => setRevealedFeature(feature.title)}
                  onBlur={() => setRevealedFeature((current) => (current === feature.title ? null : current))}
                  onClick={() =>
                    setRevealedFeature((current) => (current === feature.title ? null : feature.title))
                  }
                  className={`group relative min-h-[250px] overflow-hidden rounded-[28px] border p-6 text-left transition-all duration-300 ${
                    isRevealed
                      ? 'border-[#7786ff]/60 bg-[#0d1024]/88 shadow-[0_24px_80px_rgba(40,58,146,0.28)]'
                      : 'border-white/10 bg-[linear-gradient(180deg,rgba(18,20,34,0.9),rgba(12,14,26,0.82))] hover:border-[#7786ff]/45 hover:bg-[#10142d]/90'
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,128,255,0.15),transparent_36%)] opacity-80" />

                  <div
                    className={`relative z-10 flex h-full flex-col transition-all duration-300 ${
                      isRevealed ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
                    }`}
                  >
                    <feature.icon
                      className={`mb-6 h-11 w-11 ${feature.colorClass} transition-transform duration-300 group-hover:scale-110`}
                    />
                    <h3 className="mb-3 text-2xl font-bold text-text-primary">{feature.title}</h3>
                    <div className="mt-auto inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      Reveal Details
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 z-20 flex flex-col justify-end rounded-[28px] border border-[#7a80ff]/25 bg-[linear-gradient(180deg,rgba(22,28,59,0.62),rgba(13,16,36,0.96))] p-6 transition-all duration-300 ${
                      isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                    }`}
                  >
                    <div className="mb-4 h-1 w-14 rounded-full bg-gradient-to-r from-[#7a80ff] to-[#ff5ce1]" />
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#aeb7ff]">
                      {feature.title}
                    </p>
                    <p className="text-lg leading-relaxed text-text-primary">{feature.description}</p>
                    <p className="mt-6 text-sm text-text-secondary">Tap again to close</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-text-primary mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-12 text-center relative">
            <div className="absolute top-8 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-background-border to-transparent hidden md:block" />
            {[
              {
                number: '1',
                title: 'Describe',
                text: 'Map out your database entities, fields, and API endpoints via our visual builder.',
              },
              {
                number: '2',
                title: 'Generate',
                text: 'The Multi-Agent AI writes controllers, routes, and models into a robust Node.js structure.',
              },
              {
                number: '3',
                title: 'Test & Use',
                text: 'Deployed instantly to a live sandbox, scored for OWASP standards, and ready for use.',
              },
            ].map((step) => (
              <div key={step.number} className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-background-primary border-2 border-background-border flex items-center justify-center text-2xl font-bold text-text-primary mb-6">
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-3">{step.title}</h3>
                <p className="text-text-secondary">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-background-border px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-4">Built for all kinds of builders</h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          Whether you're a CS Student, frontend developer, hackathon participant or a
          non-technical founder, ForgeAPI gives you a production backend instantly.
        </p>
      </section>

      <footer className="relative z-10 border-t border-background-border px-4 py-8 text-center">
        <p className="text-text-secondary font-medium">
          ForgeAPI (c) {new Date().getFullYear()}. A project by team Illuminati
        </p>
      </footer>
    </div>
  );
}
