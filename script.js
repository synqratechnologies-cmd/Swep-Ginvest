/* South West Energy Partners: site behaviour (no dependencies). */
(() => {
  'use strict';

  window.SWEP_READY = true;

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const config = window.SWEP_CONFIG || {};
  const CONTACT_EMAIL = config.enquiryRecipient || 'tkelly@swep-ginvest.com';
  const CONTACT_PHONE = '+1 (432) 638-6414';
  const INTEREST_KEY = 'swep-interest';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
  const storage = {
    get: (key) => { try { return sessionStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* storage unavailable */ } },
    remove: (key) => { try { sessionStorage.removeItem(key); } catch { /* storage unavailable */ } },
  };

  /* ------------------------------------------------------------------
     Hero entrance
     ------------------------------------------------------------------ */
  const hero = $('[data-hero]');
  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-loaded')));
  }

  /* ------------------------------------------------------------------
     Header: integrated at the top of each page, floating once scrolled
     ------------------------------------------------------------------ */
  const header = $('[data-header]');
  let isFloating = null;

  const updateHeader = () => {
    const floating = window.scrollY > 24;
    if (floating !== isFloating) {
      isFloating = floating;
      header.classList.toggle('is-floating', floating);
    }
  };

  /* ------------------------------------------------------------------
     Parallax (restrained, transform-only, skipped for reduced motion)
     ------------------------------------------------------------------ */
  const parallaxEls = $$('[data-parallax]');
  const parallaxInView = new Set();

  const updateParallax = () => {
    if (reduceMotion.matches) return;
    const vh = window.innerHeight;
    parallaxInView.forEach((el) => {
      const frame = el.parentElement.getBoundingClientRect();
      let progress = (frame.top + frame.height / 2 - vh / 2) / (vh / 2 + frame.height / 2);
      progress = Math.max(-1, Math.min(1, progress));
      const amount = parseFloat(el.dataset.parallax) || 6;
      el.style.transform = `translate3d(0, ${(-progress * amount).toFixed(2)}%, 0)`;
    });
  };

  /* ------------------------------------------------------------------
     Floating WhatsApp access: hidden over the hero (where it would sit on
     the calls to action) and wherever contact options are already shown.
     ------------------------------------------------------------------ */
  const fab = $('[data-fab]');
  const fabBlockers = new Set();

  const updateFab = () => {
    if (!fab) return;
    const pastHero = window.scrollY > window.innerHeight * 0.6;
    const show = pastHero && fabBlockers.size === 0 && !doc.classList.contains('menu-open');
    fab.classList.toggle('is-hidden', !show);
  };

  /* ------------------------------------------------------------------
     Scroll loop (rAF-batched)
     ------------------------------------------------------------------ */
  let ticking = false;

  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateHeader();
      updateParallax();
      updateFab();
    });
  };

  const parallaxObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) parallaxInView.add(entry.target);
      else parallaxInView.delete(entry.target);
    });
    requestTick();
  }, { rootMargin: '15% 0px' });
  parallaxEls.forEach((el) => parallaxObserver.observe(el));

  if (fab) {
    const fabObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) fabBlockers.add(entry.target);
        else fabBlockers.delete(entry.target);
      });
      updateFab();
    }, { rootMargin: '0px 0px -12% 0px' });
    [$('#contact'), $('#site-footer')].forEach((el) => el && fabObserver.observe(el));
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  window.addEventListener('load', requestTick);
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) parallaxEls.forEach((el) => { el.style.transform = ''; });
    requestTick();
  });
  requestTick();

  /* ------------------------------------------------------------------
     Reveal on scroll, with automatic stagger inside [data-stagger]
     ------------------------------------------------------------------ */
  const staggerStep = () => (reduceMotion.matches ? 30 : 90);
  $$('[data-stagger]').forEach((group) => {
    $$('[data-reveal]', group).forEach((el, index) => {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${index * staggerStep()}ms`);
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  $$('[data-reveal]').forEach((el) => revealObserver.observe(el));

  /* ------------------------------------------------------------------
     Page transitions: native cross-document view transitions where
     supported (pure CSS); a short fade-out before navigating elsewhere.
     ------------------------------------------------------------------ */
  if (doc.classList.contains('no-vt')) {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (reduceMotion.matches) return;
      const link = event.target.closest('a[href]');
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      doc.classList.add('is-leaving');
      window.setTimeout(() => { window.location.href = url.href; }, 240);
    });
    // Restore pages brought back from the back/forward cache.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) doc.classList.remove('is-leaving');
    });
  }

  /* ------------------------------------------------------------------
     In-page navigation helpers
     ------------------------------------------------------------------ */
  const goTo = (hash) => {
    const target = document.querySelector(hash);
    if (!target) return;
    if (hash === '#top') window.scrollTo({ top: 0, behavior: scrollBehavior() });
    else target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    history.pushState(null, '', hash);
    // Move focus with the reader so keyboard and screen-reader users continue from the section.
    const heading = target.querySelector('h1, h2') || target;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  };

  // "Strategic Discussion" links pre-select the enquiry type, including across pages.
  const applyInterest = () => {
    const select = $('#f-interest');
    const value = storage.get(INTEREST_KEY);
    if (select && value) {
      if (!select.value) select.value = value;
      storage.remove(INTEREST_KEY);
    }
  };
  $$('[data-interest]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      storage.set(INTEREST_KEY, trigger.dataset.interest);
      applyInterest();
    });
  });
  applyInterest();

  /* ------------------------------------------------------------------
     Mobile menu: native modal dialog (focus containment, Escape, top layer)
     ------------------------------------------------------------------ */
  const menu = $('#site-menu');
  const menuOpenBtn = $('[data-menu-open]');
  const menuCloseBtn = $('[data-menu-close]');
  const desktopNav = window.matchMedia('(min-width: 80em)');

  if (menu && menuOpenBtn && typeof menu.showModal === 'function') {
    menuOpenBtn.setAttribute('role', 'button');

    const openMenu = () => {
      if (menu.open) return;
      menu.showModal();
      doc.classList.add('menu-open');
      menuOpenBtn.setAttribute('aria-expanded', 'true');
      updateFab();
    };

    const closeMenu = (afterClose) => {
      if (!menu.open) return;
      const finish = () => {
        menu.classList.remove('is-closing');
        menu.close();
        doc.classList.remove('menu-open');
        menuOpenBtn.setAttribute('aria-expanded', 'false');
        updateFab();
        if (afterClose) afterClose();
      };
      if (reduceMotion.matches) {
        finish();
      } else {
        menu.classList.add('is-closing');
        window.setTimeout(finish, 260);
      }
    };

    menuOpenBtn.addEventListener('click', (event) => {
      event.preventDefault();
      openMenu();
    });
    menuOpenBtn.addEventListener('keydown', (event) => {
      if (event.key !== ' ') return;
      event.preventDefault();
      openMenu();
    });
    menuCloseBtn.addEventListener('click', () => closeMenu());
    menu.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeMenu();
    });

    // Links to a section of the current page close the menu, then scroll.
    $$('a[href]', menu).forEach((link) => {
      link.addEventListener('click', (event) => {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
        event.preventDefault();
        closeMenu(() => goTo(url.hash || '#top'));
      });
    });

    desktopNav.addEventListener('change', () => {
      if (desktopNav.matches) closeMenu();
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted && menu.open) {
        menu.close();
        doc.classList.remove('menu-open');
        menuOpenBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------------------------------------------
     Global reach: the region list and the map highlight one another
     ------------------------------------------------------------------ */
  const reach = $('[data-reach]');
  if (reach) {
    const map = $('.reach__map', reach);
    const regionEls = $$('[data-region]', reach);

    const setRegion = (key) => {
      map.classList.toggle('has-active', Boolean(key));
      regionEls.forEach((el) => el.classList.toggle('is-active', el.dataset.region === key));
    };

    $$('.region, .pin[data-region]', reach).forEach((el) => {
      el.addEventListener('pointerenter', () => setRegion(el.dataset.region));
      el.addEventListener('pointerleave', () => setRegion(null));
    });
  }

  /* ------------------------------------------------------------------
     Enquiry form (Web3Forms)
     The access key is read from config.js, which scripts/build.mjs generates
     from the WEB3FORMS_ACCESS_KEY environment variable. Web3Forms delivers to
     the address the key was created for (tkelly@swep-ginvest.com).
     ------------------------------------------------------------------ */
  const form = $('[data-enquiry-form]');
  if (form) {
    const ENDPOINT = 'https://api.web3forms.com/submit';
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^\+?[0-9\s().-]{7,}$/;

    const submitBtn = $('[data-submit]', form);
    const submitLabel = $('[data-submit-label]', form);
    const statusEl = $('[data-form-status]', form);
    const success = $('[data-enquiry-success]');
    const successTitle = $('[data-success-title]');
    const successText = $('[data-success-text]');
    const resetBtn = $('[data-enquiry-reset]');
    let submitting = false;

    const rules = {
      first_name: (v) => (v ? '' : 'Please enter your first name.'),
      last_name: (v) => (v ? '' : 'Please enter your last name.'),
      company: (v) => (v ? '' : 'Please enter your company or organization.'),
      email: (v) => {
        if (!v) return 'Please enter your email address.';
        return EMAIL_RE.test(v) ? '' : 'Please enter a valid email address, for example name@company.com.';
      },
      phone: (v) => {
        if (!v) return '';
        const digits = v.replace(/\D/g, '').length;
        return PHONE_RE.test(v) && digits >= 7 && digits <= 15
          ? ''
          : 'Please enter a valid phone number, including the country code.';
      },
      area_of_interest: (v) => (v ? '' : 'Please select an area of interest.'),
      message: (v) => {
        if (!v) return 'Please enter a message.';
        return v.length >= 20 ? '' : 'Please add a little more detail (at least 20 characters).';
      },
    };
    const fieldNames = Object.keys(rules);

    const validateField = (name) => {
      const input = form.elements[name];
      const message = rules[name](input.value.trim());
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      input.closest('.field').classList.toggle('has-error', Boolean(message));
      document.getElementById(`${input.id}-error`).textContent = message;
      return !message;
    };

    const setStatus = (message = '', isError = false) => {
      statusEl.textContent = message;
      statusEl.classList.toggle('is-error', isError);
    };

    const setSubmitting = (state) => {
      submitting = state;
      form.classList.toggle('is-submitting', state);
      form.setAttribute('aria-busy', String(state));
      submitBtn.disabled = state;
      submitLabel.textContent = state ? 'Sending enquiry…' : 'Submit Enquiry';
    };

    const showSuccess = (values) => {
      setSubmitting(false);
      setStatus();
      successTitle.textContent = `Thank you, ${values.first_name}.`;
      successText.textContent = `Your enquiry has been received. SWEP will review it and respond to ${values.email}.`;
      form.reset();
      fieldNames.forEach((name) => {
        form.elements[name].removeAttribute('aria-invalid');
        form.elements[name].closest('.field').classList.remove('has-error');
      });
      form.hidden = true;
      success.hidden = false;
      successTitle.focus();
    };

    const send = async (values, accessKey) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            access_key: accessKey,
            subject: `Website enquiry: ${values.area_of_interest} (${values.company})`,
            from_name: 'SWEP website',
            name: `${values.first_name} ${values.last_name}`,
            email: values.email,
            'First Name': values.first_name,
            'Last Name': values.last_name,
            'Company / Organization': values.company,
            Phone: values.phone || 'Not provided',
            'Area of Interest': values.area_of_interest,
            Message: values.message,
            botcheck: '',
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success) {
          showSuccess(values);
          return;
        }
        setStatus(
          response.status === 429
            ? 'Too many enquiries have been sent from this connection. Please wait a few minutes and try again.'
            : `Your enquiry could not be sent. Please try again, or email ${CONTACT_EMAIL}.`,
          true
        );
      } catch {
        setStatus(
          `We could not reach the enquiry service. Please check your connection and try again, or email ${CONTACT_EMAIL}.`,
          true
        );
      } finally {
        window.clearTimeout(timer);
        if (!form.hidden) setSubmitting(false);
      }
    };

    fieldNames.forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => {
        if (input.value.trim() || input.getAttribute('aria-invalid') === 'true') validateField(name);
      });
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validateField(name);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submitting) return;

      const invalid = fieldNames.filter((name) => !validateField(name));
      if (invalid.length) {
        setStatus('Please review the highlighted fields.', true);
        form.elements[invalid[0]].focus();
        return;
      }

      const values = Object.fromEntries(fieldNames.map((name) => [name, form.elements[name].value.trim()]));

      // Honeypot: automated submissions are quietly discarded.
      if (form.elements.botcheck?.checked) {
        showSuccess(values);
        return;
      }

      const accessKey = (config.web3formsAccessKey || '').trim();
      if (!accessKey) {
        setStatus(
          `Online enquiries are temporarily unavailable. Please email ${CONTACT_EMAIL} or call ${CONTACT_PHONE}.`,
          true
        );
        return;
      }

      setStatus();
      setSubmitting(true);
      send(values, accessKey);
    });

    resetBtn.addEventListener('click', () => {
      success.hidden = true;
      form.hidden = false;
      form.elements.first_name.focus();
    });
  }
})();
