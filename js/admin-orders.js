/* ================================================================
   DURGA DESIGNS — ADMIN ORDERS FRONTEND (Stage 7, TEST MODE ONLY)
   ================================================================
   Drives admin/index.html, admin/orders/index.html, and admin/order.html.

   What this module does:
     - Asks the admin to paste an ADMIN_ACCESS_TOKEN (kept ONLY in
       sessionStorage for this browser tab — never written to any
       file, never logged, never sent anywhere except as a header on
       requests to Durga Designs' own admin Netlify Functions).
     - Calls /.netlify/functions/admin-orders (list + detail) and
       /.netlify/functions/admin-order-update (status/courier/tracking/notes)
       — the ONLY sanctioned paths to order data. This file NEVER talks
       to Supabase directly, and never could: the service role key is
       server-side only and never reaches the browser.
     - Renders order lists/detail and handles the update form.

   What this module deliberately does NOT do:
     - It does not persist the token anywhere durable (no localStorage,
       no cookies) — closing the tab signs the admin out.
     - It does not render any order data until a request succeeds with
       a valid token — there is no "preview" of order data pre-auth.
     - It never sends emails (Stage 8) and never edits legal pages.
   ================================================================ */

(function () {
  'use strict';

  var TOKEN_STORAGE_KEY = 'dd_admin_token_session';
  var ORDERS_ENDPOINT = '/.netlify/functions/admin-orders';
  var UPDATE_ENDPOINT = '/.netlify/functions/admin-order-update';

  /* ── token storage (session-only, never persisted to disk) ──────── */

  function getStoredToken() {
    try {
      return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function storeToken(token) {
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) { /* ignore — worst case the admin re-enters it */ }
  }

  function clearToken() {
    try {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ── small fetch helper — always sends the token as a header,
        never in the URL/query string ─────────────────────────────── */

  function adminFetch(url, options) {
    var token = getStoredToken();
    var opts = options || {};
    var headers = Object.assign({}, opts.headers || {}, {
      'X-Admin-Token': token
    });
    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, Object.assign({}, opts, { headers: headers }))
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .catch(function (err) {
        return { ok: false, status: 0, data: {}, networkError: true, message: err && err.message };
      });
  }

  function describeAuthFailure(result) {
    if (result.networkError) return 'Could not reach the admin server. Check your local server is running.';
    if (result.status === 401) return 'Admin token required. Please enter your access token.';
    if (result.status === 403) return 'That admin token is not valid. Please check it and try again.';
    if (result.status === 503) return (result.data && result.data.error) || 'Admin access is not configured for this environment yet.';
    return (result.data && result.data.error) || 'Something went wrong. Please try again.';
  }

  /* ── formatting helpers ──────────────────────────────────────────── */

  function formatMoney(amount, currency) {
    if (typeof amount !== 'number') return '—';
    var cur = (currency || 'gbp').toUpperCase();
    var symbol = cur === 'GBP' ? '£' : (cur + ' ');
    return symbol + amount.toFixed(2);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return iso;
    }
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = (value === null || value === undefined) ? '' : String(value);
    return div.innerHTML;
  }

  function formatAddress(address) {
    if (!address || typeof address !== 'object') return '—';
    var parts = [address.line1, address.line2, address.city, address.postcode, address.country]
      .map(function (p) { return (typeof p === 'string') ? p.trim() : ''; })
      .filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  function sourcePillLabel(source) {
    if (source === 'supabase') return '🟢 Connected to Supabase';
    if (source === 'dev-fallback') return '🧪 Using local DEV/TEST order store (Supabase not configured)';
    return '';
  }

  /* ── shared "gate" behaviour for orders-list / order-detail pages ─
        Both pages start with a token-entry gate; once a request with
        the stored/entered token succeeds, the gate is hidden and the
        real view is shown. Nothing is ever rendered before that. ──── */

  function wireGate(opts) {
    var gate = document.getElementById('dd-admin-gate');
    var form = document.getElementById('dd-admin-gate-form');
    var input = document.getElementById('dd-admin-gate-token-input');
    var status = document.getElementById('dd-admin-gate-status');
    if (!gate || !form || !input) return;

    function showGate(message, isError) {
      gate.hidden = false;
      if (opts.view) opts.view.hidden = true;
      if (status) {
        status.textContent = message || '';
        status.className = 'dd-admin-form-status' + (isError ? ' dd-admin-status-error' : '');
      }
    }

    function hideGate() {
      gate.hidden = true;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var entered = input.value.trim();
      if (!entered) {
        showGate('Please enter your admin access token.', true);
        return;
      }
      storeToken(entered);
      attemptUnlock();
    });

    function attemptUnlock() {
      if (status) {
        status.textContent = 'Checking access…';
        status.className = 'dd-admin-form-status';
      }
      opts.verify(function (success, message) {
        if (success) {
          hideGate();
          if (opts.view) opts.view.hidden = false;
          if (opts.onUnlocked) opts.onUnlocked();
        } else {
          clearToken();
          showGate(message, true);
        }
      });
    }

    // If a token is already stashed in this tab's session storage
    // (e.g. navigated here from another admin page), try it silently.
    if (getStoredToken()) {
      attemptUnlock();
    }
  }

  function wireSignOut(buttonId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      clearToken();
      window.location.href = '../index.html';
    });
  }

  /* ================================================================
     Page: admin/index.html — login/landing
     ================================================================ */

  function initLoginPage() {
    var form = document.getElementById('dd-admin-login-form');
    var input = document.getElementById('dd-admin-token-input');
    var status = document.getElementById('dd-admin-login-status');
    if (!form || !input) return;

    function setStatus(message, isError) {
      if (!status) return;
      status.textContent = message || '';
      status.className = 'dd-admin-form-status' + (isError ? ' dd-admin-status-error' : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var token = input.value.trim();
      if (!token) {
        setStatus('Please enter your admin access token.', true);
        return;
      }

      storeToken(token);
      setStatus('Checking access…', false);

      adminFetch(ORDERS_ENDPOINT + '?limit=1', { method: 'GET' }).then(function (result) {
        if (result.ok) {
          setStatus('Access confirmed — loading orders…', false);
          window.location.href = 'orders/index.html';
        } else {
          clearToken();
          setStatus(describeAuthFailure(result), true);
        }
      });
    });
  }

  /* ================================================================
     Page: admin/orders/index.html — order list
     ================================================================ */

  function initOrdersListPage() {
    var view = document.getElementById('dd-admin-orders-view');
    var tbody = document.getElementById('dd-admin-orders-tbody');
    var emptyNote = document.getElementById('dd-admin-orders-empty');
    var statusEl = document.getElementById('dd-admin-orders-status');
    var sourcePill = document.getElementById('dd-admin-orders-source');
    var refreshBtn = document.getElementById('dd-admin-refresh-btn');

    wireSignOut('dd-admin-logout-btn');

    function setStatus(message, isError) {
      if (!statusEl) return;
      statusEl.textContent = message || '';
      statusEl.className = 'dd-admin-form-status' + (isError ? ' dd-admin-status-error' : '');
    }

    function renderOrders(orders) {
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!orders.length) {
        if (emptyNote) emptyNote.hidden = false;
        return;
      }
      if (emptyNote) emptyNote.hidden = true;

      orders.forEach(function (order) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td><a href="../order.html?id=' + encodeURIComponent(order.id) + '">' + escapeHtml(order.orderNumber || order.id) + '</a></td>' +
          '<td>' + escapeHtml(formatDate(order.date)) + '</td>' +
          '<td>' + escapeHtml(order.customerName || '—') + '</td>' +
          '<td>' + escapeHtml(order.customerEmail || '—') + '</td>' +
          '<td>' + escapeHtml(formatMoney(order.totalAmount, order.currency)) + '</td>' +
          '<td><span class="dd-admin-badge dd-admin-badge-payment">' + escapeHtml(order.paymentStatus || '—') + '</span></td>' +
          '<td><span class="dd-admin-badge dd-admin-badge-status dd-status-' + escapeHtml((order.orderStatus || '').toLowerCase()) + '">' + escapeHtml(order.orderStatus || '—') + '</span></td>';
        tbody.appendChild(tr);
      });
    }

    function loadOrders() {
      setStatus('Loading orders…', false);
      adminFetch(ORDERS_ENDPOINT + '?limit=100', { method: 'GET' }).then(function (result) {
        if (!result.ok) {
          setStatus(describeAuthFailure(result), true);
          return;
        }
        var data = result.data || {};
        if (sourcePill) sourcePill.textContent = sourcePillLabel(data.source);
        renderOrders(Array.isArray(data.orders) ? data.orders : []);
        setStatus('Loaded ' + (data.count || 0) + ' order' + (data.count === 1 ? '' : 's') + '.', false);
      });
    }

    if (refreshBtn) refreshBtn.addEventListener('click', loadOrders);

    wireGate({
      view: view,
      verify: function (callback) {
        adminFetch(ORDERS_ENDPOINT + '?limit=1', { method: 'GET' }).then(function (result) {
          callback(result.ok, result.ok ? '' : describeAuthFailure(result));
        });
      },
      onUnlocked: loadOrders
    });
  }

  /* ================================================================
     Page: admin/order.html — single order detail + update form
     ================================================================ */

  function getOrderIdFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      return (params.get('id') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function initOrderDetailPage() {
    var view = document.getElementById('dd-admin-order-view');
    var content = document.getElementById('dd-admin-order-content');
    var statusMsg = document.getElementById('dd-admin-order-status-msg');
    var orderId = getOrderIdFromUrl();

    function setStatusMsg(message, isError) {
      if (!statusMsg) return;
      statusMsg.textContent = message || '';
      statusMsg.className = 'dd-admin-form-status' + (isError ? ' dd-admin-status-error' : '');
    }

    if (!orderId) {
      setStatusMsg('No order id was provided. Go back to the order list and choose an order.', true);
      // Still wire the gate so the page doesn't render anything before auth,
      // but there is nothing useful to load.
      wireGate({ view: view, verify: function (cb) { cb(false, 'No order selected.'); } });
      return;
    }

    function renderItems(items) {
      var tbody = document.getElementById('dd-order-items-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      (items || []).forEach(function (item) {
        var lineTotal = (typeof item.unitAmount === 'number' && typeof item.qty === 'number')
          ? item.unitAmount * item.qty
          : null;
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(item.title || item.slug || '—') + '</td>' +
          '<td>' + escapeHtml(item.qty != null ? item.qty : '—') + '</td>' +
          '<td>' + escapeHtml(formatMoney(item.unitAmount, item.currency)) + '</td>' +
          '<td>' + escapeHtml(lineTotal === null ? '—' : formatMoney(lineTotal, item.currency)) + '</td>';
        tbody.appendChild(tr);
      });
    }

    function renderHistory(history) {
      var list = document.getElementById('dd-order-history-list');
      if (!list) return;
      list.innerHTML = '';
      if (!history || !history.length) {
        var empty = document.createElement('li');
        empty.className = 'dd-admin-history-empty';
        empty.textContent = 'No status changes recorded yet.';
        list.appendChild(empty);
        return;
      }
      history.slice().reverse().forEach(function (entry) {
        var li = document.createElement('li');
        var noteHtml = entry.note ? (' — <em>' + escapeHtml(entry.note) + '</em>') : '';
        li.innerHTML =
          '<strong>' + escapeHtml(entry.from || '—') + ' → ' + escapeHtml(entry.to || '—') + '</strong>' +
          ' <span class="dd-admin-history-date">' + escapeHtml(formatDate(entry.changedAt)) + '</span>' + noteHtml;
        list.appendChild(li);
      });
    }

    function fillForm(order) {
      var idField = document.getElementById('dd-admin-order-id');
      var statusSelect = document.getElementById('dd-admin-status-select');
      var courierField = document.getElementById('dd-admin-courier');
      var trackingField = document.getElementById('dd-admin-tracking');
      var notesField = document.getElementById('dd-admin-notes');

      if (idField) idField.value = order.id || '';
      if (statusSelect) statusSelect.value = order.orderStatus || 'Paid';
      if (courierField) courierField.value = order.courier || '';
      if (trackingField) trackingField.value = order.trackingNumber || '';
      if (notesField) notesField.value = order.adminNotes || '';
    }

    function renderOrder(order) {
      document.getElementById('dd-order-number').textContent = order.orderNumber || '—';
      document.getElementById('dd-order-session-id').textContent = order.stripeSessionId || '—';
      document.getElementById('dd-order-payment-status').textContent = order.paymentStatus || '—';
      document.getElementById('dd-order-created-at').textContent = formatDate(order.createdAt);
      document.getElementById('dd-order-updated-at').textContent = formatDate(order.updatedAt);
      document.getElementById('dd-order-total').textContent = formatMoney(order.totalAmount, order.currency);

      document.getElementById('dd-order-customer-name').textContent = order.customerName || '—';
      document.getElementById('dd-order-customer-email').textContent = order.customerEmail || '—';
      document.getElementById('dd-order-customer-phone').textContent = order.customerPhone || '—';
      document.getElementById('dd-order-address').textContent = formatAddress(order.address);

      renderItems(order.items);
      renderHistory(order.statusHistory);
      fillForm(order);

      content.hidden = false;
    }

    function loadOrder() {
      setStatusMsg('Loading order…', false);
      adminFetch(ORDERS_ENDPOINT + '?id=' + encodeURIComponent(orderId), { method: 'GET' }).then(function (result) {
        if (!result.ok) {
          if (result.status === 404) {
            setStatusMsg('That order could not be found.', true);
          } else {
            setStatusMsg(describeAuthFailure(result), true);
          }
          return;
        }
        var data = result.data || {};
        if (!data.order) {
          setStatusMsg('That order could not be found.', true);
          return;
        }
        setStatusMsg('', false);
        renderOrder(data.order);
      });
    }

    function wireUpdateForm() {
      var form = document.getElementById('dd-admin-update-form');
      var updateStatus = document.getElementById('dd-admin-update-status');
      if (!form) return;

      function setUpdateStatus(message, isError) {
        if (!updateStatus) return;
        updateStatus.textContent = message || '';
        updateStatus.className = 'dd-admin-form-status' + (isError ? ' dd-admin-status-error' : '');
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var idField = document.getElementById('dd-admin-order-id');
        var payload = {
          id: idField ? idField.value : orderId,
          status: document.getElementById('dd-admin-status-select').value,
          statusNote: document.getElementById('dd-admin-status-note').value,
          courier: document.getElementById('dd-admin-courier').value,
          trackingNumber: document.getElementById('dd-admin-tracking').value,
          adminNotes: document.getElementById('dd-admin-notes').value
        };

        setUpdateStatus('Saving…', false);

        adminFetch(UPDATE_ENDPOINT, { method: 'POST', body: JSON.stringify(payload) }).then(function (result) {
          if (!result.ok) {
            setUpdateStatus(describeAuthFailure(result) || (result.data && result.data.error) || 'Could not save changes.', true);
            return;
          }
          var data = result.data || {};
          if (data.order) renderOrder(data.order);
          // Clear the one-off "note about this change" field after a successful save.
          var noteField = document.getElementById('dd-admin-status-note');
          if (noteField) noteField.value = '';
          setUpdateStatus(data.statusChanged ? 'Saved — status updated and recorded in history.' : 'Saved.', false);
        });
      });
    }

    wireUpdateForm();

    wireGate({
      view: view,
      verify: function (callback) {
        adminFetch(ORDERS_ENDPOINT + '?limit=1', { method: 'GET' }).then(function (result) {
          callback(result.ok, result.ok ? '' : describeAuthFailure(result));
        });
      },
      onUnlocked: loadOrder
    });
  }

  window.DDAdmin = {
    initLoginPage: initLoginPage,
    initOrdersListPage: initOrdersListPage,
    initOrderDetailPage: initOrderDetailPage
  };
})();
