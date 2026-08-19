import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';
import { Helmet } from 'react-helmet-async';

export default function ROICalculator() {
  const [monthlyVisitors, setMonthlyVisitors] = useState(10000);
  const [currentConversion, setCurrentConversion] = useState(2);
  const [avgDealValue, setAvgDealValue] = useState(500);
  const [supportHours, setSupportHours] = useState(40);
  const [supportRate, setSupportRate] = useState(50);

  const burflowConversion = Math.min(currentConversion * 2.5, 25);
  const additionalConversions = Math.round((monthlyVisitors * (burflowConversion - currentConversion)) / 100);
  const additionalRevenue = additionalConversions * avgDealValue;
  const timeSaved = Math.round(supportHours * 0.4);
  const supportSavings = timeSaved * supportRate * 4;
  const totalMonthlyValue = additionalRevenue + supportSavings;
  const annualValue = totalMonthlyValue * 12;
  const burflowCost = 99;
  const roi = totalMonthlyValue > 0 ? Math.round(((totalMonthlyValue - burflowCost) / burflowCost) * 100) : 0;

  const formatCurrency = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;

  return (
    <>
      <SEO
        title="ROI Calculator | How Much Revenue Can AI Sales Agents Generate?"
        description="Calculate the ROI of AI sales agents for your website. See how much revenue you could gain by converting more visitors into qualified demos."
        canonicalPath="/tools/roi-calculator"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'BurFlow ROI Calculator',
          applicationCategory: 'BusinessApplication',
          url: 'https://burflow.vercel.app/tools/roi-calculator',
          description: 'Calculate the ROI of AI sales agents for your website.',
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            ROI Calculator
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            See how much additional revenue AI sales agents can generate for your website.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            {/* Inputs */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-neutral-900)]">
                  Monthly website visitors: <span className="text-[var(--color-accent-600)]">{monthlyVisitors.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={monthlyVisitors}
                  onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-accent-600)]"
                />
                <div className="flex justify-between text-xs text-[var(--color-neutral-400)]"><span>1K</span><span>100K</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-neutral-900)]">
                  Current conversion rate: <span className="text-[var(--color-accent-600)]">{currentConversion}%</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={currentConversion}
                  onChange={(e) => setCurrentConversion(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-accent-600)]"
                />
                <div className="flex justify-between text-xs text-[var(--color-neutral-400)]"><span>0.5%</span><span>10%</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-neutral-900)]">
                  Average deal value: <span className="text-[var(--color-accent-600)]">${avgDealValue.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={50}
                  max={5000}
                  step={50}
                  value={avgDealValue}
                  onChange={(e) => setAvgDealValue(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-accent-600)]"
                />
                <div className="flex justify-between text-xs text-[var(--color-neutral-400)]"><span>$50</span><span>$5K</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-neutral-900)]">
                  Support hours/week on repetitive questions: <span className="text-[var(--color-accent-600)]">{supportHours}h</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={supportHours}
                  onChange={(e) => setSupportHours(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-accent-600)]"
                />
                <div className="flex justify-between text-xs text-[var(--color-neutral-400)]"><span>0h</span><span>100h</span></div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-accent-600)]/20 bg-[var(--color-accent-600)]/5 p-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent-600)]">Estimated annual value</p>
                <p className="mt-2 font-display text-5xl font-bold text-[var(--color-neutral-900)]">{formatCurrency(annualValue)}</p>
                <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
                  with BurFlow Professional at $99/mo
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">Additional demos/month</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--color-neutral-900)]">{additionalConversions}</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">from {currentConversion}% to ~{burflowConversion.toFixed(1)}% conversion</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">Extra revenue/month</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--color-accent-600)]">{formatCurrency(additionalRevenue)}</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">at ${avgDealValue.toLocaleString()} avg deal</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">Time saved/week</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--color-neutral-900)]">{timeSaved}h</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">on repetitive Q&A</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">Support savings/month</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--color-neutral-900)]">{formatCurrency(supportSavings)}</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">at ${supportRate}/hr</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 text-center">
                <p className="text-sm text-[var(--color-neutral-500)]">Return on investment</p>
                <p className="mt-1 text-4xl font-bold text-[var(--color-accent-600)]">{roi.toLocaleString()}%</p>
                <p className="text-xs text-[var(--color-neutral-400)]">monthly ROI at $99/mo</p>
              </div>

              <Link
                to="/signup"
                className="block w-full rounded-xl bg-[var(--color-accent-600)] py-3 text-center text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Start free and see real results →
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-[var(--color-neutral-200)] border-y border-[var(--color-neutral-200)]">
              {[
                { q: 'How does BurFlow increase conversion rates?', a: "BurFlow proactively engages visitors, understands your products and pricing, and guides them toward booking a demo. Instead of a static form, visitors get a personalized conversation that addresses their specific needs." },
                { q: 'Is the ROI estimate accurate?', a: 'This calculator uses industry benchmarks (2-3x conversion lift, 40% support deflection). Your actual results depend on traffic volume, product complexity, and pricing. Most teams see measurable impact within the first week.' },
                { q: 'What if I am already using a chatbot?', a: 'BurFlow complements or replaces existing chatbots. Teams using basic chatbots typically see an additional 50-100% improvement in conversion after switching to BurFlow product-aware AI.' },
              ].map(faq => (
                <details key={faq.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-[var(--color-neutral-900)]">
                    {faq.q}
                    <span className="text-[var(--color-accent-600)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[var(--color-neutral-600)]">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
