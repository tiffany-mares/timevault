from helper import (
    get_db_connection, parse_offence_codes, parse_multi_offence,
    preprocess_values, _join_clause, _offence_exists_clause, _resolve_offence_str,
    OFFENCE_LOOKUP, COURT_MARTIAL_COLS, ENLISTMENT_COLS, KNOWN_BIRTHPLACES,
    BIRTHPLACE_FRONTEND_TO_DB, BIRTHPLACE_DB_TO_FRONTEND,
    MARITAL_STATUS_FRONTEND_TO_DB, MARITAL_STATUS_DB_TO_FRONTEND
)

# General use function for the single compare page that takes care of Rank, Units, and Occupation
def single_compare_list(values: list[str], col: str, offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)

    val_placeholders = ', '.join(['%s'] * len(values))
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    needs_join = col in ENLISTMENT_COLS
    col_ref = f"e.{col}" if needs_join else f"c.{col}"

    if needs_join:
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), {col_ref}, c.Offence
            {_join_clause()}
            WHERE {col_ref} IN ({val_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY {col_ref}, c.Offence
        """
    else:
        query = f"""
            SELECT COUNT(*), c.{col}, c.Offence
            FROM ww1_court_martial c
            WHERE c.{col} IN ({val_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY c.{col}, c.Offence
        """

    parameters = values + offence_codes
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{col.lower(): row[1], "offence": _resolve_offence_str(row[2], offence_codes_set), "count": row[0]} for row in rows]


# Specialized function for the single compare that takes care of birthplace, since special considerations must be made for this category
def single_compare_place_of_birth(values: list[str], offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    # Translate frontend values to DB values
    include_other = 'Other' in values
    translated = [BIRTHPLACE_FRONTEND_TO_DB.get(v, v) for v in values if v != 'Other']

    results = []

    # Query for specific birthplaces
    if translated:
        val_placeholders = ', '.join(['%s'] * len(translated))
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), e.Place_of_Birth, c.Offence
            {_join_clause()}
            WHERE e.Place_of_Birth IN ({val_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY e.Place_of_Birth, c.Offence
        """
        cursor.execute(query, translated + offence_codes)
        for row in cursor.fetchall():
            results.append({
                "place_of_birth": BIRTHPLACE_DB_TO_FRONTEND.get(row[1], row[1]),
                "offence": _resolve_offence_str(row[2], offence_codes_set),
                "count": row[0]
            })

    # Query for "Other" - aggregate everything not in the known list
    if include_other:
        known_placeholders = ', '.join(['%s'] * len(KNOWN_BIRTHPLACES))
        other_query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), c.Offence
            {_join_clause()}
            WHERE (e.Place_of_Birth NOT IN ({known_placeholders})
                OR e.Place_of_Birth IS NULL)
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY c.Offence
        """
        cursor.execute(other_query, list(KNOWN_BIRTHPLACES) + offence_codes)
        for row in cursor.fetchall():
            results.append({
                "place_of_birth": "Other",
                "offence": _resolve_offence_str(row[1], offence_codes_set),
                "count": row[0]
            })

    cursor.close()
    conn.close()
    return results

# Specialized function for the single compare that takes care of marital status, since special considerations must be made for this category
def single_compare_marital_status(marital_values: list[str], offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    translated = preprocess_values(marital_values, 'Marital_Status')
    val_placeholders = ', '.join(['%s'] * len(translated))

    query = f"""
        SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
               e.Marital_Status, c.Offence
        {_join_clause()}
        WHERE e.Marital_Status IN ({val_placeholders})
        {_offence_exists_clause(offence_placeholders)}
        GROUP BY e.Marital_Status, c.Offence
    """

    cursor.execute(query, translated + offence_codes)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    merged_results: dict = {}
    for row in rows:
        marital_frontend = MARITAL_STATUS_DB_TO_FRONTEND.get(row[1], row[1])
        offence_str = _resolve_offence_str(row[2], offence_codes_set)
        key = (marital_frontend, offence_str)
        merged_results[key] = merged_results.get(key, 0) + row[0]

    return [
        {"marital_status": k[0], "offence": k[1], "count": v}
        for k, v in merged_results.items()
    ]

# Specialized function for the single compare that takes care of categories with year ranges such as enlistment year and birth year
def single_compare_year(start: int, end: int, col: str, offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    needs_join = col in ENLISTMENT_COLS
    col_ref = f"e.{col}" if needs_join else f"c.{col}"

    if needs_join:
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), {col_ref}, c.Offence
            {_join_clause()}
            WHERE {col_ref} BETWEEN %s AND %s
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY {col_ref}, c.Offence
        """
    else:
        query = f"""
            SELECT COUNT(*), c.{col}, c.Offence
            FROM ww1_court_martial c
            WHERE c.{col} BETWEEN %s AND %s
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY c.{col}, c.Offence
        """

    parameters = [start, end] + offence_codes
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{col.lower(): row[1], "offence": _resolve_offence_str(row[2], offence_codes_set), "count": row[0]} for row in rows]

# General function that takes care of double compares for Unit, Rank, and Occupation. The other categories require more specific functions
def double_compare(cat1_values: list[str], cat2_values: list[str], offence_names: list[str], cat1_col: str, cat2_col: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)

    cat1_placeholders = ', '.join(['%s'] * len(cat1_values))
    cat2_placeholders = ', '.join(['%s'] * len(cat2_values))
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    needs_join = cat1_col in ENLISTMENT_COLS or cat2_col in ENLISTMENT_COLS

    def col_ref(col):
        return f"e.{col}" if col in ENLISTMENT_COLS else f"c.{col}"

    cat1_ref = col_ref(cat1_col)
    cat2_ref = col_ref(cat2_col)

    if needs_join:
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), {cat1_ref}, {cat2_ref}, c.Offence
            {_join_clause()}
            WHERE {cat1_ref} IN ({cat1_placeholders})
            AND {cat2_ref} IN ({cat2_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY {cat1_ref}, {cat2_ref}, c.Offence
        """
    else:
        query = f"""
            SELECT COUNT(*), c.{cat1_col}, c.{cat2_col}, c.Offence
            FROM ww1_court_martial c
            WHERE c.{cat1_col} IN ({cat1_placeholders})
            AND c.{cat2_col} IN ({cat2_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY c.{cat1_col}, c.{cat2_col}, c.Offence
        """

    parameters = cat1_values + cat2_values + offence_codes
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"cat1": row[1], "cat2": row[2], "offence": _resolve_offence_str(row[3], offence_codes_set), "count": row[0]} for row in rows]

# Function that takes care of double compares for birthplace + 1 of unit, rank, or occupation
def double_compare_birthplace(birthplace_values: list[str], other_values: list[str], offence_names: list[str], other_col: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    include_other = 'Other' in birthplace_values
    translated = [BIRTHPLACE_FRONTEND_TO_DB.get(v, v) for v in birthplace_values if v != 'Other']

    # Determine if other_col needs enlistment table
    other_ref = f"e.{other_col}" if other_col in ENLISTMENT_COLS else f"c.{other_col}"
    other_placeholders = ', '.join(['%s'] * len(other_values))
    known_placeholders = ', '.join(['%s'] * len(KNOWN_BIRTHPLACES))

    results = []

    # Query for specific birthplaces
    if translated:
        val_placeholders = ', '.join(['%s'] * len(translated))
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
                   e.Place_of_Birth, {other_ref}, c.Offence
            {_join_clause()}
            WHERE e.Place_of_Birth IN ({val_placeholders})
            AND {other_ref} IN ({other_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY e.Place_of_Birth, {other_ref}, c.Offence
        """
        cursor.execute(query, translated + other_values + offence_codes)
        for row in cursor.fetchall():
            results.append({
                "cat1": BIRTHPLACE_DB_TO_FRONTEND.get(row[1], row[1]),
                "cat2": row[2],
                "offence": _resolve_offence_str(row[3], offence_codes_set),
                "count": row[0]
            })

    # Query for "Other" - everything not in the known list
    if include_other:
        other_query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
                   {other_ref}, c.Offence
            {_join_clause()}
            WHERE (e.Place_of_Birth NOT IN ({known_placeholders})
                OR e.Place_of_Birth IS NULL)
            AND {other_ref} IN ({other_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY {other_ref}, c.Offence
        """
        cursor.execute(other_query, list(KNOWN_BIRTHPLACES) + other_values + offence_codes)
        for row in cursor.fetchall():
            results.append({
                "cat1": "Other",
                "cat2": row[1],
                "offence": _resolve_offence_str(row[2], offence_codes_set),
                "count": row[0]
            })

    cursor.close()
    conn.close()
    return results

# Function that takes care of birthplace + 1 of Enlistment year or birth year
def double_compare_birthplace_and_year(birthplace_values: list[str], start: int, end: int, year_col: str, offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    include_other = 'Other' in birthplace_values
    translated = [BIRTHPLACE_FRONTEND_TO_DB.get(v, v) for v in birthplace_values if v != 'Other']

    known_placeholders = ', '.join(['%s'] * len(KNOWN_BIRTHPLACES))
    year_ref = f"e.{year_col}" if year_col in ENLISTMENT_COLS else f"c.{year_col}"

    results = []

    if translated:
        val_placeholders = ', '.join(['%s'] * len(translated))
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
                   e.Place_of_Birth, {year_ref}, c.Offence
            {_join_clause()}
            WHERE e.Place_of_Birth IN ({val_placeholders})
            AND {year_ref} BETWEEN %s AND %s
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY e.Place_of_Birth, {year_ref}, c.Offence
        """
        cursor.execute(query, translated + [start, end] + offence_codes)
        for row in cursor.fetchall():
            results.append({
                "cat1": BIRTHPLACE_DB_TO_FRONTEND.get(row[1], row[1]),
                "cat2": row[2],
                "offence": _resolve_offence_str(row[3], offence_codes_set),
                "count": row[0]
            })

    if include_other:
        other_query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
                   {year_ref}, c.Offence
            {_join_clause()}
            WHERE (e.Place_of_Birth NOT IN ({known_placeholders})
                OR e.Place_of_Birth IS NULL)
            AND {year_ref} BETWEEN %s AND %s
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY {year_ref}, c.Offence
        """
        cursor.execute(other_query, list(KNOWN_BIRTHPLACES) + [start, end] + offence_codes)
        for row in cursor.fetchall():
            results.append({
                "cat1": "Other",
                "cat2": row[1],
                "offence": _resolve_offence_str(row[2], offence_codes_set),
                "count": row[0]
            })

    cursor.close()
    conn.close()
    return results

# Function that takes care of marital status + 1 of unit, rank, or occupation
def double_compare_marital(marital_values: list[str], other_values: list[str], offence_names: list[str], other_col: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    translated_marital = preprocess_values(marital_values, 'Marital_Status')
    marital_placeholders = ', '.join(['%s'] * len(translated_marital))
    other_ref = f"e.{other_col}" if other_col in ENLISTMENT_COLS else f"c.{other_col}"
    other_placeholders = ', '.join(['%s'] * len(other_values))

    query = f"""
        SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
               e.Marital_Status, {other_ref}, c.Offence
        {_join_clause()}
        WHERE e.Marital_Status IN ({marital_placeholders})
        AND {other_ref} IN ({other_placeholders})
        {_offence_exists_clause(offence_placeholders)}
        GROUP BY e.Marital_Status, {other_ref}, c.Offence
    """

    cursor.execute(query, translated_marital + other_values + offence_codes)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    merged_results: dict = {}
    for row in rows:
        marital_frontend = MARITAL_STATUS_DB_TO_FRONTEND.get(row[1], row[1])
        offence_str = _resolve_offence_str(row[3], offence_codes_set)
        key = (marital_frontend, row[2], offence_str)
        merged_results[key] = merged_results.get(key, 0) + row[0]

    return [
        {"cat1": k[0], "cat2": k[1], "offence": k[2], "count": v}
        for k, v in merged_results.items()
    ]

# Function that takes care of marital status and 1 of enlistment year, or birth year
def double_compare_marital_and_year(marital_values: list[str], start: int, end: int, year_col: str, offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    translated_marital = preprocess_values(marital_values, 'Marital_Status')
    marital_placeholders = ', '.join(['%s'] * len(translated_marital))
    year_ref = f"e.{year_col}" if year_col in ENLISTMENT_COLS else f"c.{year_col}"

    query = f"""
        SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
               e.Marital_Status, {year_ref}, c.Offence
        {_join_clause()}
        WHERE e.Marital_Status IN ({marital_placeholders})
        AND {year_ref} BETWEEN %s AND %s
        {_offence_exists_clause(offence_placeholders)}
        GROUP BY e.Marital_Status, {year_ref}, c.Offence
    """

    cursor.execute(query, translated_marital + [start, end] + offence_codes)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    merged_results: dict = {}
    for row in rows:
        marital_frontend = MARITAL_STATUS_DB_TO_FRONTEND.get(row[1], row[1])
        offence_str = _resolve_offence_str(row[3], offence_codes_set)
        key = (marital_frontend, row[2], offence_str)
        merged_results[key] = merged_results.get(key, 0) + row[0]

    return [
        {"cat1": k[0], "cat2": k[1], "offence": k[2], "count": v}
        for k, v in merged_results.items()
    ]

# Function that takes care of birthplace and marital status
def double_compare_birthplace_and_marital(birthplace_values: list[str], marital_values: list[str], offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    include_other = 'Other' in birthplace_values
    translated_birthplace = [BIRTHPLACE_FRONTEND_TO_DB.get(v, v) for v in birthplace_values if v != 'Other']
    translated_marital = preprocess_values(marital_values, 'Marital_Status')

    known_placeholders = ', '.join(['%s'] * len(KNOWN_BIRTHPLACES))
    marital_placeholders = ', '.join(['%s'] * len(translated_marital))

    results = []

    if translated_birthplace:
        val_placeholders = ', '.join(['%s'] * len(translated_birthplace))
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
                   e.Place_of_Birth, e.Marital_Status, c.Offence
            {_join_clause()}
            WHERE e.Place_of_Birth IN ({val_placeholders})
            AND e.Marital_Status IN ({marital_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY e.Place_of_Birth, e.Marital_Status, c.Offence
        """
        cursor.execute(query, translated_birthplace + translated_marital + offence_codes)
        merged_results: dict = {}
        for row in cursor.fetchall():
            birthplace_frontend = BIRTHPLACE_DB_TO_FRONTEND.get(row[1], row[1])
            marital_frontend = MARITAL_STATUS_DB_TO_FRONTEND.get(row[2], row[2])
            offence_str = _resolve_offence_str(row[3], offence_codes_set)
            key = (birthplace_frontend, marital_frontend, offence_str)
            merged_results[key] = merged_results.get(key, 0) + row[0]
        results.extend([
            {"cat1": k[0], "cat2": k[1], "offence": k[2], "count": v}
            for k, v in merged_results.items()
        ])

    if include_other:
        other_query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)),
                   e.Marital_Status, c.Offence
            {_join_clause()}
            WHERE (e.Place_of_Birth NOT IN ({known_placeholders})
                OR e.Place_of_Birth IS NULL)
            AND e.Marital_Status IN ({marital_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY e.Marital_Status, c.Offence
        """
        cursor.execute(other_query, list(KNOWN_BIRTHPLACES) + translated_marital + offence_codes)
        merged_other: dict = {}
        for row in cursor.fetchall():
            marital_frontend = MARITAL_STATUS_DB_TO_FRONTEND.get(row[1], row[1])
            offence_str = _resolve_offence_str(row[2], offence_codes_set)
            key = ("Other", marital_frontend, offence_str)
            merged_other[key] = merged_other.get(key, 0) + row[0]
        results.extend([
            {"cat1": k[0], "cat2": k[1], "offence": k[2], "count": v}
            for k, v in merged_other.items()
        ])

    cursor.close()
    conn.close()
    return results

# Function that takes care of 1 of enlistment year or birth year, as well as 1 of unit, rank, or occupation
def double_compare_single_year(start: int, end: int, year_col: str, cat2_values: list[str], offence_names: list[str], cat2_col: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)

    cat2_placeholders = ', '.join(['%s'] * len(cat2_values))
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    needs_join = year_col in ENLISTMENT_COLS or cat2_col in ENLISTMENT_COLS
    year_ref = f"e.{year_col}" if year_col in ENLISTMENT_COLS else f"c.{year_col}"
    cat2_ref = f"e.{cat2_col}" if cat2_col in ENLISTMENT_COLS else f"c.{cat2_col}"

    if needs_join:
        query = f"""
            SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), {year_ref}, {cat2_ref}, c.Offence
            {_join_clause()}
            WHERE {year_ref} BETWEEN %s AND %s
            AND {cat2_ref} IN ({cat2_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY {year_ref}, {cat2_ref}, c.Offence
        """
    else:
        query = f"""
            SELECT COUNT(*), c.{year_col}, c.{cat2_col}, c.Offence
            FROM ww1_court_martial c
            WHERE c.{year_col} BETWEEN %s AND %s
            AND c.{cat2_col} IN ({cat2_placeholders})
            {_offence_exists_clause(offence_placeholders)}
            GROUP BY c.{year_col}, c.{cat2_col}, c.Offence
        """

    parameters = [start, end] + cat2_values + offence_codes
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"cat1": row[1], "cat2": row[2], "offence": _resolve_offence_str(row[3], offence_codes_set), "count": row[0]} for row in rows]

# Function that takes care of enlistment year + birth year
def double_compare_both_years(enlistment_start: int, enlistment_end: int, birth_start: int, birth_end: int, offence_names: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()

    offence_codes = parse_offence_codes(offence_names)
    offence_codes_set = set(offence_codes)
    offence_placeholders = ', '.join(['%s'] * len(offence_codes))

    query = f"""
        SELECT COUNT(DISTINCT COALESCE(CAST(c.Regiment_number AS TEXT), c.FName || c.LName)), c.Enlistment_Year, e.Year_of_Birth, c.Offence
        {_join_clause()}
        WHERE c.Enlistment_Year BETWEEN %s AND %s
        AND e.Year_of_Birth BETWEEN %s AND %s
        {_offence_exists_clause(offence_placeholders)}
        GROUP BY c.Enlistment_Year, e.Year_of_Birth, c.Offence
    """

    parameters = [enlistment_start, enlistment_end, birth_start, birth_end] + offence_codes
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"cat1": row[1], "cat2": row[2], "offence": _resolve_offence_str(row[3], offence_codes_set), "count": row[0]} for row in rows]
