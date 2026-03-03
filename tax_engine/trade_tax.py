"""
GewStG §§7, 11, 16 — Gewerbesteuer + §35 EStG Anrechnung.
"""
import math
from config import GEWST_FREIBETRAG, GEWST_MESSZAHL, GEWST_ANRECHNUNG_FAKTOR


def compute_gewerbesteuer(
    gewinn: float,
    hebesatz: float = 400.0,
    is_freiberufler: bool = False,
) -> dict:
    """
    Compute Gewerbesteuer for Gewerbetreibende.
    Freiberufler (§18 EStG) are NOT subject to GewSt.

    hebesatz: municipal Hebesatz in percent (e.g., 400 = 400%).
    """
    if is_freiberufler or gewinn <= 0:
        return {
            "gewerbeertrag": 0,
            "freibetrag": GEWST_FREIBETRAG,
            "stpfl_gewerbeertrag": 0,
            "messbetrag": 0.0,
            "gewerbesteuer": 0.0,
            "anrechnung_35": 0.0,
            "is_freiberufler": is_freiberufler,
        }

    # §7: Gewerbeertrag (rounded down to nearest 100)
    gewerbeertrag = math.floor(gewinn / 100) * 100
    stpfl = max(0, gewerbeertrag - GEWST_FREIBETRAG)

    # §11: Messbetrag = stpfl * 3.5%
    messbetrag = stpfl * GEWST_MESSZAHL

    # GewSt = Messbetrag * (Hebesatz / 100)
    gewst = messbetrag * (hebesatz / 100)

    # §35 EStG: credit 4x Messbetrag against ESt (capped at actual GewSt)
    anrechnung = min(GEWST_ANRECHNUNG_FAKTOR * messbetrag, gewst)

    return {
        "gewerbeertrag": gewerbeertrag,
        "freibetrag": GEWST_FREIBETRAG,
        "stpfl_gewerbeertrag": stpfl,
        "messbetrag": round(messbetrag, 2),
        "hebesatz": hebesatz,
        "gewerbesteuer": round(gewst, 2),
        "anrechnung_35": round(anrechnung, 2),
        "is_freiberufler": is_freiberufler,
    }
