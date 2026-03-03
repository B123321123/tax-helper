const Results = {
    fmt(val) {
        return new Intl.NumberFormat("de-DE", {style: "currency", currency: "EUR"}).format(val);
    },

    badge(fieldName, elsterMap) {
        const e = elsterMap[fieldName];
        if (!e) return "";
        return `<span class="elster-badge" title="${e.hint || ""}">${e.form} Z.${e.line}</span>`;
    },

    row(label, value, elsterField, elsterMap, extra = "") {
        const cls = extra ? ` ${extra}` : "";
        const badge = elsterField ? this.badge(elsterField, elsterMap) : "";
        const valCls = value < 0 ? "negative" : (value > 0 && extra === "total" ? "positive" : "");
        return `<div class="result-row${cls}">
            <span class="label">${label} ${badge}</span>
            <span class="value ${valCls}">${this.fmt(value)}</span>
        </div>`;
    },

    render(result, elsterMap) {
        const s = result.summary;
        const st = result.steps;
        const container = document.getElementById("step-results");

        const nachzahlung = s.nachzahlung;
        const isRefund = nachzahlung < 0;
        const bannerClass = isRefund ? "refund" : "payment";
        const bannerText = isRefund ? "Voraussichtliche Erstattung" : "Voraussichtliche Nachzahlung";

        let html = `
        <div class="result-banner ${bannerClass}">
            ${bannerText}
            <span class="amount">${this.fmt(Math.abs(nachzahlung))}</span>
        </div>`;

        // Income breakdown
        html += `<div class="result-card"><h3>Einkuenfte</h3>`;
        if (st.einkuenfte.employment !== undefined)
            html += this.row("Einkuenfte aus nichtselbstaendiger Arbeit (§19)", st.einkuenfte.employment, "bruttolohn", elsterMap);
        if (st.einkuenfte.freelance !== undefined)
            html += this.row("Einkuenfte aus selbstaendiger Arbeit / Gewerbe", st.einkuenfte.freelance, "einnahmen_selbst", elsterMap);
        if (st.einkuenfte.rental !== undefined)
            html += this.row("Einkuenfte aus Vermietung und Verpachtung (§21)", st.einkuenfte.rental, "mieteinnahmen", elsterMap);
        html += this.row("Summe der Einkuenfte", s.sde, null, elsterMap, "total");
        if (s.altersentlastung > 0)
            html += this.row("Altersentlastungsbetrag (§24a)", -s.altersentlastung, null, elsterMap);
        html += this.row("Gesamtbetrag der Einkuenfte", s.gde, null, elsterMap);
        html += `</div>`;

        // Deductions
        html += `<div class="result-card"><h3>Abzuege</h3>`;
        html += this.row("Sonderausgaben (§10 EStG)", -s.sonderausgaben, null, elsterMap);
        if (s.agb_deductible > 0)
            html += this.row("Aussergewoehnliche Belastungen (§33)", -s.agb_deductible, null, elsterMap);
        html += this.row("Zu versteuerndes Einkommen", s.zve, null, elsterMap, "total");
        html += `</div>`;

        // Kinderfreibetrag
        if (st.kinderfreibetrag && st.kinderfreibetrag.kfb_total > 0) {
            html += `<div class="result-card"><h3>Kinderfreibetrag (§32 Abs.6)</h3>`;
            html += this.row("Kinderfreibetrag gesamt", st.kinderfreibetrag.kfb_total, "num_children", elsterMap);
            html += this.row("ESt-Ersparnis durch KFB", st.kinderfreibetrag.est_saving, null, elsterMap);
            html += this.row("Kindergeld erhalten", st.kinderfreibetrag.kindergeld_total, null, elsterMap);
            const method = st.kinderfreibetrag.use_kfb ? "Kinderfreibetrag (guenstiger)" : "Kindergeld (guenstiger)";
            html += `<div class="result-row"><span class="label">Ergebnis</span><span class="value">${method}</span></div>`;
            html += `</div>`;
        }

        // Tax calculation
        html += `<div class="result-card"><h3>Steuerberechnung</h3>`;
        html += this.row("Einkommensteuer (§32a)", s.einkommensteuer_brutto, null, elsterMap);
        if (s.gewst_anrechnung_35 > 0)
            html += this.row("GewSt-Anrechnung (§35)", -s.gewst_anrechnung_35, null, elsterMap);
        if (s.credits_35a > 0)
            html += this.row("Steuermaessigung (§35a)", -s.credits_35a, null, elsterMap);
        html += this.row("Einkommensteuer (festgesetzt)", s.einkommensteuer_final, null, elsterMap);
        html += this.row("Solidaritaetszuschlag", s.solidaritaetszuschlag, null, elsterMap);
        if (s.kirchensteuer > 0)
            html += this.row("Kirchensteuer", s.kirchensteuer, "kirchensteuer_paid", elsterMap);
        if (s.gewerbesteuer > 0)
            html += this.row("Gewerbesteuer", s.gewerbesteuer, null, elsterMap);
        if (s.abgeltungsteuer > 0) {
            html += this.row("Abgeltungsteuer (Kapital)", s.abgeltungsteuer, null, elsterMap);
            if (s.guenstigerpruefung)
                html += `<div class="result-row"><span class="label"><em>Guenstigerpruefung angewendet — Kapitalertraege zum Normaltarif versteuert</em></span></div>`;
        }
        html += this.row("Gesamte Steuerbelastung", s.total_tax, null, elsterMap, "total");
        html += `</div>`;

        // Withheld / Final
        html += `<div class="result-card"><h3>Vorauszahlungen / Einbehaltene Steuern</h3>`;
        html += this.row("Bereits einbehaltene Steuern", -s.total_withheld, null, elsterMap);
        if (s.kindergeld_offset > 0)
            html += this.row("Kindergeld-Verrechnung (KFB gewaehlt)", s.kindergeld_offset, null, elsterMap);
        html += this.row(isRefund ? "Erstattung" : "Nachzahlung", nachzahlung, null, elsterMap, "total");
        html += `</div>`;

        // Werbungskosten detail
        if (st.werbungskosten && st.werbungskosten.employment) {
            const wk = st.werbungskosten.employment;
            html += `<div class="result-card"><h3>Werbungskosten Detail (Anlage N)</h3>`;
            html += this.row("Entfernungspauschale", wk.entfernungspauschale, "entfernungspauschale", elsterMap);
            html += this.row("Homeoffice-Pauschale", wk.homeoffice, "homeoffice_pauschale", elsterMap);
            if (wk.other_wk > 0) html += this.row("Sonstige Werbungskosten", wk.other_wk, "other_wk", elsterMap);
            html += this.row("Summe (itemisiert)", wk.itemized_total, null, elsterMap);
            html += this.row("Pauschbetrag", wk.pauschbetrag, null, elsterMap);
            html += this.row("Angesetzt", wk.effective, null, elsterMap, "total");
            if (wk.used_pauschbetrag)
                html += `<div class="result-row"><span class="label"><em>Arbeitnehmer-Pauschbetrag angewendet (hoeher als Einzelnachweis)</em></span></div>`;
            html += `</div>`;
        }

        // Vorsorge detail
        if (st.vorsorge) {
            const v = st.vorsorge;
            html += `<div class="result-card"><h3>Vorsorgeaufwendungen Detail (§10)</h3>`;
            html += this.row("Altersvorsorge (abzugsfaehig)", v.altersvorsorge_deductible, "grv_beitraege", elsterMap);
            html += this.row("Basis-KV (abzugsfaehig)", v.kv_basis_deductible, "kv_basis", elsterMap);
            html += this.row("Pflegeversicherung", v.pv_deductible, "pv_beitraege", elsterMap);
            html += this.row("Sonstige Vorsorge (abzugsfaehig)", v.sonstige_deductible, "sonstige_vorsorge", elsterMap);
            html += this.row("Vorsorge gesamt", v.total, null, elsterMap, "total");
            html += `</div>`;
        }

        html += `<div class="btn-row">
            <button class="btn btn-secondary" data-action="restart">Neue Berechnung</button>
        </div>`;

        container.innerHTML = html;
    },
};
