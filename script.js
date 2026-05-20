document.addEventListener("DOMContentLoaded", () => {
  // --- Data ---
  const phrases = [
    "AI Website Creation",
    "AI Image Prompts",
    "AI Video Prompts",
    "N8N Automations",
    "Prompt Engineering",
    "AI Automation",
    "Future Starts Here",
  ];

  // --- Theme Toggle ---
  const body = document.getElementById("body");
  const themeToggles = [document.getElementById("theme-toggle"), document.getElementById("theme-toggle-mobile")];
  const themeIcons = [document.getElementById("theme-icon"), document.getElementById("theme-icon-mobile")];

  const sunIconPath = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  const moonIconPath = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

  let isDark = localStorage.getItem("theme") !== "light";

  function applyTheme() {
    if (isDark) {
      body.classList.add("dark");
      themeIcons.forEach(icon => icon && (icon.innerHTML = sunIconPath));
    } else {
      body.classList.remove("dark");
      themeIcons.forEach(icon => icon && (icon.innerHTML = moonIconPath));
    }
  }

  function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem("theme", isDark ? "dark" : "light");
    applyTheme();
  }

  applyTheme();
  themeToggles.forEach(toggle => toggle && toggle.addEventListener("click", toggleTheme));

  // --- Announcement Bar ---
  const announcementBar = document.getElementById("announcement-bar");
  const closeAnnouncement = document.getElementById("close-announcement");
  let hasAnnouncement = localStorage.getItem("announcementClosed") !== "true";

  if (announcementBar && !hasAnnouncement) {
    announcementBar.style.display = "none";
  }

  if (closeAnnouncement && announcementBar) {
    closeAnnouncement.addEventListener("click", () => {
      announcementBar.style.display = "none";
      hasAnnouncement = false;
      localStorage.setItem("announcementClosed", "true");
      updateNavTop();
    });
  }

  // --- Scroll & Navbar logic ---
  const navbar = document.getElementById("navbar");
  const mobileMenu = document.getElementById("mobile-menu");
  const hamburger = document.getElementById("hamburger");
  let menuOpen = false;

  function updateNavTop() {
    if (navbar && mobileMenu) {
      navbar.style.top = hasAnnouncement ? "38px" : "0";
      mobileMenu.style.top = hasAnnouncement ? "108px" : "70px";
    }
  }
  updateNavTop();

  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640 && menuOpen && mobileMenu) {
      menuOpen = false;
      mobileMenu.classList.remove("open");
    }
  });

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      menuOpen = !menuOpen;
      if (menuOpen) mobileMenu.classList.add("open");
      else mobileMenu.classList.remove("open");
    });
  }

  // Close mobile menu on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen && mobileMenu) {
      menuOpen = false;
      mobileMenu.classList.remove("open");
    }
  });

  // Smooth scroll links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        menuOpen = false;
        mobileMenu && mobileMenu.classList.remove("open");
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // --- Intersection Observer (Fade In) ---
  const fadeElements = document.querySelectorAll('.genai-fade-in');
  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: "0px 0px -50px 0px" });

  fadeElements.forEach(el => fadeObserver.observe(el));

  // --- Count Up Animation ---
  function animateValue(obj, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = Math.floor(progress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end;
      }
    };
    window.requestAnimationFrame(step);
  }

  const statTargets = [
    { id: "stat-students", val: 100 },
    { id: "stat-courses", val: 10 },
    { id: "stat-founders", val: 2 }
  ];

  const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        statTargets.forEach(target => {
          const el = document.getElementById(target.id);
          if (el) animateValue(el, target.val, 2000);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.querySelector('.genai-stats-bar');
  if (statsSection) statsObserver.observe(statsSection);

  // --- Typewriter Effect ---
  const typewriterText = document.getElementById("typewriter-text");
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 50;
  let deletingSpeed = 25;
  let pauseTime = 2000;

  function typeWriter() {
    if (!typewriterText) return;
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      typewriterText.innerText = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(typeWriter, pauseTime);
      } else {
        setTimeout(typeWriter, typingSpeed);
      }
    } else {
      typewriterText.innerText = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
      setTimeout(typeWriter, deletingSpeed);
    }
  }
  typeWriter();

  // --- Contact Form ---
  const contactForm = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = contactForm.querySelector('input[type="text"]');
      const emailInput = contactForm.querySelector('input[type="email"]');
      const messageInput = contactForm.querySelector('textarea');

      const name = nameInput ? nameInput.value : '';
      const email = emailInput ? emailInput.value : '';
      const msg = messageInput ? messageInput.value : '';

      const whatsappNumber = "94786296266";
      const textToSend = `*New Website Message*\n\n*Name:* ${name}\n*Email:* ${email}\n\n*Message:*\n${msg}`;
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(textToSend)}`;

      window.open(whatsappUrl, '_blank');

      if (formSuccess) {
        formSuccess.style.display = 'block';
        setTimeout(() => { formSuccess.style.display = 'none'; }, 4000);
      }
      contactForm.reset();
    });
  }

  // --- Auto YouTube Thumbnails ---
  const videoCards = document.querySelectorAll('.genai-video-card');
  videoCards.forEach(card => {
    const url = card.getAttribute('href');
    if (!url) return;

    let videoId = null;
    if (url.includes('youtube.com/watch')) {
      try {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      } catch (e) { }
    } else if (url.includes('youtu.be/')) {
      const parsed = url.split('youtu.be/')[1];
      videoId = parsed ? parsed.split('?')[0] : null;
    }

    if (videoId) {
      const thumbDiv = card.querySelector('.genai-video-thumb');
      if (thumbDiv) {
        // 0.jpg is the most reliable fallback for all videos
        thumbDiv.style.backgroundImage = `url('https://img.youtube.com/vi/${videoId}/0.jpg')`;
        thumbDiv.style.backgroundSize = 'cover';
        thumbDiv.style.backgroundPosition = 'center';
      }
    }
  });

  // --- Dot Canvas ---
  const canvas = document.getElementById("hero-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let dots = [];
    let isMobile = window.innerWidth < 640;
    let dotCount = isMobile ? 40 : 100;
    let mouseRadius = 150;
    let mouse = { x: -9999, y: -9999 };

    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      dots = [];
      isMobile = window.innerWidth < 640;
      dotCount = isMobile ? 40 : 100;
      for (let i = 0; i < dotCount; i++) {
        dots.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4
        });
      }
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener("mouseleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouseRadiusSq = mouseRadius * mouseRadius;

      for (let dot of dots) {
        // Handle mouse interaction
        const mdx = dot.x - mouse.x;
        const mdy = dot.y - mouse.y;
        const mDistSq = mdx * mdx + mdy * mdy;

        if (mDistSq < mouseRadiusSq && mDistSq > 0) {
          const mDist = Math.sqrt(mDistSq);
          const force = (mouseRadius - mDist) / mouseRadius * 0.8;
          dot.x += (mdx / mDist) * force;
          dot.y += (mdy / mDist) * force;
        }

        dot.x += dot.vx;
        dot.y += dot.vy;

        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();
      }

      // Draw lines between near dots
      const thresholdSq = 120 * 120;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < thresholdSq) {
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(0,0,0,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw lines to mouse
      for (let dot of dots) {
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(dot.x, dot.y);
          ctx.strokeStyle = `rgba(0,0,0,${0.2 * (1 - dist / mouseRadius)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      requestAnimationFrame(draw);
    }
    draw();
  }
});
