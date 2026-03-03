"""
German tax constants for 2025 (Steuerjahr 2025).
Single source of truth — all statutory figures referenced by §-number.
"""

TAX_YEAR = 2025

# ---------------------------------------------------------------------------
# §32a EStG — Einkommensteuertarif (Grundtarif, single filer)
# ---------------------------------------------------------------------------
GRUNDFREIBETRAG = 12_096          # Zone 1 upper bound
ZONE2_UPPER = 17_443
ZONE3_UPPER = 68_480
ZONE4_UPPER = 277_825

# Zone formulas: y or z = (zvE - zone_start) / 10_000
# Zone 2: ESt = (932.30 * y + 1400) * y
ZONE2_A = 932.30
ZONE2_B = 1_400
# Zone 3: ESt = (176.64 * z + 2397) * z + 1015.13
ZONE3_A = 176.64
ZONE3_B = 2_397
ZONE3_C = 1_015.13
# Zone 4: ESt = 0.42 * zvE - 10_911.92
ZONE4_RATE = 0.42
ZONE4_SUBTRACT = 10_911.92
# Zone 5: ESt = 0.45 * zvE - 19_246.67
ZONE5_RATE = 0.45
ZONE5_SUBTRACT = 19_246.67

# ---------------------------------------------------------------------------
# §3 SolZG — Solidaritaetszuschlag
# ---------------------------------------------------------------------------
SOLI_RATE = 0.055
SOLI_FREIGRENZE_SINGLE = 19_450
SOLI_FREIGRENZE_JOINT = 38_900
SOLI_MILDERUNG_RATE = 0.119       # 11.9% of excess over Freigrenze

# ---------------------------------------------------------------------------
# Kirchensteuer — by Bundesland
# ---------------------------------------------------------------------------
KIRCHENSTEUER_RATE = {
    "Baden-Wuerttemberg": 0.08,
    "Bayern": 0.08,
    "Berlin": 0.09,
    "Brandenburg": 0.09,
    "Bremen": 0.09,
    "Hamburg": 0.09,
    "Hessen": 0.09,
    "Mecklenburg-Vorpommern": 0.09,
    "Niedersachsen": 0.09,
    "Nordrhein-Westfalen": 0.09,
    "Rheinland-Pfalz": 0.09,
    "Saarland": 0.09,
    "Sachsen": 0.09,
    "Sachsen-Anhalt": 0.09,
    "Schleswig-Holstein": 0.09,
    "Thueringen": 0.09,
}

BUNDESLAENDER = list(KIRCHENSTEUER_RATE.keys())

# ---------------------------------------------------------------------------
# §32d EStG — Abgeltungsteuer + §20 InvStG Teilfreistellung
# ---------------------------------------------------------------------------
ABGELTUNG_RATE = 0.25
SPARERPAUSCHBETRAG_SINGLE = 1_000
SPARERPAUSCHBETRAG_JOINT = 2_000

# InvStG §20 — Teilfreistellung for private investors
TEILFREISTELLUNG = {
    "aktienfonds": 0.30,
    "mischfonds": 0.15,
    "immobilienfonds": 0.60,
    "auslands_immobilienfonds": 0.80,
    "sonstige": 0.00,
}

# ---------------------------------------------------------------------------
# §9a EStG — Werbungskosten-Pauschbetrag
# ---------------------------------------------------------------------------
WK_PAUSCHBETRAG = 1_230

# ---------------------------------------------------------------------------
# Homeoffice-Tagespauschale (§4 Abs.5 Nr.6c EStG)
# ---------------------------------------------------------------------------
HOMEOFFICE_DAILY = 6.0
HOMEOFFICE_MAX_DAYS = 210         # => max 1_260 EUR/year

# ---------------------------------------------------------------------------
# §9 Abs.1 Nr.4 EStG — Entfernungspauschale
# ---------------------------------------------------------------------------
PENDLER_RATE_FIRST_20 = 0.30     # EUR/km, first 20 km one-way
PENDLER_RATE_FROM_21 = 0.38      # EUR/km, from km 21 onwards
PENDLER_CAP_NO_CAR = 4_500       # annual cap if not using own car

# ---------------------------------------------------------------------------
# GewStG §§7, 11 — Gewerbesteuer
# ---------------------------------------------------------------------------
GEWST_FREIBETRAG = 24_500        # §11 Abs.1 Nr.1 (natural persons)
GEWST_MESSZAHL = 0.035           # §11 Abs.2: 3.5%
GEWST_ANRECHNUNG_FAKTOR = 4.0   # §35 EStG: 4x Messbetrag credited vs ESt

