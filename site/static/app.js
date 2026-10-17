/* Free calculator only. No accounts, storage, payment calls or data submission. */
(function () {
  'use strict';
  const element = id => document.getElementById(id);
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  function calculate() {
    try {
      const fields = Object.fromEntries(new FormData(element('quote-form')));
      const result = QuotellumMath.quote({ ...fields, target_margin_percent: fields.target_margin, fee_percent: '0', refund_percent: '0', fixed_fee: '0', acquisition: '0', support: '0' });
      element('price').textContent = money(result.price_cents);
      element('cost').textContent = money(result.delivery_cost_cents);
      element('profit').textContent = money(result.contribution_cents);
      element('margin').textContent = result.margin === null ? 'Not available' : (result.margin * 100).toFixed(1) + '%';
      element('quote-error').textContent = '';
      element('comparison').replaceChildren();
      // Ten-percent comparisons use integer rounding of the already rounded USD quote.
      for (const numerator of [9, 10, 11]) {
        const price = Math.round(result.price_cents * numerator / 10);
        const row = document.createElement('tr');
        for (const value of [money(price), money(price - result.delivery_cost_cents)]) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        element('comparison').append(row);
      }
    } catch (error) {
      for (const id of ['price', 'cost', 'profit', 'margin']) element(id).textContent = 'Unavailable';
      element('comparison').replaceChildren();
      element('quote-error').textContent = error.message;
    }
  }
  function invalidate(message, placeholder) {
    for (const id of ['price', 'cost', 'profit', 'margin']) element(id).textContent = placeholder;
    element('comparison').replaceChildren();
    element('quote-error').textContent = message;
  }
  element('quote-form').addEventListener('input', () => invalidate('Inputs changed. Select Calculate quote to update the result.', '—'));
  element('quote-form').addEventListener('invalid', () => invalidate('Check the highlighted inputs and their limits before calculating.', 'Unavailable'), true);
  element('quote-form').addEventListener('submit', event => { event.preventDefault(); calculate(); });
  element('quote-form').addEventListener('reset', () => { setTimeout(calculate, 0); });
  calculate();
})();
