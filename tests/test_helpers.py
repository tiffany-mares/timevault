import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend', 'database'))

from helper import (
    parse_offence_codes, codes_to_names, parse_multi_offence,
    preprocess_values, OFFENCE_LOOKUP, _resolve_offence_str
)


def test_parse_offence_codes_basic():
    names = ["12 - Desertion", "19 - Drunkenness"]
    result = parse_offence_codes(names)
    assert result == ["12", "19"]

def test_parse_offence_codes_single():
    assert parse_offence_codes(["4 - Offences in relation to the enemy punishable with death"]) == ["4"]

def test_parse_offence_codes_empty():
    assert parse_offence_codes([]) == []


def test_codes_to_names():
    codes = ["12","19","40"]
    result = codes_to_names(codes)
    assert result[0] == "12 - Desertion"
    assert result[1] == "19 - Drunkenness"
    assert "40" in result[2]

def test_codes_to_names_unknown():
    result = codes_to_names(["999"])
    assert result == ["999"]


def test_parse_multi_offence():
    result = parse_multi_offence("12, 19, 40")
    assert len(result) == 3
    assert result[0] == "12"
    assert result[1] == "19"
    assert result[2] == "40"

def test_parse_multi_offence_single():
    assert parse_multi_offence("12") == ["12"]


def test_preprocess_values_marital_married():
    result = preprocess_values(["Married"], "Marital_Status")
    assert result == ["Yes"]

def test_preprocess_values_marital_single():
    result = preprocess_values(["Single"], "Marital_Status")
    assert "No" in result
    assert "Single" in result

def test_preprocess_values_non_marital():
    vals = ["Private", "Corporal"]
    result = preprocess_values(vals, "Rank")
    assert result == vals

def test_preprocess_values_mixed_marital():
    result = preprocess_values(["Married","Single"], "Marital_Status")
    assert "Yes" in result
    assert "No" in result


def test_offence_lookup_has_expected_keys():
    assert "12" in OFFENCE_LOOKUP
    assert "19" in OFFENCE_LOOKUP
    assert "40" in OFFENCE_LOOKUP
    assert "155" in OFFENCE_LOOKUP

def test_offence_lookup_values_format():
    for code, name in OFFENCE_LOOKUP.items():
        assert code in name
        assert " - " in name


def test_resolve_offence_str_filters():
    offence_str = "12, 19, 40"
    codes_set = {"12", "40"}
    result = _resolve_offence_str(offence_str, codes_set)
    assert "12" in result
    assert "40" in result
    assert "19" not in result

def test_resolve_offence_str_all_codes():
    result = _resolve_offence_str("19", {"19"})
    assert "Drunkenness" in result

def test_resolve_offence_str_no_match():
    result = _resolve_offence_str("12, 19", {"40"})
    assert result == ""
