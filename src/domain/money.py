"""Financial math and money helpers using integer paise.
Rule: 1 INR = 100 paise. Floats are never used for currency balance storage.
"""

from decimal import Decimal, ROUND_HALF_UP


def to_paise(amount: float | str | Decimal) -> int:
    """Convert an INR amount in rupees/decimal to integer paise with half-up rounding.
    Tested on: 0, 0.01, 0.1, 0.29, 1234567.89
    """
    if isinstance(amount, (int,)):
        return int(amount * 100)
    d = Decimal(str(amount))
    return int((d * Decimal(100)).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def from_paise(paise: int) -> float:
    """Convert integer paise to float INR for presentation only."""
    return paise / 100.0


def format_inr(paise: int) -> str:
    """Format integer paise into standard Indian Rupee string."""
    rupees = paise // 100
    remainder = abs(paise % 100)
    sign = "-" if paise < 0 else ""
    abs_rupees = abs(rupees)

    s = str(abs_rupees)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.insert(0, rest)
        formatted_rupees = ",".join(parts) + "," + last3
    else:
        formatted_rupees = s

    return f"{sign}₹{formatted_rupees}.{remainder:02d}"


def calculate_fee_and_gst(gross_paise: int, fee_bps: int, gst_bps: int) -> tuple[int, int, int]:
    """Calculate processing fee, GST on fee, and expected net amount in paise.
    gross: gross amount in paise
    fee_bps: fee in basis points (e.g. 200 bps = 2.00%)
    gst_bps: gst in basis points (e.g. 1800 bps = 18.00% on fee)
    Returns: (fee_paise, tax_paise, expected_net_paise)
    """
    fee_decimal = (Decimal(gross_paise) * Decimal(fee_bps) / Decimal(10000)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    fee_paise = int(fee_decimal)

    tax_decimal = (Decimal(fee_paise) * Decimal(gst_bps) / Decimal(10000)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    tax_paise = int(tax_decimal)

    expected_net = gross_paise - fee_paise - tax_paise
    return fee_paise, tax_paise, expected_net
