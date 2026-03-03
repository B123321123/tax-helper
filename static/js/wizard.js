const Wizard = {
    currentStep: 0,
    steps: [],
    elsterMap: {},

    init() {
        this.steps = Array.from(document.querySelectorAll(".step"));
        this.progressSteps = Array.from(document.querySelectorAll(".progress-step"));
        this.show(0);

        // Load ELSTER map
        API.getElsterMap().then(map => { this.elsterMap = map; });

        // Navigation buttons
        document.addEventListener("click", e => {
            if (e.target.matches("[data-action='next']")) this.next();
            if (e.target.matches("[data-action='prev']")) this.prev();
            if (e.target.matches("[data-action='calculate']")) this.submit();
            if (e.target.matches("[data-action='restart']")) this.restart();
        });

        // Income category toggles — show/hide conditional steps
        document.querySelectorAll("[data-category-toggle]").forEach(cb => {
            cb.addEventListener("change", () => this.updateConditionalSteps());
        });
    },

    show(index) {
        this.steps.forEach((s, i) => {
            s.classList.toggle("active", i === index);
        });
        this.progressSteps.forEach((s, i) => {
            s.classList.remove("active", "done");
            if (i < index) s.classList.add("done");
            if (i === index) s.classList.add("active");
        });
        this.currentStep = index;
        window.scrollTo({top: 0, behavior: "smooth"});
    },

    getVisibleSteps() {
        return this.steps.filter(s => !s.hasAttribute("data-conditional") || s.style.display !== "none");
    },

    next() {
        let nextIdx = this.currentStep + 1;
        while (nextIdx < this.steps.length && this.steps[nextIdx].hasAttribute("data-conditional") && this.steps[nextIdx].classList.contains("hidden-step")) {
            nextIdx++;
        }
        if (nextIdx < this.steps.length) this.show(nextIdx);
    },

    prev() {
        let prevIdx = this.currentStep - 1;
        while (prevIdx >= 0 && this.steps[prevIdx].hasAttribute("data-conditional") && this.steps[prevIdx].classList.contains("hidden-step")) {
            prevIdx--;
        }
        if (prevIdx >= 0) this.show(prevIdx);
    },

    updateConditionalSteps() {
        const selected = new Set();
        document.querySelectorAll("[data-category-toggle]:checked").forEach(cb => {
            selected.add(cb.value);
        });
        this.steps.forEach(s => {
            const req = s.getAttribute("data-conditional");
            if (req) {
                const hidden = !selected.has(req);
                s.classList.toggle("hidden-step", hidden);
            }
        });
    },

    collectPayload() {
        const val = (id, fallback = 0) => {
            const el = document.getElementById(id);
            if (!el) return fallback;
            if (el.type === "checkbox") return el.checked;
            const v = el.value;
            if (v === "true") return true;
            if (v === "false") return false;
            return v === "" ? fallback : (isNaN(Number(v)) ? v : Number(v));
        };

        const categories = [];
        document.querySelectorAll("[data-category-toggle]:checked").forEach(cb => {
            categories.push(cb.value);
        });

        return {
            tax_year: 2025,
            filing_status: val("filing_status", "single"),
            bundesland: val("bundesland", "Berlin"),
            church_member: val("church_member", false),
            birth_year: val("birth_year", 1990),
            income_categories: categories,

            employment: {
                bruttolohn: val("bruttolohn"),
                lohnsteuer_einbehalten: val("lohnsteuer_einbehalten"),
                soli_einbehalten: val("soli_einbehalten"),
                kist_einbehalten: val("kist_einbehalten"),
                commuting_days: val("commuting_days"),
                one_way_km: val("one_way_km"),
                homeoffice_days: val("homeoffice_days"),
                uses_own_car: val("uses_own_car", true),
                other_wk: val("other_wk"),
                public_transport_annual: val("public_transport_annual"),
            },

            capital: {
                dividends: val("cap_dividends"),
                interest: val("cap_interest"),
                realized_gains: val("cap_realized_gains"),
                fund_distributions: val("cap_fund_distributions"),
                fund_sale_gains: val("cap_fund_sale_gains"),
                vorabpauschale: val("cap_vorabpauschale"),
                fund_type: val("cap_fund_type", "sonstige"),
                already_withheld_kest: val("cap_withheld_kest"),
                already_withheld_soli: val("cap_withheld_soli"),
                already_withheld_kist: val("cap_withheld_kist"),
            },

            freelance: {
                business_type: (document.querySelector('input[name="freelance_type"]:checked') || {}).value || "freiberufler",
                einnahmen: val("freelance_einnahmen"),
                betriebsausgaben: val("freelance_ausgaben"),
                hebesatz: val("freelance_hebesatz", 400),
            },

            rental: {
                mieteinnahmen: val("rental_mieteinnahmen"),
                nebenkosten_umlagen: val("rental_nebenkosten"),
                schuldzinsen: val("rental_schuldzinsen"),
                afa: val("rental_afa"),
                sonstige_wk: val("rental_sonstige_wk"),
                grundsteuer: val("rental_grundsteuer"),
            },

            children: {
                num_children: val("num_children"),
                kindergeld_received: val("kindergeld_received"),
            },

            deductions: {
                grv_beitraege: val("grv_beitraege"),
                ruerup_beitraege: val("ruerup_beitraege"),
                kv_basis: val("kv_basis"),
                pv_beitraege: val("pv_beitraege"),
                sonstige_vorsorge: val("sonstige_vorsorge"),
                is_gkv: val("is_gkv", true),
                kirchensteuer_paid: val("kirchensteuer_paid"),
                spenden: val("spenden"),
                handwerkerleistungen: val("handwerkerleistungen"),
                haushaltsnahe_dl: val("haushaltsnahe_dl"),
                aussergewoehnliche_belastungen: val("agb"),
            },
        };
    },

    async submit() {
        const resultsStep = document.getElementById("step-results");
        resultsStep.innerHTML = '<div class="loading">Berechnung laeuft...</div>';
        this.show(this.steps.length - 1);

        try {
            const payload = this.collectPayload();
            const result = await API.calculate(payload);
            Results.render(result, this.elsterMap);
        } catch (err) {
            resultsStep.innerHTML = `<div class="result-card"><h3>Fehler</h3><p>${err.message}</p></div>`;
        }
    },

    restart() {
        this.show(0);
    },
};

document.addEventListener("DOMContentLoaded", () => Wizard.init());
