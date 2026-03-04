/**
 * German Tax Calculator 2025 — full statutory calculation in the browser.
 * Ported from Python tax_engine/.
 */

// ===========================================================================
// CONFIG — all 2025 tax constants (single source of truth)
// ===========================================================================
const CONFIG = {
    TAX_YEAR: 2025,

    // §32a EStG
    GRUNDFREIBETRAG: 12096,
    ZONE2_UPPER: 17443,
    ZONE3_UPPER: 68480,
    ZONE4_UPPER: 277826,
    ZONE2_A: 932.30, ZONE2_B: 1400,
    ZONE3_A: 176.64, ZONE3_B: 2397, ZONE3_C: 1015.13,
    ZONE4_RATE: 0.42, ZONE4_SUBTRACT: 10911.92,
    ZONE5_RATE: 0.45, ZONE5_SUBTRACT: 19246.67,

    // Soli
    SOLI_RATE: 0.055,
    SOLI_FREIGRENZE_SINGLE: 19950,
    SOLI_FREIGRENZE_JOINT: 39900,
    SOLI_MILDERUNG_RATE: 0.119,

    // Kirchensteuer
    KIRCHENSTEUER_RATE: {
        "Baden-Wuerttemberg": 0.08, "Bayern": 0.08,
        "Berlin": 0.09, "Brandenburg": 0.09, "Bremen": 0.09, "Hamburg": 0.09,
        "Hessen": 0.09, "Mecklenburg-Vorpommern": 0.09, "Niedersachsen": 0.09,
        "Nordrhein-Westfalen": 0.09, "Rheinland-Pfalz": 0.09, "Saarland": 0.09,
        "Sachsen": 0.09, "Sachsen-Anhalt": 0.09, "Schleswig-Holstein": 0.09,
        "Thueringen": 0.09,
    },

    // Abgeltungsteuer
    ABGELTUNG_RATE: 0.25,
    SPARERPAUSCHBETRAG_SINGLE: 1000,
    SPARERPAUSCHBETRAG_JOINT: 2000,
    TEILFREISTELLUNG: {
        aktienfonds: 0.30, mischfonds: 0.15, immobilienfonds: 0.60,
        auslands_immobilienfonds: 0.80, sonstige: 0.00,
    },

    // Werbungskosten
    WK_PAUSCHBETRAG: 1230,
    HOMEOFFICE_DAILY: 6.0,
    HOMEOFFICE_MAX_DAYS: 210,
    PENDLER_RATE_FIRST_20: 0.30,
    PENDLER_RATE_FROM_21: 0.38,
    PENDLER_CAP_NO_CAR: 4500,

    // GewSt
    GEWST_FREIBETRAG: 24500,
    GEWST_MESSZAHL: 0.035,
    GEWST_ANRECHNUNG_FAKTOR: 4.0,

    // Vorsorge
    ALTERSVORSORGE_MAX_SINGLE: 29344,
    ALTERSVORSORGE_MAX_JOINT: 58688,
    KV_KRANKENGELD_ABZUG: 0.04,
    SONSTIGE_VORSORGE_CAP_EMPLOYEE: 1900,
    SONSTIGE_VORSORGE_CAP_SELF_EMPLOYED: 2800,
    SONDERAUSGABEN_PAUSCHBETRAG_SINGLE: 36,
    SONDERAUSGABEN_PAUSCHBETRAG_JOINT: 72,
    SPENDEN_GDE_CAP: 0.20,

    // Kinderfreibetrag
    KINDERFREIBETRAG_TOTAL_PER_CHILD: 9600,
    KINDERGELD_ANNUAL_PER_CHILD: 3060,

    // Altersentlastung
    ALTERSENTLASTUNG: {
        2020: [0.160, 760], 2021: [0.152, 722], 2022: [0.144, 684],
        2023: [0.136, 646], 2024: [0.128, 608], 2025: [0.120, 570],
        2026: [0.112, 532], 2027: [0.104, 494], 2028: [0.096, 456],
        2029: [0.088, 418], 2030: [0.080, 380],
    },

    // Zumutbare Belastung
    ZUMUTBARE_BELASTUNG_TIERS: [
        [15340, 0.05, 0.04, 0.02, 0.01],
        [51130, 0.06, 0.05, 0.03, 0.01],
        [null, 0.07, 0.06, 0.04, 0.02],
    ],

    // §35a
    HANDWERKER_CREDIT_RATE: 0.20,
    HANDWERKER_CREDIT_MAX: 1200,
    HAUSHALTSNAHE_CREDIT_RATE: 0.20,
    HAUSHALTSNAHE_CREDIT_MAX: 4000,
};

