SQLITE_MAX_ID = 2**63 - 1


def in_id_range(value: int) -> bool:
    """SQLite integers are 64-bit; larger ids cannot exist and must not reach the driver."""
    return value <= SQLITE_MAX_ID
