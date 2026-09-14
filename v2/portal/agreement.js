// Template for demonstration/workflow purposes — have a Florida attorney review before production use.
// Data-driven client service agreement for the RecoverRevenue portal.
// Placeholders: {{client_name}} {{business_name}} {{plan_name}} {{monthly_fee}} {{build_fee}} {{date}}

window.RR_AGREEMENT = {
  version: "1.0",
  updated: "2026-07-22",
  title: "RecoverRevenue Client Service Agreement",
  summary: [
    "90-day initial term, then month-to-month — cancel with 30 days' written notice.",
    "One-time build fee at signing, then a flat monthly fee billed in advance.",
    "Stay 12 months on any plan and the website is 100% yours — or take it early with a one-time $997 buy-out.",
    "Your brand, logos, photos, and business content are always yours, regardless of tenure.",
    "Results are reported in your portal in conservatively-attributed dollars — no revenue guarantees.",
    "Both sides keep each other's non-public business information confidential.",
    "Liability is capped at the fees paid in the prior 3 months; no consequential damages either way.",
    "Typing your name is a binding electronic signature (ESIGN/UETA). Florida law governs."
  ],
  html: `
<h3>1. Parties &amp; Effective Date</h3>
<p>This Client Service Agreement ("Agreement") is between RecoverRevenue, Tampa Bay, Florida ("Provider") and {{client_name}}, on behalf of {{business_name}} ("Client"). It takes effect on {{date}} (the "Effective Date").</p>

<h3>2. Services &amp; Plan Scope</h3>
<p>Provider will deliver the services included in Client's selected plan, <strong>{{plan_name}}</strong>, as published on Provider's pricing page at the Effective Date:</p>
<ul>
<li><strong>Visibility</strong> — conversion website built and launched; hosting, maintenance, and unlimited small edits; Google Business Profile management; local SEO and tracking number; missed-call text-back; client portal reporting.</li>
<li><strong>Visibility+</strong> — everything in Visibility, plus a website chatbot trained on Client's business and an automated review engine with AI-drafted replies.</li>
<li><strong>Full Recovery</strong> — everything in Visibility+, plus a 24/7 AI receptionist with calendar booking and a monthly past-customer reactivation lead engine.</li>
</ul>
<p>Work outside the selected plan is quoted flat, in writing, before it begins.</p>

<h3>3. Term &amp; Renewal</h3>
<p>The initial term is 90 days from the Effective Date. After the initial term, this Agreement continues month-to-month until either party cancels with 30 days' written notice.</p>

<h3>4. Fees &amp; Billing</h3>
<p>Client pays a one-time build fee of <strong>{{build_fee}}</strong>, due at signing, and a recurring monthly fee of <strong>{{monthly_fee}}</strong>, billed in advance. An annual option at a reduced monthly rate is available, paid up front for the year. If a payment fails, Provider will notify Client and retry. Amounts more than 10 days past due may result in suspension of services until the account is current.</p>

<h3>5. Client Responsibilities</h3>
<p>Client will provide, within a reasonable time, the content, brand assets, account access, and approvals needed to build and operate the services. Delays in providing these may extend delivery timelines. Client is responsible for the accuracy of the business information it supplies.</p>

<h3>6. Website &amp; IP Ownership</h3>
<p>After 12 continuous months on any plan, the website is 100% Client's — code, domain, and content — at no additional charge. If Client leaves before 12 months, Client may take the website by paying a one-time buy-out of $997; otherwise Provider retains the site build. Client always owns its own brand assets, logos, photos, and business content, regardless of tenure. Provider retains its internal tools, templates, and processes.</p>

<h3>7. Third-Party Services</h3>
<p>The services depend on third parties, including hosting providers, phone and SMS carriers, and Google. Provider configures and manages these on Client's behalf but does not control them and does not guarantee their availability, pricing, or policies. A third-party outage or policy change is not a breach of this Agreement.</p>

<h3>8. Reporting &amp; No Guarantee</h3>
<p>Provider reports results transparently in the client portal using conservatively-attributed dollar figures. Provider makes no guarantee of revenue, leads, rankings, or any other business outcome. Client acknowledges that results vary by market and business.</p>

<h3>9. Confidentiality</h3>
<p>Each party will keep the other's non-public business information confidential and use it only to perform under this Agreement. This obligation survives termination.</p>

<h3>10. Limitation of Liability</h3>
<p>Provider's total liability under this Agreement is capped at the fees Client paid in the three months before the claim arose. Neither party is liable for indirect, incidental, or consequential damages, including lost profits.</p>

<h3>11. Termination</h3>
<p>After the initial 90-day term, either party may terminate with 30 days' written notice. Either party may terminate immediately if the other materially breaches this Agreement and fails to cure within 15 days of written notice. On termination, Client pays for services delivered through the termination date, and the ownership terms in Section 6 apply.</p>

<h3>12. Electronic Signature Consent</h3>
<p>The parties consent to transact business electronically, to receive notices and records electronically, and to use electronic signatures in place of paper. Typing your name in the signature field and submitting this Agreement constitutes your electronic signature and creates a binding agreement under the federal ESIGN Act and Florida's Uniform Electronic Transactions Act.</p>

<h3>13. Governing Law &amp; Entire Agreement</h3>
<p>This Agreement is governed by the laws of the State of Florida. It is the entire agreement between the parties on its subject and replaces prior discussions. Changes must be in writing and agreed to by both parties.</p>
`
};
