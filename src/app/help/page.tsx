import {PageHead} from '@/components/site';

const faqs = [
  ['When will I receive my templates?', 'Once payment is verified, access appears in your customer account and you receive a delivery confirmation.'],
  ['Do I need Canva Pro?', 'No. Every included layout is designed to work with a free Canva account unless a kit clearly says otherwise.'],
  ['Can I reuse the templates?', 'Yes. Use and adapt the templates for your own business as often as you like. Resale, sharing or redistribution is not permitted.'],
  ['Can I get a refund?', 'Because digital products cannot be returned, purchases are generally final. If a file is faulty or inaccessible, contact support and we will make it right.'],
  ['Can you customise a kit for me?', 'Custom design is not included with template purchases. The kits are intentionally easy to adapt with your own colours, type and photos.'],
];

export default function Help() {
  return (
    <>
      <PageHead eyebrow="HELP CENTRE" title="Questions, answered." copy="Everything you need to know before and after choosing your kit." />
      <section className="help-sections">
        <article id="delivery"><span>01</span><div><h2>How delivery works</h2><p>Choose a kit, complete payment, submit the transaction reference and wait for manual verification. Approved products then appear under Downloads & Access in your customer account.</p></div></article>
        <article id="payments"><span>02</span><div><h2>Payment & verification</h2><p>Use the exact checkout amount and a unique UPI reference. Verification normally takes 12–24 hours. Customer purchases never provide administrator access.</p></div></article>
      </section>
      <section className="faq" id="faqs">
        {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        <div className="form-card" id="contact"><span className="eyebrow">STILL STUCK?</span><h2>Tell us what you need.</h2><div className="form-grid"><div className="field"><label htmlFor="support-email">Email</label><input id="support-email" type="email" placeholder="you@example.com" /></div><div className="field"><label htmlFor="support-order">Order ID</label><input id="support-order" placeholder="AKL-123456" /></div><div className="field full"><label htmlFor="support-message">Message</label><textarea id="support-message" rows={5} placeholder="How can we help?" /></div></div><button className="btn" type="button">Send support request →</button></div>
      </section>
    </>
  );
}