// ===========================================================================
// §32a EStG — Einkommensteuer
// ===========================================================================
function grundtarif(zve) {
    zve = Math.floor(zve);
    if (zve <= CONFIG.GRUNDFREIBETRAG) return 0;
    if (zve <= CONFIG.ZONE2_UPPER) {
        const y = (zve - CONFIG.GRUNDFREIBETRAG) / 10000;
        return Math.floor((CONFIG.ZONE2_A * y + CONFIG.ZONE2_B) * y);
    }
    if (zve <= CONFIG.ZONE3_UPPER) {
        const z = (zve - CONFIG.ZONE2_UPPER) / 10000;
        return Math.floor((CONFIG.ZONE3_A * z + CONFIG.ZONE3_B) * z + CONFIG.ZONE3_C);
    }
    if (zve <= CONFIG.ZONE4_UPPER) {
        return Math.floor(CONFIG.ZONE4_RATE * zve - CONFIG.ZONE4_SUBTRACT);
    }
    return Math.floor(CONFIG.ZONE5_RATE * zve - CONFIG.ZONE5_SUBTRACT);
}

function computeIncomeTax(zve, filingStatus) {
    if (filingStatus === "joint") {
        return grundtarif(zve / 2) * 2;
    }
    return grundtarif(zve);
}

// ===========================================================================
// Solidaritaetszuschlag
// ===========================================================================
function computeSoli(est, filingStatus) {
    const freigrenze = filingStatus === "joint" ? CONFIG.SOLI_FREIGRENZE_JOINT : CONFIG.SOLI_FREIGRENZE_SINGLE;
    if (est <= freigrenze) return 0;
    const full = est * CONFIG.SOLI_RATE;
    const milderung = (est - freigrenze) * CONFIG.SOLI_MILDERUNG_RATE;
    return round2(Math.min(full, milderung));
}

// ===========================================================================
// Kirchensteuer
// ===========================================================================
function getChurchRate(bundesland) {
    return CONFIG.KIRCHENSTEUER_RATE[bundesland] || 0.09;
}

function computeChurchTax(est, bundesland, churchMember) {
    if (!churchMember) return 0;
    return round2(est * getChurchRate(bundesland));
}

// ===========================================================================
// Werbungskosten / Deductions
// ===========================================================================
function computeEntfernungspauschale(km, days, ownCar) {
    const first20 = Math.min(km, 20) * CONFIG.PENDLER_RATE_FIRST_20 * days;
    const rest = Math.max(0, km - 20) * CONFIG.PENDLER_RATE_FROM_21 * days;
    let total = first20 + rest;
    if (!ownCar) total = Math.min(total, CONFIG.PENDLER_CAP_NO_CAR);
    return round2(total);
}

function computeHomeoffice(days) {
    return round2(Math.min(days, CONFIG.HOMEOFFICE_MAX_DAYS) * CONFIG.HOMEOFFICE_DAILY);
}

function computeWerbungskosten(p) {
    let pendler = computeEntfernungspauschale(p.one_way_km || 0, p.commuting_days || 0, p.uses_own_car !== false);
    pendler = Math.max(pendler, p.public_transport_annual || 0);
    const homeoffice = computeHomeoffice(p.homeoffice_days || 0);
    const otherWk = p.other_wk || 0;
    const itemized = round2(pendler + homeoffice + otherWk);
    const effective = round2(Math.max(itemized, CONFIG.WK_PAUSCHBETRAG));
    return {
        entfernungspauschale: pendler,
        homeoffice: homeoffice,
        other_wk: otherWk,
        itemized_total: itemized,
        pauschbetrag: CONFIG.WK_PAUSCHBETRAG,
        effective: effective,
        used_pauschbetrag: itemized < CONFIG.WK_PAUSCHBETRAG,
    };
}

