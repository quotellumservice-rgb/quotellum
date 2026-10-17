# Quotellum public free website

This repository contains the free Quick Quote calculator and the free Quick Quote Excel sample. Calculator inputs are processed locally in the browser without accounts, project storage or data submission.

The $15 Quote Kit is upcoming and checkout is disabled. Paid workbooks, paid offline tools, customer packages, financial operations and internal infrastructure are intentionally excluded. This repository does not provide a hosted business management service or payment fulfillment.

## Local checks

Use Node.js 22 or later. No third-party packages or installation are needed.

    npm test
    npm run build

Build verifies the exact public-file allowlist and publication safeguards. The publish directory is `site`. Netlify can serve it as a static site using the supplied configuration; `/sample` maps to the free Excel download. No functions, cloud credentials, database or payment configuration are required. GitHub Actions performs checks only and does not deploy.

Review the branch and deployment settings before publishing. A passing check is not authorization to deploy, enable payment, spend money or change account permissions.

The sample and site are USD estimates before tax. Quick Quote excludes processing fees, refunds, acquisition and support costs. Inputs and results are planning assumptions, not verified business results.

Support: quotellum.service@gmail.com
