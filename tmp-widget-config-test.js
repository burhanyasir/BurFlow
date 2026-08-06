const fetch = require('node-fetch');
const url = 'http://localhost:3457/api/widget/config?token=eyJ0ZW5hbnRJZCI6ImRlbW8tdGVuYW50IiwidHlwZSI6IndpZGdldCIsImlhdCI6MTc4NTY2MDk3NiwiZXhwIjoyMTAxMDIwOTc2fQ.de33b8c3083e6a1f52663eb05fdb5555f8c59bbd5a43fe75f386ccde712f35bc';
(async () => {
  try {
    const res = await fetch(url);
    console.log('status', res.status);
    console.log('headers', Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log('body', body);
  } catch (err) {
    console.error('error', err);
  }
})();