// ===========================================================================
// Vorsorgeaufwendungen (§10 EStG)
// ===========================================================================
function computeVorsorge(p, filingStatus) {
    const avMax = filingStatus === "joint" ? CONFIG.ALTERSVORSORGE_MAX_JOINT : CONFIG.ALTERSVORSORGE_MAX_SINGLE;
    const avPaid = (p.grv_beitraege || 0) + (p.ruerup_beitraege || 0);
    const avDeductible = Math.min(avPaid, avMax);

    const kvBasis = p.is_gkv !== false
        ? (p.kv_basis || 0) * (1 - CONFIG.KV_KRANKENGELD_ABZUG)
        : (p.kv_basis || 0);
    const basisKvPv = kvBasis + (p.pv_beitraege || 0);

    const cap = p.is_self_employed ? CONFIG.SONSTIGE_VORSORGE_CAP_SELF_EMPLOYED : CONFIG.SONSTIGE_VORSORGE_CAP_EMPLOYEE;
    const remainingCap = Math.max(0, cap - basisKvPv);
    const sonstigeDeductible = Math.min(p.sonstige_vorsorge || 0, remainingCap);

    const total = round2(avDeductible + basisKvPv + sonstigeDeductible);
    return {
        altersvorsorge_paid: avPaid,
        altersvorsorge_deductible: round2(avDeductible),
        kv_basis_deductible: round2(kvBasis),
        pv_deductible: round2(p.pv_beitraege || 0),
        basis_kv_pv_total: round2(basisKvPv),
        sonstige_cap: cap,
        sonstige_deductible: round2(sonstigeDeductible),
        total: total,
    };
}

function computeSonderausgaben(vorsorgeTotal, kirchensteuerPaid, spenden, gde, filingStatus) {
    const spendenCap = gde * CONFIG.SPENDEN_GDE_CAP;
    const spendenDeductible = Math.min(spenden, spendenCap);
    const itemized = vorsorgeTotal + kirchensteuerPaid + spendenDeductible;
    const pausch = filingStatus === "joint" ? CONFIG.SONDERAUSGABEN_PAUSCHBETRAG_JOINT : CONFIG.SONDERAUSGABEN_PAUSCHBETRAG_SINGLE;
    const effective = Math.max(itemized, pausch);
    return {
        vorsorge: round2(vorsorgeTotal),
        kirchensteuer_paid: round2(kirchensteuerPaid),
        spenden_claimed: round2(spenden),
        spenden_deductible: round2(spendenDeductible),
        spenden_cap_20pct_gde: round2(spendenCap),
        itemized_total: round2(itemized),
        pauschbetrag: pausch,
        effective: round2(effective),
    };
}

// ===========================================================================
// Kinderfreibetrag (§32 Abs.6 + §51a Massstabsteuer)
// ===========================================================================
function computeKinderfreibetrag(zveWithoutKfb, numChildren, kindergeldReceived, filingStatus) {
    if (numChildren <= 0) {
        return {
            use_kfb: false, kfb_total: 0, zve_for_est: zveWithoutKfb,
            massstabsteuer_zve: zveWithoutKfb, est_saving: 0, kindergeld_total: 0,
        };
    }
    const kfbTotal = numChildren * CONFIG.KINDERFREIBETRAG_TOTAL_PER_CHILD;
    const zveWithKfb = Math.max(0, zveWithoutKfb - kfbTotal);
    const estWithout = computeIncomeTax(zveWithoutKfb, filingStatus);
    const estWith = computeIncomeTax(zveWithKfb, filingStatus);
    const estSaving = estWithout - estWith;
    const useKfb = estSaving > kindergeldReceived;
    return {
        use_kfb: useKfb,
        kfb_total: kfbTotal,
        zve_for_est: useKfb ? zveWithKfb : zveWithoutKfb,
        massstabsteuer_zve: zveWithKfb,
        est_saving: estSaving,
        kindergeld_total: kindergeldReceived,
    };
}

