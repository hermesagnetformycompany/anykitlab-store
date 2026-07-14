import {PageHead} from '@/components/site';

export const metadata = {title: 'Refund Policy — AnyKit Lab'};

export default function Refunds() {
  return (
    <>
      <PageHead eyebrow="LEGAL" title="Refund Policy" copy="How refunds work for digital template kits." />
      <section className="help-sections">
        <article>
          <h2>1. Digital products</h2>
          <p>Every kit sold by AnyKit Lab is a digital product. Because templates can be downloaded and used immediately, they cannot be “returned” in the usual sense.</p>
        </article>
        <article>
          <h2>2. General position</h2>
          <p>Purchases are generally final. We do not offer refunds or exchanges for change of mind, buying the wrong kit, or deciding you no longer need a template.</p>
        </article>
        <article>
          <h2>3. When we will make it right</h2>
          <p>If a kit is faulty, corrupted or inaccessible and we cannot resolve the problem, contact support with your order ID and we will fix it or issue a refund. This includes:</p>
          <ul>
            <li>Template files that will not open in Canva.</li>
            <li>Missing layouts or assets clearly listed in the kit.</li>
            <li>Files that are corrupted or will not download.</li>
          </ul>
        </article>
        <article>
          <h2>4. Before you buy</h2>
          <p>To avoid disappointment, please check the kit description, what’s included and layout count before purchasing. Every kit is designed to work with a free Canva account unless otherwise stated.</p>
        </article>
        <article>
          <h2>5. How to request help</h2>
          <p>If something is wrong with your kit, email <a href="mailto:support@anykitlab.com">support@anykitlab.com</a> with your order ID and a short description of the issue. We aim to respond within 12–24 hours and will work with you to resolve the problem.</p>
        </article>
        <article>
          <h2>6. Chargebacks</h2>
          <p>Please contact us before initiating a chargeback. We handle payment verification manually and most issues can be resolved directly and quickly through support.</p>
        </article>
      </section>
    </>
  );
}