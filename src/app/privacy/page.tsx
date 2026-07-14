import {PageHead} from '@/components/site';

export const metadata = {title: 'Privacy Policy — AnyKit Lab'};

export default function Privacy() {
  return (
    <>
      <PageHead eyebrow="LEGAL" title="Privacy Policy" copy="What we collect, why we collect it, and how we keep it safe." />
      <section className="help-sections">
        <article>
          <h2>1. Who we are</h2>
          <p>AnyKit Lab (“we”, “us”, “our”) operates this online store selling digital Canva template kits and launch assets. This policy explains how we handle your information when you visit our site or buy a kit.</p>
        </article>
        <article>
          <h2>2. What we collect</h2>
          <p>To process orders and give you access to your kits, we collect:</p>
          <ul>
            <li><strong>Account details</strong> — name, email address and password.</li>
            <li><strong>Order details</strong> — the kits you buy, transaction references and payment status.</li>
            <li><strong>Support messages</strong> — anything you tell us when you reach out.</li>
            <li><strong>Usage data</strong> — pages viewed and basic device/browser information, used to keep the site running well.</li>
          </ul>
          <p>We do not store full card or UPI credentials on our servers. Payments are handled through secure third-party providers.</p>
        </article>
        <article>
          <h2>3. How we use your information</h2>
          <ul>
            <li>Verify payments and deliver your kits.</li>
            <li>Keep your account, downloads and order history available.</li>
            <li>Respond to support requests.</li>
            <li>Improve our kits and the store experience.</li>
          </ul>
          <p>We do not sell or rent your personal information to anyone.</p>
        </article>
        <article>
          <h2>4. Payment verification</h2>
          <p>We verify payments manually. This may involve matching your transaction reference with your order. Customer purchases never provide administrator access to our systems.</p>
        </article>
        <article>
          <h2>5. Cookies &amp; analytics</h2>
          <p>The site may use cookies to keep you logged in and remember items in your cart. We may use analytics to understand which kits and pages are popular. You can disable cookies in your browser, though some site features may not work as expected.</p>
        </article>
        <article>
          <h2>6. Data sharing</h2>
          <p>We share information only with service providers who help us run the store — for example, payment processors and hosting. They are bound to protect your data and use it only for the purpose we give them.</p>
        </article>
        <article>
          <h2>7. Data retention</h2>
          <p>We keep your account and order information for as long as your account is active, and for a reasonable period afterwards to meet legal or accounting requirements.</p>
        </article>
        <article>
          <h2>8. Your rights</h2>
          <p>You can ask to see, correct or delete the personal information we hold about you. To make a request, email <a href="mailto:support@anykitlab.com">support@anykitlab.com</a>.</p>
        </article>
        <article>
          <h2>9. Security</h2>
          <p>We take reasonable steps to protect your information using secure infrastructure and access controls. No method of online storage is completely secure, but we work to keep your data safe.</p>
        </article>
        <article>
          <h2>10. Changes to this policy</h2>
          <p>We may update this policy from time to time. The current version is always the one shown on this page.</p>
        </article>
        <article>
          <h2>11. Contact</h2>
          <p>Privacy questions? Email <a href="mailto:support@anykitlab.com">support@anykitlab.com</a> and we will be happy to help.</p>
        </article>
      </section>
    </>
  );
}