"""
§10 EStG — Vorsorgeaufwendungen with statutory sub-limits.
"""
from config import (
    ALTERSVORSORGE_MAX_SINGLE, ALTERSVORSORGE_MAX_JOINT,
    KV_KRANKENGELD_ABZUG,
    SONSTIGE_VORSORGE_CAP_EMPLOYEE, SONSTIGE_VORSORGE_CAP_SELF_EMPLOYED,
    SONDERAUSGABEN_PAUSCHBETRAG_SINGLE, SONDERAUSGABEN_PAUSCHBETRAG_JOINT,
    SPENDEN_GDE_CAP,
)


def compute_vorsorge(
    grv_beitraege: float = 0.0,
    ruerup_beitraege: float = 0.0,
    kv_basis: float = 0.0,
    pv_beitraege: float = 0.0,
    sonstige_vorsorge: float = 0.0,
    is_gkv: bool = True,
    is_self_employed: bool = False,
    filing_status: str = "single",
) -> dict:
    """
    Compute deductible Vorsorgeaufwendungen per §10 EStG sub-limits.

    Returns breakdown and total deductible amount.
    """
    # 1. Altersvorsorge (§10 Abs.1 Nr.2): GRV + Ruerup, 100% deductible, capped
    altersvorsorge_max = (
        ALTERSVORSORGE_MAX_JOINT if filing_status == "joint" else ALTERSVORSORGE_MAX_SINGLE
    )
    altersvorsorge_paid = grv_beitraege + ruerup_beitraege
    altersvorsorge_deductible = min(altersvorsorge_paid, altersvorsorge_max)

    # 2. Basiskrankenversicherung + Pflege (§10 Abs.1 Nr.3): 100% deductible
    # GKV: reduce by 4% Krankengeld-Anteil
    kv_deductible = kv_basis * (1 - KV_KRANKENGELD_ABZUG) if is_gkv else kv_basis
    basis_kv_pv = kv_deductible + pv_beitraege

    # 3. Sonstige Vorsorge (§10 Abs.1 Nr.3a): BU, Haftpflicht, Unfall, etc.
    # Capped at 1900 (employees) / 2800 (self-employed)
    # BUT: if Basis-KV+PV already >= cap, sonstige = 0
    cap = SONSTIGE_VORSORGE_CAP_SELF_EMPLOYED if is_self_employed else SONSTIGE_VORSORGE_CAP_EMPLOYEE
    remaining_cap = max(0, cap - basis_kv_pv)
    sonstige_deductible = min(sonstige_vorsorge, remaining_cap)

    total = altersvorsorge_deductible + basis_kv_pv + sonstige_deductible

    return {
        "altersvorsorge_paid": altersvorsorge_paid,
        "altersvorsorge_deductible": round(altersvorsorge_deductible, 2),
        "kv_basis_deductible": round(kv_deductible, 2),
        "pv_deductible": round(pv_beitraege, 2),
        "basis_kv_pv_total": round(basis_kv_pv, 2),
        "sonstige_cap": cap,
        "sonstige_deductible": round(sonstige_deductible, 2),
        "total": round(total, 2),
    }


def compute_sonderausgaben(
    vorsorge_total: float,
    kirchensteuer_paid: float = 0.0,
    spenden: float = 0.0,
    gde: float = 0.0,
    filing_status: str = "single",
) -> dict:
    """
    Compute total Sonderausgaben: Vorsorge + Kirchensteuer + Spenden.
    Spenden capped at 20% of GdE (§10b EStG).
    Applies Sonderausgaben-Pauschbetrag if itemized total is lower.
    """
    spenden_cap = gde * SPENDEN_GDE_CAP
    spenden_deductible = min(spenden, spenden_cap)

    itemized = vorsorge_total + kirchensteuer_paid + spenden_deductible
    pausch = (
        SONDERAUSGABEN_PAUSCHBETRAG_JOINT if filing_status == "joint"
        else SONDERAUSGABEN_PAUSCHBETRAG_SINGLE
    )
    effective = max(itemized, pausch)

    return {
        "vorsorge": round(vorsorge_total, 2),
        "kirchensteuer_paid": round(kirchensteuer_paid, 2),
        "spenden_claimed": round(spenden, 2),
        "spenden_deductible": round(spenden_deductible, 2),
        "spenden_cap_20pct_gde": round(spenden_cap, 2),
        "itemized_total": round(itemized, 2),
        "pauschbetrag": pausch,
        "effective": round(effective, 2),
    }
