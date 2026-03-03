"""
§32a EStG — Einkommensteuer (progressive bracket formula).
Implements Grundtarif and Splittingverfahren.
"""
import math
from config import (
    GRUNDFREIBETRAG, ZONE2_UPPER, ZONE3_UPPER, ZONE4_UPPER,
    ZONE2_A, ZONE2_B, ZONE3_A, ZONE3_B, ZONE3_C,
    ZONE4_RATE, ZONE4_SUBTRACT, ZONE5_RATE, ZONE5_SUBTRACT,
)


def _grundtarif(zve: float) -> int:
    """Apply §32a Abs.1 formula to a single taxable income. Returns ESt in whole euros (floored)."""
    zve = math.floor(zve)
    if zve <= GRUNDFREIBETRAG:
        return 0
    if zve <= ZONE2_UPPER:
        y = (zve - GRUNDFREIBETRAG) / 10_000
        return int((ZONE2_A * y + ZONE2_B) * y)
    if zve <= ZONE3_UPPER:
        z = (zve - ZONE2_UPPER) / 10_000
        return int((ZONE3_A * z + ZONE3_B) * z + ZONE3_C)
    if zve <= ZONE4_UPPER:
        return int(ZONE4_RATE * zve - ZONE4_SUBTRACT)
    return int(ZONE5_RATE * zve - ZONE5_SUBTRACT)


def compute_income_tax(zve: float, filing_status: str = "single") -> int:
    """
    Compute Einkommensteuer for the given zu versteuerndes Einkommen.
    filing_status: "single" or "joint" (Splittingverfahren per §32a Abs.5).
    Returns ESt in whole euros.
    """
    if filing_status == "joint":
        half_tax = _grundtarif(zve / 2)
        return half_tax * 2
    return _grundtarif(zve)


def marginal_rate(zve: float, filing_status: str = "single") -> float:
    """Approximate marginal tax rate at given zvE (for Günstigerprüfung comparison)."""
    base = compute_income_tax(zve, filing_status)
    incremented = compute_income_tax(zve + 1, filing_status)
    return incremented - base
