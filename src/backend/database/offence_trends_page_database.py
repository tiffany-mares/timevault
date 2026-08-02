# This file provides the required database operations for the offence trends page
from helper import get_db_connection, parse_offence_codes, OFFENCE_LOOKUP, ENLISTMENT_COLS, _join_clause, KNOWN_BIRTHPLACES, BIRTHPLACE_DB_TO_FRONTEND

# Helper to build shared WHERE conditions and parameters for all trends queries
def _build_conditions(year_start: int, year_end: int, ranks: list[str], units: list[str], offence_codes: list[str]):
    conditions = ["c.Enlistment_Year BETWEEN %s AND %s"]
    parameters = [year_start, year_end]
 
    if ranks:
        conditions.append(f"c.Rank IN ({', '.join(['%s'] * len(ranks))})")
        parameters.extend(ranks)
    if units:
        conditions.append(f"c.Unit_Type IN ({', '.join(['%s'] * len(units))})")
        parameters.extend(units)
    if offence_codes:
        conditions.append(f"""EXISTS (
            SELECT 1 FROM unnest(string_to_array(c.Offence, ', ')) AS code
            WHERE code IN ({', '.join(['%s'] * len(offence_codes))})
        )""")
        parameters.extend(offence_codes)
 
    return " AND ".join(conditions), parameters
 
