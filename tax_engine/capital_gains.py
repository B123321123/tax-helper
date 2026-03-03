"""
§32d EStG — Abgeltungsteuer + InvStG §§16-20 Teilfreistellung.
Includes Guenstigerpruefung (§32d Abs.6).
"""
from config import (
    ABGELTUNG_RATE, SPARERPAUSCHBETRAG_SINGLE, SPARERPAUSCHBETRAG_JOINT,
    TEILFREISTELLUNG, SOLI_RATE,
)
from tax_engine.church_tax import get_church_rate


def compute_taxable_capital_income(
    dividends: float = 0.0,
    interest: float = 0.0,
    realized_gains: float = 0.0,
    fund_distributions: float = 0.0,
    fund_sale_gains: float = 0.0,
    vorabpauschale: float = 0.0,
    fund_type: str = "sonstige",
    filing_status: str = "single",
) -> dict:
    """
    Compute taxable capital income after Teilfreistellung and Sparerpauschbetrag.
    """
    tf_rate = TEILFREISTELLUNG.get(fund_type, 0.0)

    # Direct capital income (no Teilfreistellung)
    direct_income = dividends + interest + realized_gains

    # Fund income with Teilfreistellung (InvStG §20)
    fund_gross = fund_distributions + fund_sale_gains + vorabpauschale
    fund_taxfree = fund_gross * tf_rate
    fund_taxable = fund_gross - fund_taxfree

    gross_taxable = direct_income + fund_taxable

    # Sparerpauschbetrag
    spb = SPARERPAUSCHBETRAG_JOINT if filing_status == "joint" else SPARERPAUSCHBETRAG_SINGLE
    taxable = max(0, gross_taxable - spb)

    return {
        "direct_income": round(direct_income, 2),
        "fund_gross": round(fund_gross, 2),
        "teilfreistellung_rate": tf_rate,
        "fund_taxfree": round(fund_taxfree, 2),
        "fund_taxable": round(fund_taxable, 2),
        "gross_taxable_before_spb": round(gross_taxable, 2),
        "sparerpauschbetrag": spb,
        "taxable_capital_income": round(taxable, 2),
    }


def compute_abgeltungsteuer(
    taxable_capital: float,
    bundesland: str = "Berlin",
    church_member: bool = False,
    already_withheld_kest: float = 0.0,
    already_withheld_soli: float = 0.0,
    already_withheld_kist: float = 0.0,
) -> dict:
    """
    Compute Abgeltungsteuer + Soli + KiSt on capital income.
    §32d Abs.1 S.4: when KiSt applies, the AbgSt rate is adjusted downward.
    """
    if taxable_capital <= 0:
        return {
            "abgeltungsteuer": 0.0,
            "soli_on_capital": 0.0,
            "kist_on_capital": 0.0,
            "total_capital_tax": 0.0,
            "already_withheld": round(already_withheld_kest + already_withheld_soli + already_withheld_kist, 2),
            "nachzahlung_capital": round(-(already_withheld_kest + already_withheld_soli + already_withheld_kist), 2),
        }

    kist_rate = get_church_rate(bundesland) if church_member else 0.0

    # §32d Abs.1 S.4: adjusted rate when Kirchensteuer applies
    if kist_rate > 0:
        effective_abgst_rate = ABGELTUNG_RATE / (1 + ABGELTUNG_RATE * kist_rate)
    else:
        effective_abgst_rate = ABGELTUNG_RATE

    abgst = taxable_capital * effective_abgst_rate
    soli = abgst * SOLI_RATE
    kist = abgst * kist_rate

    total = abgst + soli + kist
    already_total = already_withheld_kest + already_withheld_soli + already_withheld_kist
    nachzahlung = total - already_total

    return {
        "effective_abgst_rate": round(effective_abgst_rate, 6),
        "abgeltungsteuer": round(abgst, 2),
        "soli_on_capital": round(soli, 2),
        "kist_on_capital": round(kist, 2),
        "total_capital_tax": round(total, 2),
        "already_withheld": round(already_total, 2),
        "nachzahlung_capital": round(nachzahlung, 2),
    }
