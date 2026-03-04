/* PDF Export — generates pre-filled German tax form overview using jsPDF */
const PdfExport = {
    PRIMARY: [26, 86, 219],
    TEXT: [30, 41, 59],
    MUTED: [100, 116, 139],
    BG: [247, 248, 250],
    BORDER: [221, 225, 230],
    WHITE: [255, 255, 255],
    SUCCESS: [22, 163, 74],

    generate(payload, result, elsterMap) {
        try {
            if (!window.jspdf) { alert("PDF-Bibliothek wird geladen, bitte erneut versuchen."); return; }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const W = 210;
            const ML = 20, MR = 20;
            const CW = W - ML - MR;
            let y = 20;

            // --- Header ---
            doc.setFillColor(...this.PRIMARY);
            doc.rect(0, 0, W, 28, "F");
            doc.setTextColor(...this.WHITE);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Steuerhelfer 2025", ML, 13);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("Einkommensteuerberechnung - ELSTER-Ausfuellhilfe", ML, 20);
            const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
            doc.text("Erstellt am " + today, W - MR, 20, { align: "right" });
            y = 36;

            // --- Summary Banner ---
            const s = result.summary;
            const isRefund = s.nachzahlung < 0;
            const bannerColor = isRefund ? this.SUCCESS : [220, 38, 38];
            const bannerLabel = isRefund ? "Voraussichtliche Erstattung" : "Voraussichtliche Nachzahlung";
            const bannerAmount = this.fmtEur(Math.abs(s.nachzahlung));

            doc.setFillColor(...bannerColor);
            doc.rect(ML, y, CW, 18, "F");
            doc.setTextColor(...this.WHITE);
            doc.setFontSize(10);
            doc.text(bannerLabel, ML + CW / 2, y + 6, { align: "center" });
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(bannerAmount, ML + CW / 2, y + 14, { align: "center" });
            y += 24;

            // --- Personal Info ---
            y = this.sectionHeader(doc, "Persoenliche Angaben", ML, y, CW);
            const personal = payload.personal || {};
            y = this.infoRow(doc, "Veranlagungsart", personal.veranlagung === "splitting" ? "Zusammenveranlagung" : "Einzelveranlagung", ML, y, CW);
            y = this.infoRow(doc, "Bundesland", personal.bundesland || "-", ML, y, CW);
            y = this.infoRow(doc, "Geburtsjahr", String(personal.birth_year || "-"), ML, y, CW);
            y = this.infoRow(doc, "Kirchensteuerpflichtig", personal.kirchensteuerpflichtig ? "Ja" : "Nein", ML, y, CW);
            y += 4;

            // --- Tax Summary ---
            y = this.sectionHeader(doc, "Steuerberechnung Uebersicht", ML, y, CW);
            y = this.summaryRow(doc, "Summe der Einkuenfte", s.sde, ML, y, CW);
            y = this.summaryRow(doc, "Gesamtbetrag der Einkuenfte", s.gde, ML, y, CW);
            y = this.summaryRow(doc, "Zu versteuerndes Einkommen", s.zve, ML, y, CW);
            y = this.summaryRow(doc, "Einkommensteuer (festgesetzt)", s.einkommensteuer_final, ML, y, CW);
            y = this.summaryRow(doc, "Solidaritaetszuschlag", s.solidaritaetszuschlag || 0, ML, y, CW);
            if (s.kirchensteuer > 0)
                y = this.summaryRow(doc, "Kirchensteuer", s.kirchensteuer, ML, y, CW);
            y = this.summaryRow(doc, "Gesamte Steuerbelastung", s.total_tax, ML, y, CW, true);
            y = this.summaryRow(doc, "Bereits einbehalten", -s.total_withheld, ML, y, CW);
            y = this.summaryRow(doc, isRefund ? "Erstattung" : "Nachzahlung", s.nachzahlung, ML, y, CW, true);
            y += 6;

            // --- ELSTER Fields Table ---
            y = this.checkPage(doc, y, 30);
            y = this.sectionHeader(doc, "ELSTER-Ausfuellhilfe - Werte zum Eintragen", ML, y, CW);

            const fields = this.collectFields(payload, elsterMap);
            if (fields.length > 0) {
                const groups = {};
                fields.forEach(function (f) { if (!groups[f.form]) groups[f.form] = []; groups[f.form].push(f); });

                var formNames = Object.keys(groups);
                for (var fi = 0; fi < formNames.length; fi++) {
                    var form = formNames[fi];
                    var entries = groups[form];
                    y = this.checkPage(doc, y, 20);
                    // Form group header
                    doc.setFillColor(...this.PRIMARY);
                    doc.rect(ML, y, CW, 7, "F");
                    doc.setTextColor(...this.WHITE);
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(this.sanitize(form), ML + 4, y + 5);
                    y += 9;

                    // Table header
                    doc.setFillColor(...this.BG);
                    doc.rect(ML, y, CW, 6, "F");
                    doc.setTextColor(...this.MUTED);
                    doc.setFontSize(7);
                    doc.setFont("helvetica", "bold");
                    doc.text("ZEILE", ML + 3, y + 4);
                    doc.text("BESCHREIBUNG", ML + 22, y + 4);
                    doc.text("WERT", ML + CW - 5, y + 4, { align: "right" });
                    y += 7;

                    for (var ei = 0; ei < entries.length; ei++) {
                        var e = entries[ei];
                        y = this.checkPage(doc, y, 8);
                        if (ei % 2 === 0) {
                            doc.setFillColor(250, 251, 252);
                            doc.rect(ML, y - 1, CW, 7, "F");
                        }
                        doc.setTextColor(...this.PRIMARY);
                        doc.setFontSize(8);
                        doc.setFont("helvetica", "bold");
                        doc.text("Z. " + e.line, ML + 3, y + 4);
                        doc.setTextColor(...this.TEXT);
                        doc.setFont("helvetica", "normal");
                        doc.text(this.sanitize(e.hint), ML + 22, y + 4, { maxWidth: CW - 60 });
                        doc.setFont("helvetica", "bold");
                        doc.text(e.value, ML + CW - 5, y + 4, { align: "right" });
                        y += 7;
                    }
                    y += 4;
                }
            }

            // --- Footer ---
            y = this.checkPage(doc, y, 20);
            doc.setDrawColor(...this.BORDER);
            doc.line(ML, y, W - MR, y);
            y += 6;
            doc.setTextColor(...this.MUTED);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("Haftungsausschluss: Dieses Dokument dient ausschliesslich zu Informations- und Orientierungszwecken.", ML, y, { maxWidth: CW });
            y += 4;
            doc.text("Es stellt keine steuerliche, rechtliche oder finanzielle Beratung dar.", ML, y, { maxWidth: CW });

            doc.save("Steuerhelfer_2025_ELSTER.pdf");

        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("PDF-Fehler: " + err.message);
        }
    },

    sanitize(str) {
        // Replace German special chars for jsPDF default font compatibility
        return String(str)
            .replace(/ä/g, "ae").replace(/Ä/g, "Ae")
            .replace(/ö/g, "oe").replace(/Ö/g, "Oe")
            .replace(/ü/g, "ue").replace(/Ü/g, "Ue")
            .replace(/ß/g, "ss")
            .replace(/—/g, "-").replace(/–/g, "-");
    },

    fmtEur(val) {
        return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(val);
    },

    checkPage(doc, y, need) {
        if (y + need > 280) { doc.addPage(); return 20; }
        return y;
    },

    sectionHeader(doc, title, x, y, w) {
        doc.setFillColor(...this.BG);
        doc.rect(x, y, w, 8, "F");
        doc.setTextColor(...this.TEXT);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, x + 4, y + 5.5);
        return y + 11;
    },

    infoRow(doc, label, value, x, y, w) {
        doc.setTextColor(...this.MUTED);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + 4, y + 4);
        doc.setTextColor(...this.TEXT);
        doc.setFont("helvetica", "bold");
        doc.text(this.sanitize(String(value)), x + w - 5, y + 4, { align: "right" });
        doc.setDrawColor(...this.BORDER);
        doc.line(x, y + 6, x + w, y + 6);
        return y + 8;
    },

    summaryRow(doc, label, value, x, y, w, bold) {
        if (bold) {
            doc.setDrawColor(...this.TEXT);
            doc.line(x, y - 1, x + w, y - 1);
        }
        doc.setTextColor(...this.TEXT);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(label, x + 4, y + 4);
        var color = value < 0 ? this.SUCCESS : this.TEXT;
        doc.setTextColor(...color);
        doc.setFont("helvetica", "bold");
        doc.text(this.fmtEur(value), x + w - 5, y + 4, { align: "right" });
        doc.setDrawColor(...this.BORDER);
        doc.line(x, y + 6, x + w, y + 6);
        return y + 8;
    },

    collectFields(payload, elsterMap) {
        var fields = [];
        var self = this;
        function add(key, value) {
            var entry = elsterMap[key];
            if (!entry || value === undefined || value === null || value === 0 || value === "") return;
            fields.push({ key: key, form: entry.form, line: entry.line, hint: entry.hint || key, value: typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value) });
        }
        var emp = payload.employment || {};
        add("bruttolohn", emp.bruttolohn);
        add("lohnsteuer_einbehalten", emp.lohnsteuer_einbehalten);
        if (emp.soli_einbehalten) add("soli_einbehalten", emp.soli_einbehalten);
        if (emp.kist_einbehalten) add("kist_einbehalten", emp.kist_einbehalten);
        var cap = payload.capital || {};
        add("dividends", cap.dividends);
        add("interest", cap.interest);
        add("realized_gains", cap.realized_gains);
        add("already_withheld_kest", cap.already_withheld_kest);
        add("fund_distributions", cap.fund_distributions);
        add("vorabpauschale", cap.vorabpauschale);
        add("fund_sale_gains", cap.fund_sale_gains);
        var frl = payload.freelance || {};
        add("einnahmen_selbst", frl.einnahmen);
        add("betriebsausgaben", frl.betriebsausgaben);
        var rent = payload.rental || {};
        add("mieteinnahmen", rent.mieteinnahmen);
        add("schuldzinsen", rent.schuldzinsen);
        add("afa", rent.afa);
        add("grundsteuer", rent.grundsteuer);
        var ded = payload.deductions || {};
        add("grv_beitraege", ded.grv_beitraege);
        add("ruerup_beitraege", ded.ruerup_beitraege);
        add("kv_basis", ded.kv_basis);
        add("pv_beitraege", ded.pv_beitraege);
        add("sonstige_vorsorge", ded.sonstige_vorsorge);
        add("kirchensteuer_paid", ded.kirchensteuer_paid);
        add("spenden", ded.spenden);
        add("handwerkerleistungen", ded.handwerkerleistungen);
        add("haushaltsnahe_dl", ded.haushaltsnahe_dl);
        var kids = payload.children || {};
        add("num_children", kids.num_children);
        return fields;
    }
};