# Returns the most common offences and their counts, sorted descending
def get_common_offences(year_start: int, year_end: int, ranks: list[str], units: list[str], offence_codes: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()
 
    offence_codes_set = set(offence_codes) if offence_codes else None
    where_clause, parameters = _build_conditions(year_start, year_end, ranks, units, offence_codes)
 
    query = f"""
        SELECT unnest(string_to_array(c.Offence, ', ')) AS code, COUNT(*) AS cnt
        FROM ww1_court_martial c
        WHERE {where_clause}
        GROUP BY code
        ORDER BY cnt DESC
    """
 
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
 
    results = []
    for row in rows:
        code = row[0].strip()
        if offence_codes_set and code not in offence_codes_set:
            continue
        name = OFFENCE_LOOKUP.get(code)
        if name:
            results.append({"name": name, "value": row[1]})
    return results
 
# Returns offences as a percentage of total, sorted descending
def get_offence_distribution(year_start: int, year_end: int, ranks: list[str], units: list[str], offence_codes: list[str]):
    rows = get_common_offences(year_start, year_end, ranks, units, offence_codes)
    if not rows:
        return []

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM ww1_court_martial")
    total = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    if total == 0:
        return []

    return [{"name": r["name"], "value": round(r["value"] / total * 100, 3)} for r in rows]
 
# Returns offence counts grouped by enlistment year for trend analysis
def get_trends_over_time(year_start: int, year_end: int, ranks: list[str], units: list[str], offence_codes: list[str]):
    conn = get_db_connection()
    cursor = conn.cursor()
 
    offence_codes_set = set(offence_codes) if offence_codes else None
    where_clause, parameters = _build_conditions(year_start, year_end, ranks, units, offence_codes)
 
    query = f"""
        SELECT c.Enlistment_Year, unnest(string_to_array(c.Offence, ', ')) AS code, COUNT(*) AS cnt
        FROM ww1_court_martial c
        WHERE {where_clause}
        GROUP BY c.Enlistment_Year, code
        ORDER BY c.Enlistment_Year
    """
 
    cursor.execute(query, parameters)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
 
    # Build [{ year: "1915", "12 - Desertion": 310, ... }]
    year_map: dict = {}
    for row in rows:
        year = str(row[0])
        code = row[1].strip()
        count = row[2]
        if offence_codes_set and code not in offence_codes_set:
            continue
        name = OFFENCE_LOOKUP.get(code)
        if not name:
            continue
        if year not in year_map:
            year_map[year] = {"year": year}
        year_map[year][name] = year_map[year].get(name, 0) + count
 
    return list(year_map.values())
 
# Returns offence counts grouped by a chosen dimension (rank, unit, occupation, birthplace)
def get_breakdown_by_group(year_start: int, year_end: int, ranks: list[str], units: list[str], offence_codes: list[str], group_by: str):
    conn = get_db_connection()
    cursor = conn.cursor()
 
    offence_codes_set = set(offence_codes) if offence_codes else None
    where_clause, parameters = _build_conditions(year_start, year_end, ranks, units, offence_codes)
 
    group_col_map = {
        "rank":       ("c.Rank",           False),
        "unit":       ("c.Unit_Type",       False),
        "occupation": ("e.Occupation",      True),
        "birthplace": ("e.Place_of_Birth",  True),
    }
 
    group_col, needs_join = group_col_map.get(group_by, ("c.Rank", False))
    group_map: dict = {}
 
    # Birthplace needs special handling - known places + "Other" bucket
    if group_by == "birthplace":
        known_placeholders = ', '.join(['%s'] * len(KNOWN_BIRTHPLACES))
 
        # Query for known birthplaces
        known_query = f"""
            SELECT e.Place_of_Birth, unnest(string_to_array(c.Offence, ', ')) AS code, COUNT(*) AS cnt
            {_join_clause()}
            WHERE e.Place_of_Birth IN ({known_placeholders})
            AND {where_clause}
            GROUP BY e.Place_of_Birth, code
            ORDER BY e.Place_of_Birth
        """
        cursor.execute(known_query, list(KNOWN_BIRTHPLACES) + parameters)
        for row in cursor.fetchall():
            group = BIRTHPLACE_DB_TO_FRONTEND.get(row[0], row[0])
            code = row[1].strip()
            count = row[2]
            if offence_codes_set and code not in offence_codes_set:
                continue
            name = OFFENCE_LOOKUP.get(code)
            if not name or not group:
                continue
            if group not in group_map:
                group_map[group] = {"group": group}
            group_map[group][name] = group_map[group].get(name, 0) + count
 
        # Query for "Other" - everything not in the known list
        other_query = f"""
            SELECT unnest(string_to_array(c.Offence, ', ')) AS code, COUNT(*) AS cnt
            {_join_clause()}
            WHERE (e.Place_of_Birth NOT IN ({known_placeholders})
                OR e.Place_of_Birth IS NULL)
            AND {where_clause}
            GROUP BY code
        """
        cursor.execute(other_query, list(KNOWN_BIRTHPLACES) + parameters)
        for row in cursor.fetchall():
            code = row[0].strip()
            count = row[1]
            if offence_codes_set and code not in offence_codes_set:
                continue
            name = OFFENCE_LOOKUP.get(code)
            if not name:
                continue
            if "Other" not in group_map:
                group_map["Other"] = {"group": "Other"}
            group_map["Other"][name] = group_map["Other"].get(name, 0) + count
 
    else:
        if needs_join:
            query = f"""
                SELECT {group_col}, unnest(string_to_array(c.Offence, ', ')) AS code, COUNT(*) AS cnt
                {_join_clause()}
                WHERE {where_clause}
                GROUP BY {group_col}, code
                ORDER BY {group_col}
            """
        else:
            query = f"""
                SELECT {group_col}, unnest(string_to_array(c.Offence, ', ')) AS code, COUNT(*) AS cnt
                FROM ww1_court_martial c
                WHERE {where_clause}
                GROUP BY {group_col}, code
                ORDER BY {group_col}
            """
 
        cursor.execute(query, parameters)
        rows = cursor.fetchall()
        for row in rows:
            group = row[0]
            code = row[1].strip()
            count = row[2]
            if offence_codes_set and code not in offence_codes_set:
                print(f"SKIPPING: group={group}, code={code}")
                continue
            name = OFFENCE_LOOKUP.get(code)
            if not name or not group:
                continue
            if group not in group_map:
                group_map[group] = {"group": group}
            group_map[group][name] = group_map[group].get(name, 0) + count
 
    cursor.close()
    conn.close()
    result = list(group_map.values())
    return list(group_map.values())
 