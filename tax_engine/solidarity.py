"""
§3 SolZG — Solidaritaetszuschlag with Freigrenze and Milderungszone.
"""
from config import SOLI_RATE, SOLI_FREIGRENZE_SINGLE, SOLI_FREIGRENZE_JOINT, SOLI_MILDERUNG_RATE


def compute_soli(est: float, filing_status: str = "single") -> float:
    """
    Compute Solidaritaetszuschlag on the given Einkommensteuer (or Massstabsteuer).
    Returns Soli in EUR (rounded to 2 decimals).
    """
    freigrenze = SOLI_FREIGRENZE_JOINT if filing_status == "joint" else SOLI_FREIGRENZE_SINGLE
    if est <= freigrenze:
        return 0.0
    full_soli = est * SOLI_RATE
    milderung_soli = (est - freigrenze) * SOLI_MILDERUNG_RATE
    return round(min(full_soli, milderung_soli), 2)
