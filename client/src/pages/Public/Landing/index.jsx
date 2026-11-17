import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBoxes,
  FaShoppingCart,
  FaIndustry,
  FaCalculator,
  FaCashRegister,
  FaChartLine,
  FaStore,
  FaUtensils,
  FaTruck,
  FaTools,
  FaWarehouse,
  FaChevronDown,
  FaArrowRight,
} from "react-icons/fa";
import { BRAND } from "../../../config/brand";
import ClientPortalAPI from "../../../api/client/clientPortalAPI";
import { useClientAuth } from "../../../api/client/clientAuthContext";
import PricingCards, { CycleToggle } from "../../../components/Client/PricingCards";
import BrandLogo from "../../../components/Client/BrandLogo";

const MODULES = [
  { icon: FaBoxes, title: "Inventory", text: "Every stock movement in one ledger. Transfers, adjustments and counts across all your warehouses." },
  { icon: FaShoppingCart, title: "Purchasing", text: "Suppliers, purchase orders and receiving, with costs flowing straight into your books." },
  { icon: FaIndustry, title: "Production", text: "Turn raw materials into finished goods with recipes and bills of materials. Know your true unit cost." },
  { icon: FaCalculator, title: "Accounting", text: "Sales and purchases post themselves. See cost of sales and margin per item, branch and day." },
  { icon: FaCashRegister, title: "Point of Sale", text: "One POS that adapts to how you sell: barcode checkout, tables and kitchen orders, or appointments." },
  { icon: FaChartLine, title: "Reports", text: "Sales, stock value, slow movers and margins, ready when you need them." },
];

const BUSINESS_TYPES = [
  { icon: FaStore, label: "Retail" },
  { icon: FaUtensils, label: "Restaurants" },
  { icon: FaTruck, label: "Trading" },
  { icon: FaIndustry, label: "Manufacturing" },
  { icon: FaTools, label: "Services" },
  { icon: FaWarehouse, label: "Distribution" },
];

const STEPS = [
  { n: 1, title: "Pick a plan", text: "Start with a free trial. No card needed." },
  { n: 2, title: "Create your account", text: "Your company gets its own private, separate database." },
  { n: 3, title: "Start working", text: "Your system is ready in minutes. Add items, users and branches." },
];