// ===========================================================================
// Capital Gains (§32d + InvStG §§16-20)
// ===========================================================================
function computeTaxableCapitalIncome(p, filingStatus) {
    const tfRate = CONFIG.TEILFREISTELLUNG[p.fund_type] || 0;
    const directIncome = (p.dividends || 0) + (p.interest || 0) + (p.realized_gains || 0);
    const fundGross = (p.fund_distributions || 0) + (p.fund_sale_gains || 0) + (p.vorabpauschale || 0);
    const fundTaxfree = fundGross * tfRate;
    const fundTaxable = fundGross - fundTaxfree;
    const grossTaxable = directIncome + fundTaxable;
    const spb = filingStatus === "joint" ? CONFIG.SPARERPAUSCHBETRAG_JOINT : CONFIG.SPARERPAUSCHBETRAG_SINGLE;
    const taxable = Math.max(0, grossTaxable - spb);
    return {
        direct_income: round2(directIncome),
        fund_gross: round2(fundGross),
        teilfreistellung_rate: tfRate,
        fund_taxfree: round2(fundTaxfree),
        fund_taxable: round2(fundTaxable),
        gross_taxable_before_spb: round2(grossTaxable),
        sparerpauschbetrag: spb,
        taxable_capital_income: round2(taxable),
    };
}

function computeAbgeltungsteuer(taxableCapital, bundesland, churchMember, withheldKest, withheldSoli, withheldKist) {
    if (taxableCapital <= 0) {
        const alreadyTotal = round2((withheldKest || 0) + (withheldSoli || 0) + (withheldKist || 0));
        return {
            abgeltungsteuer: 0, soli_on_capital: 0, kist_on_capital: 0,
            total_capital_tax: 0, already_withheld: alreadyTotal,
            nachzahlung_capital: round2(-alreadyTotal),
        };
    }
    const kistRate = churchMember ? getChurchRate(bundesland) : 0;
    const effectiveRate = kistRate > 0
        ? CONFIG.ABGELTUNG_RATE / (1 + CONFIG.ABGELTUNG_RATE * kistRate)
        : CONFIG.ABGELTUNG_RATE;
    const abgst = taxableCapital * effectiveRate;
    const soli = abgst * CONFIG.SOLI_RATE;
    const kist = abgst * kistRate;
    const total = abgst + soli + kist;
    const alreadyTotal = (withheldKest || 0) + (withheldSoli || 0) + (withheldKist || 0);
    return {
        effective_abgst_rate: effectiveRate,
        abgeltungsteuer: round2(abgst),
        soli_on_capital: round2(soli),
        kist_on_capital: round2(kist),
        total_capital_tax: round2(total),
        already_withheld: round2(alreadyTotal),
        nachzahlung_capital: round2(total - alreadyTotal),
    };
}

// ===========================================================================
// Gewerbesteuer (GewStG §§7, 11, 16 + §35 EStG)
// ===========================================================================
function computeGewerbesteuer(gewinn, hebesatz, isFreiberufler) {
    if (isFreiberufler || gewinn <= 0) {
        return {
            gewerbeertrag: 0, freibetrag: CONFIG.GEWST_FREIBETRAG, stpfl_gewerbeertrag: 0,
            messbetrag: 0, gewerbesteuer: 0, anrechnung_35: 0, is_freiberufler: isFreiberufler,
        };
    }
    const gewerbeertrag = Math.floor(gewinn / 100) * 100;
    const stpfl = Math.max(0, gewerbeertrag - CONFIG.GEWST_FREIBETRAG);
    const messbetrag = stpfl * CONFIG.GEWST_MESSZAHL;
    const gewst = messbetrag * ((hebesatz || 400) / 100);
    const anrechnung = Math.min(CONFIG.GEWST_ANRECHNUNG_FAKTOR * messbetrag, gewst);
    return {
        gewerbeertrag, freibetrag: CONFIG.GEWST_FREIBETRAG, stpfl_gewerbeertrag: stpfl,
        messbetrag: round2(messbetrag), hebesatz: hebesatz || 400,
        gewerbesteuer: round2(gewst), anrechnung_35: round2(anrechnung),
        is_freiberufler: isFreiberufler,
    };
}

