// Acme Cloud's own behavior. Both demo pages load it: it's what the app does with or
// without the tour installed.

// Billing period: switching to yearly changes the Pro price.
document.querySelectorAll('#billing-toggle button').forEach(button => {
  button.addEventListener('click', () => {
    const yearly = button.dataset.period === 'yearly';
    document.querySelectorAll('#billing-toggle button').forEach(b => {
      b.setAttribute('aria-pressed', String(b === button));
    });
    document.getElementById('pro-price').textContent = yearly ? '23' : '29';
    document.getElementById('pro-period').textContent = yearly ? 'per seat / month, billed yearly' : 'per seat / month';
  });
});

// Sign-up: in a real app this would create the account.
document.getElementById('signup-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = document.getElementById('signup-email').value;
  document.getElementById('signup-result').textContent = `✓ Account created for ${email}`;
});
