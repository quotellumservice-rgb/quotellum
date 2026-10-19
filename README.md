# Clariro Systems public free website

This repository contains 31 static public routes, nine educational resources, the Clariro Calculator and the reviewed free Clariro Starter Pack. Calculator inputs are processed locally in the browser without accounts or data submission, with explicit optional one-record browser storage.

The $15 Quote Kit is upcoming and checkout is disabled. Paid workbooks, paid offline tools, customer packages, financial operations and internal infrastructure are intentionally excluded. This repository does not provide a hosted business management service or payment fulfillment.

## Local checks

Use Node.js 22 or later. No third-party packages or installation are needed.

    npm test
    npm run build

Build deterministically generates pages from `scripts/site-content.mjs`, release documentation and a SHA-256 manifest, then verifies the exact public/repository file allowlists and publication safeguards. The publish directory is `site`. Netlify can serve it as a static site using the supplied configuration; `/sample` maps to the free Excel download. No functions, cloud credentials, database or payment configuration are required. GitHub Actions performs checks only and does not deploy.

The 21 core public pages and nine resource pages share semantic navigation, responsive keyboard-accessible menus, policies, metadata and a useful 404. The calculator adds a reset action while retaining the canonical arithmetic. No sign-in, customer app, admin facade, waitlist form or payment endpoint is provided.

Commercial copy is explicit: Quote Kit `BLOCKED`, consulting platform `NOT_FOR_SALE`. Intended $15 one-time terms, 30-day setup/file support and 12-calendar-month recovery require product/hosted-service certification and final owner review. Current free behavior is distinguished from draft commercial policy text.

Release scope and limitations are recorded in `docs/WEBSITE-RELEASE-REPORT.md`, `docs/CLAIM-TO-CAPABILITY-MATRIX.md` and `releases/website-release-manifest.json`. Generated reports deliberately do not invent a commit, hosted URL, browser result or production deployment. The root release reviewer must attach that evidence separately.

Review the branch and deployment settings before publishing. A passing check is not authorization to deploy, enable payment, spend money or change account permissions.

The sample and site are USD estimates before tax. The guided calculator includes processing fees when entered; refunds, acquisition, ongoing support and tax obligations remain separate. Inputs and results are planning assumptions, not verified business results.

Support: quotellum.service@gmail.com


Current website: https://clariro-systems.netlify.app. Legacy repository owner/name and contact mailbox are compatibility endpoints; see docs/BRAND-COMPATIBILITY.md.


Free Calculator 1.1: guided one-job estimate, optional payment fees, three editable scenarios, one explicitly saved local record and strict JSON backup/restore. Starter Pack 1.0 includes a four-sheet workbook, offline calculator, five-page PDF guide, printable/text instructions and CSV inputs. Native Excel and Chromium checks are distinct from unverified Google Sheets, Numbers and Calc imports. Paid tracking and actuals remain a separate unreleased offer.