// ===========================================================================
// Altersentlastungsbetrag (§24a EStG)
// ===========================================================================
function computeAltersentlastung(birthYear, positiveIncome) {
    const ageAtStart = CONFIG.TAX_YEAR - 1 - birthYear;
    if (ageAtStart < 64) return 0;
    const yearTurned64 = birthYear + 64;
    const entry = CONFIG.ALTERSENTLASTUNG[yearTurned64];
    if (!entry) return 0;
    const [pct, cap] = entry;
    return Math.min(positiveIncome * pct, cap);
}

// ===========================================================================
// Zumutbare Belastung (§33 EStG)
// ===========================================================================
function computeZumutbareBelastung(gde, filingStatus, numChildren) {
    let col;
    if (filingStatus === "single") {
        col = numChildren === 0 ? 1 : (numChildren <= 2 ? 3 : 4);
    } else {
        col = numChildren === 0 ? 2 : (numChildren <= 2 ? 3 : 4);
    }
    let total = 0, prev = 0;
    for (const tier of CONFIG.ZUMUTBARE_BELASTUNG_TIERS) {
        const upper = tier[0];
        const rate = tier[col];
        const inTier = upper === null ? Math.max(0, gde - prev) : Math.max(0, Math.min(gde, upper) - prev);
        total += inTier * rate;
        prev = upper || prev;
    }
    return round2(total);
}

