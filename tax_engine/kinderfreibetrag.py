"""
§32 Abs.6 EStG — Kinderfreibetrag vs Kindergeld Guenstigerpruefung.
Also computes Massstabsteuer for Soli/KiSt (§32d Abs.1 i.V.m. §51a EStG).
"""
from config import KINDERFREIBETRAG_TOTAL_PER_CHILD, KINDERGELD_ANNUAL_PER_CHILD
from tax_engine.income_tax import compute_income_tax


def compute_kinderfreibetrag(
    zve_without_kfb: float,
    num_children: int,
    kindergeld_received: float,
    filing_status: str = "single",
) -> dict:
    """
    Guenstigerpruefung: compare tax saved by Kinderfreibetrag vs Kindergeld received.
    The Finanzamt automatically uses whichever is more favorable.

    Returns:
      - use_kfb: whether Kinderfreibetrag is more favorable than Kindergeld
      - kfb_total: total Kinderfreibetrag amount
      - zve_after_kfb: zvE after subtracting KFB (only if KFB is used for ESt)
      - massstabsteuer_zve: zvE always reduced by KFB (for Soli/KiSt base, per §51a)
      - est_saving: tax difference from applying KFB
    """
    if num_children <= 0:
        return {
            "use_kfb": False,
            "kfb_total": 0,
            "zve_for_est": zve_without_kfb,
            "massstabsteuer_zve": zve_without_kfb,
            "est_saving": 0,
            "kindergeld_total": 0,
        }

    kfb_total = num_children * KINDERFREIBETRAG_TOTAL_PER_CHILD
    zve_with_kfb = max(0, zve_without_kfb - kfb_total)

    est_without = compute_income_tax(zve_without_kfb, filing_status)
    est_with = compute_income_tax(zve_with_kfb, filing_status)
    est_saving = est_without - est_with

    # If KFB saves more tax than Kindergeld received, use KFB for ESt
    # Otherwise keep Kindergeld and don't reduce zvE for ESt purposes
    use_kfb = est_saving > kindergeld_received

    return {
        "use_kfb": use_kfb,
        "kfb_total": kfb_total,
        "zve_for_est": zve_with_kfb if use_kfb else zve_without_kfb,
        # Massstabsteuer: ALWAYS subtract KFB regardless of Guenstigerpruefung
        "massstabsteuer_zve": zve_with_kfb,
        "est_saving": est_saving,
        "kindergeld_total": kindergeld_received,
    }