# ---------------------------------------------------------------------------
# §10 EStG — Vorsorgeaufwendungen
# ---------------------------------------------------------------------------
ALTERSVORSORGE_MAX_SINGLE = 29_344   # GRV + Ruerup, 100% deductible
ALTERSVORSORGE_MAX_JOINT = 58_688
KV_KRANKENGELD_ABZUG = 0.04         # 4% reduction for GKV (Krankengeld-Anteil)
SONSTIGE_VORSORGE_CAP_EMPLOYEE = 1_900
SONSTIGE_VORSORGE_CAP_SELF_EMPLOYED = 2_800

# ---------------------------------------------------------------------------
# §10b EStG — Spenden (capped at 20% of GdE)
# ---------------------------------------------------------------------------
SPENDEN_GDE_CAP = 0.20

# ---------------------------------------------------------------------------
# §10 EStG — Sonderausgaben-Pauschbetrag
# ---------------------------------------------------------------------------
SONDERAUSGABEN_PAUSCHBETRAG_SINGLE = 36
SONDERAUSGABEN_PAUSCHBETRAG_JOINT = 72

# ---------------------------------------------------------------------------
# §32 Abs.6 EStG — Kinderfreibetrag
# ---------------------------------------------------------------------------
KINDERFREIBETRAG_PRO_ELTERNTEIL = 3_306  # x2 for both parents = 6_612
BEA_FREIBETRAG_PRO_ELTERNTEIL = 1_494   # Betreuung/Erziehung/Ausbildung, x2 = 2_988
# Total per child (both parents): 6_612 + 2_988 = 9_600
KINDERFREIBETRAG_TOTAL_PER_CHILD = 9_600
KINDERGELD_MONTHLY_2025 = 255            # EUR/month per child (since Jan 2025)
KINDERGELD_ANNUAL_PER_CHILD = 3_060      # 255 * 12

# ---------------------------------------------------------------------------
# §24a EStG — Altersentlastungsbetrag
# ---------------------------------------------------------------------------
# Applies to taxpayers who were 64+ at start of tax year.
# Percentage and max amount depend on the year the taxpayer turned 64.
# For 2025: if taxpayer turned 64 in 2025, the Bemessungsgrundlage year is 2025.
# Simplified: birth year <= 1960 -> eligible. Exact % depends on cohort year.
# We store the table for recent cohorts:
ALTERSENTLASTUNG = {
    # year_turned_64: (percentage, max_amount)
    2020: (0.160, 760),
    2021: (0.152, 722),
    2022: (0.144, 684),
    2023: (0.136, 646),
    2024: (0.128, 608),
    2025: (0.120, 570),
    2026: (0.112, 532),
    2027: (0.104, 494),
    2028: (0.096, 456),
    2029: (0.088, 418),
    2030: (0.080, 380),
}

# ---------------------------------------------------------------------------
# §33 EStG — Zumutbare Belastung (tiered)
# ---------------------------------------------------------------------------
# (income_up_to, rate_single_no_kids, rate_married_no_kids, rate_1_2_kids, rate_3plus_kids)
ZUMUTBARE_BELASTUNG_TIERS = [
    (15_340, 0.05, 0.04, 0.02, 0.01),
    (51_130, 0.06, 0.05, 0.03, 0.01),
    (None,   0.07, 0.06, 0.04, 0.02),
]

# ---------------------------------------------------------------------------
# §35a EStG — Steuermaessigungen (direct tax credits)
# ---------------------------------------------------------------------------
HANDWERKER_CREDIT_RATE = 0.20
HANDWERKER_CREDIT_MAX = 1_200        # max credit (on max 6_000 expenses)
HAUSHALTSNAHE_CREDIT_RATE = 0.20
HAUSHALTSNAHE_CREDIT_MAX = 4_000     # max credit (on max 20_000 expenses)
MINIJOB_HAUSHALT_CREDIT_RATE = 0.20
MINIJOB_HAUSHALT_CREDIT_MAX = 510

# ---------------------------------------------------------------------------
# Rental — AfA rates (§7 EStG)
# ---------------------------------------------------------------------------
AFA_RATE_PRE_1925 = 0.025   # 2.5% for buildings built before 1925
AFA_RATE_1925_2022 = 0.02   # 2.0% for buildings built 1925-2022
AFA_RATE_POST_2022 = 0.03   # 3.0% for buildings built after 2022
