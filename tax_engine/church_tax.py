"""
Kirchensteuer — percentage of Einkommensteuer (or Massstabsteuer), by Bundesland.
"""
from config import KIRCHENSTEUER_RATE


def compute_church_tax(est: float, bundesland: str, church_member: bool = True) -> float:
    """Compute Kirchensteuer. Returns 0 if not a church member."""
    if not church_member:
        return 0.0
    rate = KIRCHENSTEUER_RATE.get(bundesland, 0.09)
    return round(est * rate, 2)


def get_church_rate(bundesland: str) -> float:
    return KIRCHENSTEUER_RATE.get(bundesland, 0.09)
