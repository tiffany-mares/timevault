import sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend','database'))
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend','signin'))
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend'))

import pytest
from unittest.mock import patch
import json


@pytest.fixture
def client():
    from route import app
    app.config['TESTING']=True
    return app.test_client()


@patch("route.single_compare_list")
def test_single_compare_rank(mock_fn, client):
    mock_fn.return_value = [{"rank":"Private","offence":"12 - Desertion","count":50}]

    resp = client.post("/api/compare", data=json.dumps({
        "mode":"single", "cat1":"Rank",
        "groupA":{"cat1Values":["Private"],"offences":["12 - Desertion"]},
        "groupB":{"cat1Values":["Corporal"],"offences":["12 - Desertion"]}
    }), content_type="application/json")

    assert resp.status_code == 200
    data = resp.get_json()
    assert "groupA" in data
    assert "groupB" in data


@patch("route.single_compare_year")
def test_single_compare_year(mock_fn, client):
    mock_fn.return_value = [{"year":"1916","offence":"19 - Drunkenness","count":30}]

    resp = client.post("/api/compare", data=json.dumps({
        "mode":"single","cat1":"Enlistment Year",
        "groupA":{"start":1914,"end":1916,"offences":["19 - Drunkenness"]},
        "groupB":{"start":1916,"end":1918,"offences":["19 - Drunkenness"]}
    }), content_type="application/json")
    assert resp.status_code == 200

@patch("route.single_compare_place_of_birth")
def test_single_compare_birthplace(mock_fn, client):
    mock_fn.return_value = [{"place_of_birth":"Ontario","offence":"12 - Desertion","count":10}]

    resp = client.post("/api/compare",data=json.dumps({
        "mode":"single","cat1":"Place of Birth",
        "groupA":{"cat1Values":["Ontario"],"offences":["12 - Desertion"]},
        "groupB":{"cat1Values":["Quebec"],"offences":["12 - Desertion"]}
    }),content_type="application/json")
    assert resp.status_code==200

@patch("route.single_compare_marital_status")
def test_single_compare_marital(mock_fn,client):
    mock_fn.return_value = [{"marital_status":"Yes","offence":"19 - Drunkenness","count":5}]
    resp = client.post("/api/compare",data=json.dumps({
        "mode":"single","cat1":"Marital Status",
        "groupA":{"cat1Values":["Married"],"offences":["19 - Drunkenness"]},
        "groupB":{"cat1Values":["Single"],"offences":["19 - Drunkenness"]}
    }),content_type="application/json")
    assert resp.status_code == 200


@patch("route.double_compare")
def test_double_compare_basic(mock_fn,client):
    mock_fn.return_value = [{"cat1":"Private","cat2":"Infantry","offence":"12 - Desertion","count":20}]

    resp = client.post("/api/compare",data=json.dumps({
        "mode":"double","cat1":"Rank","cat2":"Unit Type",
        "groupA":{"cat1Values":["Private"],"cat2Values":["Infantry"],"offences":["12 - Desertion"]},
        "groupB":{"cat1Values":["Corporal"],"cat2Values":["Artillery"],"offences":["12 - Desertion"]}
    }),content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "groupA" in data and "groupB" in data


@patch("route.double_compare_both_years")
def test_double_compare_both_years(mock_fn, client):
    mock_fn.return_value = [{"cat1":"1915","cat2":"1890","offence":"12 - Desertion","count":5}]
    resp = client.post("/api/compare",data=json.dumps({
        "mode":"double","cat1":"Enlistment Year","cat2":"Year of Birth",
        "groupA":{"start":1914,"end":1916,"start2":1880,"end2":1900,"offences":["12 - Desertion"]},
        "groupB":{"start":1916,"end":1918,"start2":1880,"end2":1900,"offences":["12 - Desertion"]}
    }),content_type="application/json")
    assert resp.status_code == 200


def test_compare_missing_fields(client):
    resp = client.post("/api/compare",
        data=json.dumps({"mode":"single"}),
        content_type="application/json")
    assert resp.status_code == 400


def test_compare_unknown_category(client):
    resp = client.post("/api/compare", data=json.dumps({
        "mode":"single","cat1":"FavoriteColor",
        "groupA":{"cat1Values":["Blue"],"offences":[]},
        "groupB":{"cat1Values":["Red"],"offences":[]}
    }),content_type="application/json")
    assert resp.status_code == 400
