"""
Werbungskosten (§9 EStG): Entfernungspauschale, Homeoffice, WK-Pauschbetrag.
"""
from config import (
    WK_PAUSCHBETRAG, HOMEOFFICE_DAILY, HOMEOFFICE_MAX_DAYS,
    PENDLER_RATE_FIRST_20, PENDLER_RATE_FROM_21, PENDLER_CAP_NO_CAR,
)


def compute_entfernungspauschale(one_way_km: int, commuting_days: int, uses_own_car: bool = True) -> float:
    """§9 Abs.1 Nr.4 EStG — Pendlerpauschale."""
    first_20 = min(one_way_km, 20) * PENDLER_RATE_FIRST_20 * commuting_days
    remaining = max(0, one_way_km - 20) * PENDLER_RATE_FROM_21 * commuting_days
    total = first_20 + remaining
    if not uses_own_car:
        total = min(total, PENDLER_CAP_NO_CAR)
    return round(total, 2)


def compute_homeoffice(homeoffice_days: int) -> float:
    """Homeoffice-Tagespauschale §4 Abs.5 Nr.6c EStG."""
    days = min(homeoffice_days, HOMEOFFICE_MAX_DAYS)
    return round(days * HOMEOFFICE_DAILY, 2)


def compute_werbungskosten(
    commuting_days: int = 0,
    one_way_km: int = 0,
    homeoffice_days: int = 0,
    uses_own_car: bool = True,
    other_wk: float = 0.0,
    public_transport_annual: float = 0.0,
) -> dict:
    """
    Compute total Werbungskosten for employment income.
    Returns itemized breakdown and the effective amount (max of itemized vs Pauschbetrag).
    """
    pendler = compute_entfernungspauschale(one_way_km, commuting_days, uses_own_car)
    # Public transport: can claim higher of actual cost or Entfernungspauschale
    pendler = max(pendler, public_transport_annual)
    homeoffice = compute_homeoffice(homeoffice_days)
    itemized = pendler + homeoffice + other_wk
    effective = max(itemized, WK_PAUSCHBETRAG)
    return {
        "entfernungspauschale": pendler,
        "homeoffice": homeoffice,
        "other_wk": other_wk,
        "itemized_total": round(itemized, 2),
        "pauschbetrag": WK_PAUSCHBETRAG,
        "effective": round(effective, 2),
        "used_pauschbetrag": itemized < WK_PAUSCHBETRAG,
    }
