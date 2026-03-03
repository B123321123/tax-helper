"""
Tax calculation orchestrator — chains all modules in statutory order.
"""
import math
from config import (
    TAX_YEAR, ALTERSENTLASTUNG, ZUMUTBARE_BELASTUNG_TIERS,
    HANDWERKER_CREDIT_RATE, HANDWERKER_CREDIT_MAX,
    HAUSHALTSNAHE_CREDIT_RATE, HAUSHALTSNAHE_CREDIT_MAX,
    KINDERGELD_ANNUAL_PER_CHILD,
)
from tax_engine.income_tax import compute_income_tax
from tax_engine.solidarity import compute_soli
from tax_engine.church_tax import compute_church_tax
from tax_engine.deductions import compute_werbungskosten
from tax_engine.vorsorge import compute_vorsorge, compute_sonderausgaben
from tax_engine.kinderfreibetrag import compute_kinderfreibetrag
from tax_engine.capital_gains import compute_taxable_capital_income, compute_abgeltungsteuer
from tax_engine.trade_tax import compute_gewerbesteuer


def _compute_altersentlastung(birth_year: int, positive_income_without_pension: float) -> float:
    """§24a EStG — Altersentlastungsbetrag for taxpayers 64+ at start of tax year."""
    age_at_start = TAX_YEAR - 1 - birth_year  # age on Jan 1
    if age_at_start < 64:
        return 0.0
    year_turned_64 = birth_year + 64
    entry = ALTERSENTLASTUNG.get(year_turned_64)
    if entry is None:
        # Before 2020 or after 2030 — use boundary or 0
        if year_turned_64 < min(ALTERSENTLASTUNG):
            entry = ALTERSENTLASTUNG[min(ALTERSENTLASTUNG)]
        elif year_turned_64 > max(ALTERSENTLASTUNG):
            return 0.0  # phases out completely by 2058
        else:
            return 0.0
    pct, cap = entry
    return min(positive_income_without_pension * pct, cap)


def _compute_zumutbare_belastung(gde: float, filing_status: str, num_children: int) -> float:
    """§33 EStG — tiered zumutbare Belastung calculation."""
    if filing_status == "single":
        col = 0 if num_children == 0 else (2 if num_children <= 2 else 3)
    else:
        col = 1 if num_children == 0 else (2 if num_children <= 2 else 3)

    total = 0.0
    prev_threshold = 0
    for tier_upper, *rates in ZUMUTBARE_BELASTUNG_TIERS:
        rate = rates[col]
        if tier_upper is None:
            taxable_in_tier = max(0, gde - prev_threshold)
        else:
            taxable_in_tier = max(0, min(gde, tier_upper) - prev_threshold)
        total += taxable_in_tier * rate
        prev_threshold = tier_upper if tier_upper else prev_threshold
    return round(total, 2)


