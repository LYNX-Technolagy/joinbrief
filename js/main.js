// Presentational and form wiring. No logging of email addresses or row data.

(function () {
    // Signal that JS is available. CSS gates the reveal hidden state on this
    // class, so if this script never runs, content stays visible.
    document.documentElement.classList.add("js");

    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- Navbar scroll state ---------------------------------------------

    var nav = document.getElementById("navbar");
    if (nav) {
        var threshold = 8;

        var updateNav = function () {
            if (window.scrollY > threshold) {
                nav.classList.add("scrolled");
            } else {
                nav.classList.remove("scrolled");
            }
        };

        updateNav();
        window.addEventListener("scroll", updateNav, { passive: true });
    }

    // --- Footer year -----------------------------------------------------

    var yearEl = document.getElementById("footer-year");
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    // --- Scroll reveal ---------------------------------------------------

    var reveals = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (reveals.length > 0) {
        if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
            reveals.forEach(function (el) { el.classList.add("is-visible"); });
        } else {
            var groups = {};
            reveals.forEach(function (el) {
                var parent = el.parentElement || document.body;
                if (!groups[parent]) groups[parent] = 0;
                var index = groups[parent]++;
                el.style.setProperty("--reveal-delay", Math.min(index * 70, 280) + "ms");
            });

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: "0px 0px -10% 0px",
                threshold: 0.1
            });

            reveals.forEach(function (el) { observer.observe(el); });
        }
    }

    // --- Waitlist form ---------------------------------------------------

    var form = document.getElementById("waitlist-form");
    var note = document.getElementById("waitlist-note");

    if (!form || !note) return;

    var submitBtn = form.querySelector('button[type="submit"]');
    var emailInput = document.getElementById("waitlist-email");
    var client = null;

    var setNote = function (text) {
        note.textContent = text;
    };

    var getClient = function () {
        if (client) return client;

        if (typeof window.supabase === "undefined" ||
            typeof window.supabase.createClient !== "function" ||
            !window.BRIEF_SUPABASE_URL ||
            !window.BRIEF_SUPABASE_ANON_KEY) {
            return null;
        }

        client = window.supabase.createClient(
            window.BRIEF_SUPABASE_URL,
            window.BRIEF_SUPABASE_ANON_KEY
        );
        return client;
    };

    var looksLikeEmail = function (value) {
        if (!value) return false;
        if (value.length > 254) return false;
        if (/\s/.test(value)) return false;
        var at = value.indexOf("@");
        if (at < 1 || at !== value.lastIndexOf("@")) return false;
        var local = value.slice(0, at);
        var domain = value.slice(at + 1);
        if (!local || !domain) return false;
        if (domain.indexOf(".") < 1) return false;
        return true;
    };

    var goToThankYou = function () {
        window.location.assign("thank-you.html");
    };

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var email = emailInput ? emailInput.value.trim() : "";

        if (!looksLikeEmail(email)) {
            setNote("Check the email address — it doesn't look complete.");
            if (emailInput) emailInput.focus();
            return;
        }

        var sb = getClient();
        if (!sb) {
            setNote("The waitlist isn't connected yet. Email hello@brief.co.za and we'll add you.");
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Joining…";
        }
        setNote("Joining…");

        sb.from("waitlist").insert({ email: email }).then(function (result) {
            var error = result && result.error;

            // 23505 = unique_violation. Duplicate is treated as success so we
            // never reveal whether an address is already on the list.
            if (error && error.code !== "23505") {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Join the waitlist";
                }
                setNote("Something went wrong. Try again, or email hello@brief.co.za.");
                return;
            }

            goToThankYou();
        }, function () {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Join the waitlist";
            }
            setNote("Something went wrong. Try again, or email hello@brief.co.za.");
        });
    });
})();