const FAQS = [
  {
    q: "Is my data separate from other companies?",
    a: "Yes. Every company gets its own database, so your records are never mixed with anyone else's.",
  },
  {
    q: "What happens when my trial ends?",
    a: "Choose a paid plan to keep going. If you don't, your account is paused, not deleted, so you can pick up where you left off.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. During a trial you can switch freely. On a paid plan, contact us and we'll move you over.",
  },
  {
    q: "Does it work for my type of business?",
    a: "It's built for retail, restaurants, trading, manufacturing and services. You only see the parts your business needs.",
  },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left font-medium"
      >
        {q}
        <FaChevronDown className={`shrink-0 ml-4 transition-transform ${open ? "rotate-180" : ""}`} size={12} />
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 dark:text-gray-400">{a}</p>}
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { client } = useClientAuth();
  const [plans, setPlans] = useState([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [cycle, setCycle] = useState("MONTHLY");

  useEffect(() => {
    ClientPortalAPI.loadPlans()
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoaded(true));
  }, []);

  // Links like /#pricing (from sign-up "Change") land on the right section
  useEffect(() => {
    if (!plansLoaded) return;
    const id = window.location.hash.replace("#", "");
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [plansLoaded]);

  const highlightCode = plans.length >= 3 ? plans[1].code : null;

  const choosePlan = (plan) => {
    const trial = plan.trial_days > 0 ? 1 : 0;
    if (client) {
      navigate(`/portal/plans?plan=${plan.id}&cycle=${cycle}&trial=${trial}`);
    } else {
      navigate(`/sign-up?plan=${plan.id}&cycle=${cycle}&trial=${trial}`);
    }
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-gray-100 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label={BRAND.name}>
            <BrandLogo variant="mark" className="h-9" />
            <span className="text-xl font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600 dark:text-gray-300">
            <button type="button" onClick={() => scrollTo("features")} className="hover:text-[#E00000]">
              Features
            </button>
            <button type="button" onClick={() => scrollTo("pricing")} className="hover:text-[#E00000]">
              Pricing
            </button>
            <button type="button" onClick={() => scrollTo("faq")} className="hover:text-[#E00000]">
              FAQ
            </button>
          </nav>
          <div className="flex items-center gap-3">
            {client ? (
              <Link
                to="/portal"
                className="px-4 py-2 rounded-md bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium"
              >
                My account
              </Link>
            ) : (
              <>
                <Link to="/client-login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-[#E00000]">
                  Log in
                </Link>
                <button
                  type="button"
                  onClick={() => scrollTo("pricing")}
                  className="px-4 py-2 rounded-md bg-[#E00000] hover:bg-[#B80000] text-white text-sm font-medium"
                >
                  Start free trial
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#E00000]/10 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center relative">
          <div className="text-center md:text-left">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#E00000]/10 text-[#E00000] mb-6">
              {BRAND.tagline}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {BRAND.headline}
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto md:mx-0">{BRAND.description}</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button
                type="button"
                onClick={() => scrollTo("pricing")}
                className="px-6 py-3 rounded-md bg-[#E00000] hover:bg-[#B80000] text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#E00000]/25"
              >
                Start your free trial <FaArrowRight size={12} />
              </button>
              <button
                type="button"
                onClick={() => scrollTo("features")}
                className="px-6 py-3 rounded-md border-2 border-black dark:border-white font-medium hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                See what's inside
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-500">Free trial · No card needed · Your own private database</p>
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-[2.5rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl flex items-center justify-center p-10">
              <div className="absolute inset-4 rounded-[2rem] border-2 border-dashed border-[#E00000]/20" />
              <BrandLogo variant="full" className="h-full max-h-72 relative" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Business types ---------- */}
      <section className="border-y border-gray-100 dark:border-slate-900 bg-gray-50 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-center text-xs uppercase tracking-wider text-gray-500 mb-5">Made for every kind of business</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {BUSINESS_TYPES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
                <Icon size={22} className="text-[#E00000]" />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Everything runs in one place</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Stop copying numbers between spreadsheets. Buying, making, selling and accounting share the same data.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow bg-white dark:bg-slate-900"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E00000]/10 text-[#E00000] flex items-center justify-center mb-4">
                <Icon size={18} />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-gray-50 dark:bg-slate-900/40 border-y border-gray-100 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Up and running today</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#E00000] text-white font-bold text-lg flex items-center justify-center mx-auto">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">Simple pricing</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Start free. Upgrade when you're ready.</p>
          <div className="mt-6">
            <CycleToggle cycle={cycle} onChange={setCycle} />
          </div>
        </div>

        {!plansLoaded ? (
          <div className="py-12 text-center text-gray-400">Loading plans...</div>
        ) : (
          <PricingCards
            plans={plans}
            cycle={cycle}
            highlightCode={highlightCode}
            renderAction={(plan) => (
              <button
                type="button"
                onClick={() => choosePlan(plan)}
                className={`w-full px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  plan.code === highlightCode
                    ? "bg-[#E00000] hover:bg-[#B80000] text-white"
                    : "border border-gray-300 dark:border-slate-700 hover:border-[#E00000]"
                }`}
              >
                {plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get started"}
              </button>
            )}
          />
        )}
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="max-w-3xl mx-auto px-6 pb-20 scroll-mt-16">
        <h2 className="text-3xl font-bold text-center mb-8">Questions</h2>
        {FAQS.map((f) => (
          <FaqItem key={f.q} {...f} />
        ))}
      </section>

      {/* ---------- CTA ---------- */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl bg-black text-white px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#E00000]/30 blur-3xl pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold relative">Ready to run your business in one place?</h2>
          <p className="mt-4 opacity-80 relative">Try it free. Your own system in minutes.</p>
          <button
            type="button"
            onClick={() => scrollTo("pricing")}
            className="mt-8 px-6 py-3 rounded-md bg-[#E00000] hover:bg-[#B80000] text-white font-medium relative"
          >
            Choose a plan
          </button>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-gray-100 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <BrandLogo variant="mark" className="h-6" />
            © {new Date().getFullYear()} {BRAND.name} · {BRAND.tagline}
          </span>
          <div className="flex gap-6">
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-[#E00000]">
              {BRAND.supportEmail}
            </a>
            <Link to="/client-login" className="hover:text-[#E00000]">
              Client login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
