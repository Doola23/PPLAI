import { motion } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    title: 'Connect',
    body: 'Link league feeds, Opta exports, or CSV uploads. No engineering required.',
  },
  {
    num: '02',
    title: 'Process',
    body: 'Monte Carlo simulations and xG models run overnight. Signal surfaces by 6am.',
  },
  {
    num: '03',
    title: 'Act',
    body: 'Coaches, scouts, and analysts each get exactly what they need — nothing more.',
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HowItWorksSection() {
  return (
    <section className="lhow-v2" id="how-it-works">

      <motion.div
        className="lhow-v2__head"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.68, ease: EASE }}
        viewport={{ once: true, amount: 0.4 }}
      >
        <span className="eyebrow" style={{ justifyContent: 'center' }}>How it works</span>
        <h2 className="lhow-v2__title">
          Raw data to matchday edge.<br />
          <span className="lhow-v2__title-accent">Three steps.</span>
        </h2>
      </motion.div>

      <div className="lhow-v2__steps">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            className="lhow-v2__step"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.14 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <span className="lhow-v2__step-num">{step.num}</span>
            <div className="lhow-v2__step-rule" />
            <h3 className="lhow-v2__step-title">{step.title}</h3>
            <p className="lhow-v2__step-body">{step.body}</p>
          </motion.div>
        ))}
      </div>

    </section>
  );
}
