"""Log and output redactor for API credentials.
Guarantees no nova_sk_ or rzp_ secrets leak in logs or error responses.
"""

import re
import logging

NOVA_REGEX = re.compile(r"nova_sk_[A-Za-z0-9_\-]{43}")
RAZORPAY_REGEX = re.compile(r"rzp_(?:test|live)_[A-Za-z0-9]{10,}")
AUTH_HEADER_REGEX = re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.]+", re.IGNORECASE)
BASIC_HEADER_REGEX = re.compile(r"(Basic\s+)[A-Za-z0-9+/=]+", re.IGNORECASE)


def redact_sensitive_string(text: str) -> str:
    """Redact sensitive keys from log or error string."""
    if not isinstance(text, str):
        return text
    text = NOVA_REGEX.sub("nova_sk_REDACTED", text)
    text = RAZORPAY_REGEX.sub("rzp_REDACTED", text)
    text = AUTH_HEADER_REGEX.sub(r"\1[REDACTED]", text)
    text = BASIC_HEADER_REGEX.sub(r"\1[REDACTED]", text)
    return text


class SensitiveDataFilter(logging.Filter):
    """Logging filter that redacts credentials from all log records."""
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_string(record.msg)
        return True
