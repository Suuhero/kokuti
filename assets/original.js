(function () {
  'use strict';

  // スクロールでヘッダーに影を付与
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 右ドロワーメニュー
  var navToggle = document.querySelector('.nav-toggle');
  var drawerNav = document.querySelector('.drawer-nav');
  var navBackdrop = document.querySelector('.nav-backdrop');
  var setNavOpen = function (open) {
    document.body.classList.toggle('nav-open', open);
    if (navToggle) {
      navToggle.classList.toggle('is-active', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    }
    if (drawerNav) drawerNav.setAttribute('aria-hidden', open ? 'false' : 'true');
  };
  if (navToggle && drawerNav && navBackdrop) {
    navToggle.addEventListener('click', function () {
      setNavOpen(!document.body.classList.contains('nav-open'));
    });
    navBackdrop.addEventListener('click', function () { setNavOpen(false); });
    drawerNav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setNavOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setNavOpen(false);
    });
  }

  // パターン1（添付HTML準拠）のメニュー
  var referenceToggle = document.querySelector('.site--pattern1 .nav_toggle');
  var referenceNav = document.querySelector('.site--pattern1 header nav');
  var referenceBg = document.querySelector('.site--pattern1 .nav_bg');
  var setReferenceNavOpen = function (open) {
    document.body.classList.toggle('nav_open', open);
    if (referenceNav) referenceNav.classList.toggle('open', open);
    if (referenceToggle) {
      referenceToggle.classList.toggle('active', open);
      referenceToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      referenceToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    }
    if (referenceBg) referenceBg.style.display = open ? 'block' : '';
  };
  if (referenceToggle && referenceNav && referenceBg) {
    referenceToggle.addEventListener('click', function () {
      setReferenceNavOpen(!referenceNav.classList.contains('open'));
    });
    referenceToggle.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setReferenceNavOpen(!referenceNav.classList.contains('open'));
      }
    });
    referenceBg.addEventListener('click', function () { setReferenceNavOpen(false); });
    referenceNav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setReferenceNavOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setReferenceNavOpen(false);
    });
  }

  var referencePagetop = document.querySelector('.site--pattern1 .pagetop');
  if (referencePagetop) {
    var scrollReferenceTop = function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    referencePagetop.addEventListener('click', scrollReferenceTop);
    referencePagetop.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        scrollReferenceTop();
      }
    });
  }

  // MV画像をフェードで自動切り替え
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-mv-fade]').forEach(function (slider) {
      var slides = slider.querySelectorAll('[data-mv-fade-item]');
      if (slides.length < 2) return;
      var activeIndex = 0;
      window.setInterval(function () {
        slides[activeIndex].classList.remove('is-active');
        activeIndex = (activeIndex + 1) % slides.length;
        slides[activeIndex].classList.add('is-active');
      }, 5000);
    });
  }

  // フェードイン（IntersectionObserver対応環境のみ）
  if ('IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.section, .mv__inner');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    targets.forEach(function (t) {
      t.classList.add('fade-target');
      observer.observe(t);
    });
  }
})();
