const Results = {
    fmt(val) {
        return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(val);
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

    render(result, elsterMap, payload) {
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
        html += `<div class="result-card"><h3>Einkünfte</h3>`;
        if (st.einkuenfte.employment !== undefined)
            html += this.row("Einkünfte aus nichtselbständiger Arbeit (§19)", st.einkuenfte.employment, "bruttolohn", elsterMap);
        if (st.einkuenfte.freelance !== undefined)
            html += this.row("Einkünfte aus selbständiger Arbeit / Gewerbe", st.einkuenfte.freelance, "einnahmen_selbst", elsterMap);
        if (st.einkuenfte.rental !== undefined)
            html += this.row("Einkünfte aus Vermietung und Verpachtung (§21)", st.einkuenfte.rental, "mieteinnahmen", elsterMap);
        html += this.row("Summe der Einkünfte", s.sde, null, elsterMap, "total");
        if (s.altersentlastung > 0)
            html += this.row("Altersentlastungsbetrag (§24a)", -s.altersentlastung, null, elsterMap);
        html += this.row("Gesamtbetrag der Einkünfte", s.gde, null, elsterMap);
        html += `</div>`;

        // Deductions
        html += `<div class="result-card"><h3>Abzüge</h3>`;
        html += this.row("Sonderausgaben (§10 EStG)", -s.sonderausgaben, null, elsterMap);
        if (s.agb_deductible > 0)
            html += this.row("Außergewöhnliche Belastungen (§33)", -s.agb_deductible, null, elsterMap);
        html += this.row("Zu versteuerndes Einkommen", s.zve, null, elsterMap, "total");
        html += `</div>`;

        // Kinderfreibetrag
        if (st.kinderfreibetrag && st.kinderfreibetrag.kfb_total > 0) {
            html += `<div class="result-card"><h3>Kinderfreibetrag (§32 Abs.6)</h3>`;
            html += this.row("Kinderfreibetrag gesamt", st.kinderfreibetrag.kfb_total, "num_children", elsterMap);
            html += this.row("ESt-Ersparnis durch KFB", st.kinderfreibetrag.est_saving, null, elsterMap);
            html += this.row("Kindergeld erhalten", st.kinderfreibetrag.kindergeld_total, null, elsterMap);
            const method = st.kinderfreibetrag.use_kfb ? "Kinderfreibetrag (günstiger)" : "Kindergeld (günstiger)";
            html += `<div class="result-row"><span class="label">Ergebnis</span><span class="value">${method}</span></div>`;
            html += `</div>`;
        }

        // Tax calculation
        html += `<div class="result-card"><h3>Steuerberechnung</h3>`;
        html += this.row("Einkommensteuer (§32a)", s.einkommensteuer_brutto, null, elsterMap);
        if (s.gewst_anrechnung_35 > 0)
            html += this.row("GewSt-Anrechnung (§35)", -s.gewst_anrechnung_35, null, elsterMap);
        if (s.credits_35a > 0)
            html += this.row("Steuermäßigung (§35a)", -s.credits_35a, null, elsterMap);
        html += this.row("Einkommensteuer (festgesetzt)", s.einkommensteuer_final, null, elsterMap);
        html += this.row("Solidaritätszuschlag", s.solidaritätszuschlag, null, elsterMap);
        if (s.kirchensteuer > 0)
            html += this.row("Kirchensteuer", s.kirchensteuer, "kirchensteuer_paid", elsterMap);
        if (s.gewerbesteuer > 0)
            html += this.row("Gewerbesteuer", s.gewerbesteuer, null, elsterMap);
        if (s.abgeltungsteuer > 0) {
            html += this.row("Abgeltungsteuer (Kapital)", s.abgeltungsteuer, null, elsterMap);
            if (s.günstigerpruefung)
                html += `<div class="result-row"><span class="label"><em>Günstigerprüfung angewendet — Kapitalerträge zum Normaltarif versteuert</em></span></div>`;
        }
        html += this.row("Gesamte Steuerbelastung", s.total_tax, null, elsterMap, "total");
        html += `</div>`;

        // Withheld / Final
        html += `<div class="result-card"><h3>Vorauszahlungen / Einbehaltene Steuern</h3>`;
        html += this.row("Bereits einbehaltene Steuern", -s.total_withheld, null, elsterMap);
        if (s.kindergeld_offset > 0)
            html += this.row("Kindergeld-Verrechnung (KFB gewählt)", s.kindergeld_offset, null, elsterMap);
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
                html += `<div class="result-row"><span class="label"><em>Arbeitnehmer-Pauschbetrag angewendet (höher als Einzelnachweis)</em></span></div>`;
            html += `</div>`;
        }

        // Vorsorge detail
        if (st.vorsorge) {
            const v = st.vorsorge;
            html += `<div class="result-card"><h3>Vorsorgeaufwendungen Detail (§10)</h3>`;
            html += this.row("Altersvorsorge (abzugsfähig)", v.altersvorsorge_deductible, "grv_beitraege", elsterMap);
            html += this.row("Basis-KV (abzugsfähig)", v.kv_basis_deductible, "kv_basis", elsterMap);
            html += this.row("Pflegeversicherung", v.pv_deductible, "pv_beitraege", elsterMap);
            html += this.row("Sonstige Vorsorge (abzugsfähig)", v.sonstige_deductible, "sonstige_vorsorge", elsterMap);
            html += this.row("Vorsorge gesamt", v.total, null, elsterMap, "total");
            html += `</div>`;
        }

        // ELSTER Copy Table
        if (payload) {
            html += this.renderElsterTable(payload, elsterMap);
        }

        html += `<div class="btn-row">
            <button class="btn btn-secondary" data-action="restart">Neue Berechnung</button>
        </div>`;

        container.innerHTML = html;

        // Attach copy button handlers
        container.querySelectorAll(".elster-copy-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const val = btn.getAttribute("data-value");
                navigator.clipboard.writeText(val).then(() => {
                    const orig = btn.textContent;
                    btn.textContent = "✓";
                    btn.classList.add("copied");
                    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1200);
                });
            });
        });
    },

    renderElsterTable(payload, elsterMap) {
        // Collect all fields with their values from the payload
        const fields = [];
        const add = (key, value) => {
            const entry = elsterMap[key];
            if (!entry || value === undefined || value === null || value === 0 || value === "") return;
            fields.push({ key, form: entry.form, line: entry.line, hint: entry.hint || key, value: typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value) });
        };

        // Employment
        const emp = payload.employment || {};
        add("bruttolohn", emp.bruttolohn);
        add("lohnsteuer_einbehalten", emp.lohnsteuer_einbehalten);
        if (emp.soli_einbehalten) add("soli_einbehalten", emp.soli_einbehalten);
        if (emp.kist_einbehalten) add("kist_einbehalten", emp.kist_einbehalten);

        // Capital
        const cap = payload.capital || {};
        add("dividends", cap.dividends);
        add("interest", cap.interest);
        add("realized_gains", cap.realized_gains);
        add("already_withheld_kest", cap.already_withheld_kest);
        add("fund_distributions", cap.fund_distributions);
        add("vorabpauschale", cap.vorabpauschale);
        add("fund_sale_gains", cap.fund_sale_gains);

        // Freelance
        const frl = payload.freelance || {};
        add("einnahmen_selbst", frl.einnahmen);
        add("betriebsausgaben", frl.betriebsausgaben);

        // Rental
        const rent = payload.rental || {};
        add("mieteinnahmen", rent.mieteinnahmen);
        add("schuldzinsen", rent.schuldzinsen);
        add("afa", rent.afa);
        add("grundsteuer", rent.grundsteuer);

        // Vorsorge
        const ded = payload.deductions || {};
        add("grv_beitraege", ded.grv_beitraege);
        add("ruerup_beitraege", ded.ruerup_beitraege);
        add("kv_basis", ded.kv_basis);
        add("pv_beitraege", ded.pv_beitraege);
        add("sonstige_vorsorge", ded.sonstige_vorsorge);

        // Sonderausgaben
        add("kirchensteuer_paid", ded.kirchensteuer_paid);
        add("spenden", ded.spenden);
        add("handwerkerleistungen", ded.handwerkerleistungen);
        add("haushaltsnahe_dl", ded.haushaltsnahe_dl);

        // Children
        const kids = payload.children || {};
        add("num_children", kids.num_children);

        if (fields.length === 0) return "";

        // Group by form
        const groups = {};
        fields.forEach(f => {
            if (!groups[f.form]) groups[f.form] = [];
            groups[f.form].push(f);
        });

        let html = `
        <div class="result-card elster-guide">
            <h3>📋 ELSTER-Ausfüllhilfe</h3>
            <p class="elster-guide-desc">Übertragen Sie diese Werte in Ihr ELSTER-Formular. Klicken Sie auf <strong>Kopieren</strong>, um den Wert in die Zwischenablage zu kopieren.</p>`;

        for (const [form, entries] of Object.entries(groups)) {
            html += `<div class="elster-form-group">
                <div class="elster-form-header">${form}</div>
                <table class="elster-table">
                    <thead><tr><th>Zeile</th><th>Beschreibung</th><th>Wert</th><th></th></tr></thead>
                    <tbody>`;
            entries.forEach(e => {
                html += `<tr>
                    <td class="elster-line">Z. ${e.line}</td>
                    <td class="elster-desc">${e.hint}</td>
                    <td class="elster-val">${e.value}</td>
                    <td><button class="elster-copy-btn" data-value="${e.value}" title="Wert kopieren">Kopieren</button></td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }

        html += `</div>`;
        return html;
    },
};