// ===========================================================================
// ORCHESTRATOR — full 16-step statutory chain
// ===========================================================================
function calculateFullTax(payload) {
    const fs = payload.filing_status || "single";
    const bundesland = payload.bundesland || "Berlin";
    const church = payload.church_member || false;
    const birthYear = payload.birth_year || 1990;
    const categories = payload.income_categories || [];
    const emp = payload.employment || {};
    const cap = payload.capital || {};
    const frl = payload.freelance || {};
    const rent = payload.rental || {};
    const kids = payload.children || {};
    const ded = payload.deductions || {};

    const result = { steps: {} };

    // Step 1: Werbungskosten + Einkuenfte per category
    const wkDetail = {};
    const einkuenfte = {};
    let isFreiberufler = false;

    if (categories.includes("employment")) {
        const wk = computeWerbungskosten(emp);
        wkDetail.employment = wk;
        einkuenfte.employment = round2((emp.bruttolohn || 0) - wk.effective);
    }

    if (categories.includes("freelance")) {
        isFreiberufler = (frl.business_type || "freiberufler") === "freiberufler";
        einkuenfte.freelance = round2((frl.einnahmen || 0) - (frl.betriebsausgaben || 0));
    }

    if (categories.includes("rental")) {
        const miete = (rent.mieteinnahmen || 0) + (rent.nebenkosten_umlagen || 0);
        const wkRental = (rent.schuldzinsen || 0) + (rent.afa || 0) + (rent.sonstige_wk || 0) + (rent.grundsteuer || 0);
        einkuenfte.rental = round2(miete - wkRental);
    }

    result.steps.einkuenfte = einkuenfte;
    result.steps.werbungskosten = wkDetail;

    // Step 2-3: Summe der Einkuenfte
    let sde = 0;
    for (const v of Object.values(einkuenfte)) sde += v;

    // Step 4: Altersentlastungsbetrag
    const altersentlastung = computeAltersentlastung(birthYear, Math.max(0, sde));
    result.steps.altersentlastung = round2(altersentlastung);

    // Step 5: GdE
    const gde = sde - altersentlastung;
    result.steps.sde = round2(sde);
    result.steps.gde = round2(gde);

    // Step 6: Sonderausgaben
    const isSelfEmp = categories.includes("freelance");
    const vorsorge = computeVorsorge({
        grv_beitraege: ded.grv_beitraege, ruerup_beitraege: ded.ruerup_beitraege,
        kv_basis: ded.kv_basis, pv_beitraege: ded.pv_beitraege,
        sonstige_vorsorge: ded.sonstige_vorsorge, is_gkv: ded.is_gkv,
        is_self_employed: isSelfEmp,
    }, fs);
    const sonderausgaben = computeSonderausgaben(
        vorsorge.total, ded.kirchensteuer_paid || 0, ded.spenden || 0, gde, fs
    );
    result.steps.vorsorge = vorsorge;
    result.steps.sonderausgaben = sonderausgaben;

    // Step 7: Aussergewoehnliche Belastungen
    const numChildren = kids.num_children || 0;
    const agbClaimed = ded.aussergewoehnliche_belastungen || 0;
    const zumutbar = computeZumutbareBelastung(gde, fs, numChildren);
    const agbDeductible = Math.max(0, agbClaimed - zumutbar);
    result.steps.agb = { claimed: agbClaimed, zumutbare_belastung: zumutbar, deductible: round2(agbDeductible) };

    // Step 8: zvE before Kinderfreibetrag
    const zveBeforeKfb = Math.max(0, gde - sonderausgaben.effective - agbDeductible);

    // Kinderfreibetrag
    let kindergeldReceived = kids.kindergeld_received || 0;
    if (kindergeldReceived === 0 && numChildren > 0) {
        kindergeldReceived = numChildren * CONFIG.KINDERGELD_ANNUAL_PER_CHILD;
    }
    const kfbResult = computeKinderfreibetrag(zveBeforeKfb, numChildren, kindergeldReceived, fs);
    result.steps.kinderfreibetrag = kfbResult;

    const zveForEst = kfbResult.zve_for_est;
    const massstabZve = kfbResult.massstabsteuer_zve;
    result.steps.zve = round2(zveForEst);
    result.steps.zve_before_kfb = round2(zveBeforeKfb);

    // Step 9: ESt
    let est = computeIncomeTax(zveForEst, fs);

    // Step 10: GewSt + §35
    let gewstResult = { gewerbesteuer: 0, anrechnung_35: 0 };
    if (categories.includes("freelance")) {
        gewstResult = computeGewerbesteuer(
            einkuenfte.freelance || 0, frl.hebesatz || 400, isFreiberufler
        );
    }
    let anrechnung35 = Math.min(gewstResult.anrechnung_35, est);
    let estAfter35 = est - anrechnung35;
    result.steps.gewerbesteuer = gewstResult;

    // Step 11: Massstabsteuer
    let massstabEst = computeIncomeTax(massstabZve, fs);
    let massstabEstAfter35 = massstabEst - Math.min(gewstResult.anrechnung_35, massstabEst);
    result.steps.massstabsteuer = massstabEstAfter35;

    // Step 12-13: Soli + KiSt on Massstabsteuer
    let soli = computeSoli(massstabEstAfter35, fs);
    let kist = computeChurchTax(massstabEstAfter35, bundesland, church);

    // Step 14: Capital — Guenstigerpruefung
    let capitalResult = { taxable_capital_income: 0, total_capital_tax: 0, nachzahlung_capital: 0 };
    let guenstigerpruefungUsed = false;

    if (categories.includes("capital")) {
        const capIncome = computeTaxableCapitalIncome(cap, fs);
        const taxableCap = capIncome.taxable_capital_income;

        // Path A: flat Abgeltungsteuer
        const abgstResult = computeAbgeltungsteuer(
            taxableCap, bundesland, church,
            cap.already_withheld_kest, cap.already_withheld_soli, cap.already_withheld_kist
        );

        // Path B: progressive
        const zveWithCap = zveForEst + taxableCap;
        const estWithCap = computeIncomeTax(zveWithCap, fs);
        const marginalTaxOnCap = estWithCap - est;
        const massstabWithCap = computeIncomeTax(massstabZve + taxableCap, fs);
        const massstabWithCap35 = massstabWithCap - Math.min(gewstResult.anrechnung_35, massstabWithCap);
        const soliB = computeSoli(massstabWithCap35, fs);
        const kistB = computeChurchTax(massstabWithCap35, bundesland, church);
        const progressiveTotal = marginalTaxOnCap + (soliB - soli) + (kistB - kist);

        if (progressiveTotal < abgstResult.total_capital_tax && taxableCap > 0) {
            guenstigerpruefungUsed = true;
            est = estWithCap;
            estAfter35 = est - anrechnung35;
            massstabEstAfter35 = massstabWithCap35;
            soli = soliB;
            kist = kistB;
            const withheld = (cap.already_withheld_kest || 0) + (cap.already_withheld_soli || 0) + (cap.already_withheld_kist || 0);
            capitalResult = {
                ...capIncome, method: "guenstigerpruefung",
                progressive_tax: round2(progressiveTotal),
                abgeltung_would_be: abgstResult.total_capital_tax,
                already_withheld: round2(withheld),
                total_capital_tax: 0, nachzahlung_capital: 0,
            };
        } else {
            capitalResult = { ...capIncome, ...abgstResult, method: "abgeltungsteuer" };
        }
    }

    result.steps.capital = capitalResult;
    result.steps.guenstigerpruefung = guenstigerpruefungUsed;

    // Step 15: §35a credits
    const handwerkerCredit = Math.min((ded.handwerkerleistungen || 0) * CONFIG.HANDWERKER_CREDIT_RATE, CONFIG.HANDWERKER_CREDIT_MAX);
    const haushaltsnaheCredit = Math.min((ded.haushaltsnahe_dl || 0) * CONFIG.HAUSHALTSNAHE_CREDIT_RATE, CONFIG.HAUSHALTSNAHE_CREDIT_MAX);
    const credits35a = handwerkerCredit + haushaltsnaheCredit;
    const estFinal = Math.max(0, estAfter35 - credits35a);
    result.steps.credits_35a = { handwerker: round2(handwerkerCredit), haushaltsnahe: round2(haushaltsnaheCredit), total: round2(credits35a) };

    // Step 16: Aggregate
    const totalIncomeTax = estFinal + soli + kist + gewstResult.gewerbesteuer;
    const totalCapitalTax = capitalResult.total_capital_tax || 0;
    const totalTax = totalIncomeTax + totalCapitalTax;

    const lohnsteuerWithheld = emp.lohnsteuer_einbehalten || 0;
    const soliWithheldEmp = emp.soli_einbehalten || 0;
    const kistWithheldEmp = emp.kist_einbehalten || 0;
    const capitalWithheld = capitalResult.already_withheld || 0;
    const totalWithheld = lohnsteuerWithheld + soliWithheldEmp + kistWithheldEmp + capitalWithheld;

    const kindergeldOffset = kfbResult.use_kfb ? kindergeldReceived : 0;
    const nachzahlung = totalTax - totalWithheld + kindergeldOffset;

    result.summary = {
        sde: round2(sde),
        altersentlastung: round2(altersentlastung),
        gde: round2(gde),
        sonderausgaben: sonderausgaben.effective,
        agb_deductible: round2(agbDeductible),
        zve: round2(zveForEst),
        einkommensteuer_brutto: est,
        gewst_anrechnung_35: round2(anrechnung35),
        credits_35a: round2(credits35a),
        einkommensteuer_final: estFinal,
        solidaritaetszuschlag: soli,
        kirchensteuer: kist,
        gewerbesteuer: gewstResult.gewerbesteuer,
        abgeltungsteuer: totalCapitalTax,
        guenstigerpruefung: guenstigerpruefungUsed,
        total_tax: round2(totalTax),
        total_withheld: round2(totalWithheld),
        kindergeld_offset: kindergeldOffset,
        nachzahlung: round2(nachzahlung),
    };

    return result;
}

// ===========================================================================
// Utility
// ===========================================================================
function round2(v) { return Math.round(v * 100) / 100; }