def calculate_full_tax(payload: dict) -> dict:
    """
    Full 16-step statutory tax calculation.

    payload keys:
      tax_year, filing_status, bundesland, church_member, birth_year,
      income_categories: list of "employment", "capital", "freelance", "rental",
      employment: {bruttolohn, lohnsteuer_einbehalten, commuting_days, one_way_km,
                   homeoffice_days, other_wk, uses_own_car, public_transport_annual},
      capital: {dividends, interest, realized_gains, fund_distributions,
                fund_sale_gains, vorabpauschale, fund_type,
                already_withheld_kest, already_withheld_soli, already_withheld_kist},
      freelance: {business_type, einnahmen, betriebsausgaben, hebesatz},
      rental: {mieteinnahmen, nebenkosten_umlagen, schuldzinsen, afa, sonstige_wk, grundsteuer},
      children: {num_children, kindergeld_received},
      deductions: {grv_beitraege, ruerup_beitraege, kv_basis, pv_beitraege,
                   sonstige_vorsorge, is_gkv, kirchensteuer_paid, spenden,
                   handwerkerleistungen, haushaltsnahe_dl,
                   aussergewoehnliche_belastungen},
    """
    fs = payload.get("filing_status", "single")
    bundesland = payload.get("bundesland", "Berlin")
    church = payload.get("church_member", False)
    birth_year = payload.get("birth_year", 1990)
    categories = payload.get("income_categories", [])
    emp = payload.get("employment", {})
    cap = payload.get("capital", {})
    frl = payload.get("freelance", {})
    rent = payload.get("rental", {})
    kids = payload.get("children", {})
    ded = payload.get("deductions", {})

    result = {"steps": {}}

    # -----------------------------------------------------------------------
    # Step 1: Werbungskosten per category
    # -----------------------------------------------------------------------
    wk_detail = {}
    einkuenfte = {}

    # Employment (§19 EStG)
    if "employment" in categories:
        wk = compute_werbungskosten(
            commuting_days=emp.get("commuting_days", 0),
            one_way_km=emp.get("one_way_km", 0),
            homeoffice_days=emp.get("homeoffice_days", 0),
            uses_own_car=emp.get("uses_own_car", True),
            other_wk=emp.get("other_wk", 0),
            public_transport_annual=emp.get("public_transport_annual", 0),
        )
        wk_detail["employment"] = wk
        brutto = emp.get("bruttolohn", 0)
        einkuenfte["employment"] = round(brutto - wk["effective"], 2)

    # Freelance / Self-employment (§18 or §15 EStG)
    is_freiberufler = False
    if "freelance" in categories:
        einnahmen = frl.get("einnahmen", 0)
        ausgaben = frl.get("betriebsausgaben", 0)
        is_freiberufler = frl.get("business_type", "freiberufler") == "freiberufler"
        einkuenfte["freelance"] = round(einnahmen - ausgaben, 2)

    # Rental (§21 EStG)
    if "rental" in categories:
        miete = rent.get("mieteinnahmen", 0) + rent.get("nebenkosten_umlagen", 0)
        wk_rental = (
            rent.get("schuldzinsen", 0) + rent.get("afa", 0) +
            rent.get("sonstige_wk", 0) + rent.get("grundsteuer", 0)
        )
        einkuenfte["rental"] = round(miete - wk_rental, 2)

    result["steps"]["einkuenfte"] = einkuenfte
    result["steps"]["werbungskosten"] = wk_detail

    # -----------------------------------------------------------------------
    # Step 2-3: Summe der Einkuenfte (SdE) — capital kept separate
    # -----------------------------------------------------------------------
    sde = sum(einkuenfte.values())

    # -----------------------------------------------------------------------
    # Step 4: Altersentlastungsbetrag
    # -----------------------------------------------------------------------
    altersentlastung = _compute_altersentlastung(birth_year, max(0, sde))
    result["steps"]["altersentlastung"] = round(altersentlastung, 2)

    # -----------------------------------------------------------------------
    # Step 5: Gesamtbetrag der Einkuenfte (GdE)
    # -----------------------------------------------------------------------
    gde = sde - altersentlastung
    result["steps"]["sde"] = round(sde, 2)
    result["steps"]["gde"] = round(gde, 2)

    # -----------------------------------------------------------------------
    # Step 6: Sonderausgaben (§10 EStG)
    # -----------------------------------------------------------------------
    is_self_emp = "freelance" in categories
    vorsorge = compute_vorsorge(
        grv_beitraege=ded.get("grv_beitraege", 0),
        ruerup_beitraege=ded.get("ruerup_beitraege", 0),
        kv_basis=ded.get("kv_basis", 0),
        pv_beitraege=ded.get("pv_beitraege", 0),
        sonstige_vorsorge=ded.get("sonstige_vorsorge", 0),
        is_gkv=ded.get("is_gkv", True),
        is_self_employed=is_self_emp,
        filing_status=fs,
    )
    sonderausgaben = compute_sonderausgaben(
        vorsorge_total=vorsorge["total"],
        kirchensteuer_paid=ded.get("kirchensteuer_paid", 0),
        spenden=ded.get("spenden", 0),
        gde=gde,
        filing_status=fs,
    )
    result["steps"]["vorsorge"] = vorsorge
    result["steps"]["sonderausgaben"] = sonderausgaben

    # -----------------------------------------------------------------------
    # Step 7: Aussergewoehnliche Belastungen (§33 EStG)
    # -----------------------------------------------------------------------
    num_children = kids.get("num_children", 0)
    agb_claimed = ded.get("aussergewoehnliche_belastungen", 0)
    zumutbar = _compute_zumutbare_belastung(gde, fs, num_children)
    agb_deductible = max(0, agb_claimed - zumutbar)
    result["steps"]["agb"] = {
        "claimed": agb_claimed,
        "zumutbare_belastung": zumutbar,
        "deductible": round(agb_deductible, 2),
    }

    # -----------------------------------------------------------------------
    # Step 8: zu versteuerndes Einkommen (zvE) — before Kinderfreibetrag
    # -----------------------------------------------------------------------
    zve_before_kfb = max(0, gde - sonderausgaben["effective"] - agb_deductible)

    # -----------------------------------------------------------------------
    # Kinderfreibetrag vs Kindergeld (§32 Abs.6 + §51a)
    # -----------------------------------------------------------------------
    kindergeld_received = kids.get("kindergeld_received", num_children * KINDERGELD_ANNUAL_PER_CHILD)
    kfb_result = compute_kinderfreibetrag(
        zve_without_kfb=zve_before_kfb,
        num_children=num_children,
        kindergeld_received=kindergeld_received,
        filing_status=fs,
    )
    result["steps"]["kinderfreibetrag"] = kfb_result

    zve_for_est = kfb_result["zve_for_est"]
    massstab_zve = kfb_result["massstabsteuer_zve"]

    result["steps"]["zve"] = round(zve_for_est, 2)
    result["steps"]["zve_before_kfb"] = round(zve_before_kfb, 2)

    # -----------------------------------------------------------------------
    # Step 9: Einkommensteuer (§32a)
    # -----------------------------------------------------------------------
    est = compute_income_tax(zve_for_est, fs)

    # -----------------------------------------------------------------------
    # Step 10: Gewerbesteuer + §35 Anrechnung
    # -----------------------------------------------------------------------
    gewst_result = {"gewerbesteuer": 0, "anrechnung_35": 0}
    if "freelance" in categories:
        gewst_result = compute_gewerbesteuer(
            gewinn=einkuenfte.get("freelance", 0),
            hebesatz=frl.get("hebesatz", 400),
            is_freiberufler=is_freiberufler,
        )
    anrechnung_35 = min(gewst_result["anrechnung_35"], est)
    est_after_35 = est - anrechnung_35
    result["steps"]["gewerbesteuer"] = gewst_result

    # -----------------------------------------------------------------------
    # Step 11: Massstabsteuer for Soli/KiSt
    # -----------------------------------------------------------------------
    massstab_est = compute_income_tax(massstab_zve, fs)
    massstab_est_after_35 = massstab_est - min(gewst_result["anrechnung_35"], massstab_est)
    result["steps"]["massstabsteuer"] = massstab_est_after_35

    # -----------------------------------------------------------------------
    # Step 12-13: Soli + KiSt on Massstabsteuer
    # -----------------------------------------------------------------------
    soli = compute_soli(massstab_est_after_35, fs)
    kist = compute_church_tax(massstab_est_after_35, bundesland, church)

    # -----------------------------------------------------------------------
    # Step 14: Capital income — Guenstigerpruefung (§32d Abs.6)
    # -----------------------------------------------------------------------
    capital_result = {"taxable_capital_income": 0, "total_capital_tax": 0, "nachzahlung_capital": 0}
    guenstigerpruefung_used = False

    if "capital" in categories:
        cap_income = compute_taxable_capital_income(
            dividends=cap.get("dividends", 0),
            interest=cap.get("interest", 0),
            realized_gains=cap.get("realized_gains", 0),
            fund_distributions=cap.get("fund_distributions", 0),
            fund_sale_gains=cap.get("fund_sale_gains", 0),
            vorabpauschale=cap.get("vorabpauschale", 0),
            fund_type=cap.get("fund_type", "sonstige"),
            filing_status=fs,
        )
        taxable_cap = cap_income["taxable_capital_income"]

        # Path A: flat Abgeltungsteuer
        abgst_result = compute_abgeltungsteuer(
            taxable_capital=taxable_cap,
            bundesland=bundesland,
            church_member=church,
            already_withheld_kest=cap.get("already_withheld_kest", 0),
            already_withheld_soli=cap.get("already_withheld_soli", 0),
            already_withheld_kist=cap.get("already_withheld_kist", 0),
        )

        # Path B: merge into progressive rate
        zve_with_cap = zve_for_est + taxable_cap
        est_with_cap = compute_income_tax(zve_with_cap, fs)
        marginal_tax_on_cap = est_with_cap - est
        # Compare total tax including Soli/KiSt
        massstab_with_cap = compute_income_tax(massstab_zve + taxable_cap, fs)
        massstab_with_cap_35 = massstab_with_cap - min(gewst_result["anrechnung_35"], massstab_with_cap)
        soli_b = compute_soli(massstab_with_cap_35, fs)
        kist_b = compute_church_tax(massstab_with_cap_35, bundesland, church)
        progressive_total = marginal_tax_on_cap + (soli_b - soli) + (kist_b - kist)

        if progressive_total < abgst_result["total_capital_tax"] and taxable_cap > 0:
            guenstigerpruefung_used = True
            # Use progressive: adjust all figures
            est = est_with_cap
            est_after_35 = est - anrechnung_35
            massstab_est_after_35 = massstab_with_cap_35
            soli = soli_b
            kist = kist_b
            withheld = (cap.get("already_withheld_kest", 0) +
                        cap.get("already_withheld_soli", 0) +
                        cap.get("already_withheld_kist", 0))
            capital_result = {
                **cap_income,
                "method": "guenstigerpruefung",
                "progressive_tax": round(progressive_total, 2),
                "abgeltung_would_be": abgst_result["total_capital_tax"],
                "already_withheld": round(withheld, 2),
                "total_capital_tax": 0,  # folded into ESt
                "nachzahlung_capital": 0,
            }
        else:
            capital_result = {**cap_income, **abgst_result, "method": "abgeltungsteuer"}

    result["steps"]["capital"] = capital_result
    result["steps"]["guenstigerpruefung"] = guenstigerpruefung_used

    # -----------------------------------------------------------------------
    # Step 15: §35a credits
    # -----------------------------------------------------------------------
    handwerker_expenses = ded.get("handwerkerleistungen", 0)
    handwerker_credit = min(handwerker_expenses * HANDWERKER_CREDIT_RATE, HANDWERKER_CREDIT_MAX)
    haushaltsnahe_expenses = ded.get("haushaltsnahe_dl", 0)
    haushaltsnahe_credit = min(haushaltsnahe_expenses * HAUSHALTSNAHE_CREDIT_RATE, HAUSHALTSNAHE_CREDIT_MAX)
    credits_35a = handwerker_credit + haushaltsnahe_credit

    est_final = max(0, est_after_35 - credits_35a)
    result["steps"]["credits_35a"] = {
        "handwerker": round(handwerker_credit, 2),
        "haushaltsnahe": round(haushaltsnahe_credit, 2),
        "total": round(credits_35a, 2),
    }

    # -----------------------------------------------------------------------
    # Step 16: Aggregate
    # -----------------------------------------------------------------------
    total_income_tax = est_final + soli + kist + gewst_result["gewerbesteuer"]
    total_capital_tax = capital_result.get("total_capital_tax", 0)
    total_tax = total_income_tax + total_capital_tax

    # Already withheld
    lohnsteuer_withheld = emp.get("lohnsteuer_einbehalten", 0)
    soli_withheld_employment = emp.get("soli_einbehalten", 0)
    kist_withheld_employment = emp.get("kist_einbehalten", 0)
    capital_withheld = capital_result.get("already_withheld", 0)

    total_withheld = lohnsteuer_withheld + soli_withheld_employment + kist_withheld_employment + capital_withheld

    # Add back Kindergeld if KFB was used (Kindergeld must be "returned")
    kindergeld_offset = kindergeld_received if kfb_result["use_kfb"] else 0

    nachzahlung = total_tax - total_withheld + kindergeld_offset

    result["summary"] = {
        "sde": round(sde, 2),
        "altersentlastung": round(altersentlastung, 2),
        "gde": round(gde, 2),
        "sonderausgaben": sonderausgaben["effective"],
        "agb_deductible": round(agb_deductible, 2),
        "zve": round(zve_for_est, 2),
        "einkommensteuer_brutto": est,
        "gewst_anrechnung_35": round(anrechnung_35, 2),
        "credits_35a": round(credits_35a, 2),
        "einkommensteuer_final": est_final,
        "solidaritaetszuschlag": soli,
        "kirchensteuer": kist,
        "gewerbesteuer": gewst_result["gewerbesteuer"],
        "abgeltungsteuer": total_capital_tax,
        "guenstigerpruefung": guenstigerpruefung_used,
        "total_tax": round(total_tax, 2),
        "total_withheld": round(total_withheld, 2),
        "kindergeld_offset": kindergeld_offset,
        "nachzahlung": round(nachzahlung, 2),
    }

    return result
