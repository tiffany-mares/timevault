import sys, os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend','database'))
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend','signin'))
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend'))

import pytest
from unittest.mock import patch
import json


@pytest.fixture
def client():
    from route import app
    app.config['TESTING'] = True
    return app.test_client()


@patch("route.get_common_offences")
@patch("route.get_offence_distribution")
@patch("route.get_trends_over_time")
@patch("route.get_breakdown_by_group")
def test_trends_default_params(mock_group, mock_time, mock_dist, mock_common, client):
    mock_common.return_value = [{"name": "19 - Drunkenness", "value": 500}]
    mock_dist.return_value = [{"name": "19 - Drunkenness", "value": 45.2}]
    mock_time.return_value = [{"year": "1916", "19 - Drunkenness": 200}]
    mock_group.return_value = [{"group": "Private", "19 - Drunkenness": 400}]

    resp = client.post("/api/trends",
        data=json.dumps({}),
        content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "commonOffences" in data
    assert "distribution" in data
    assert "trendsOverTime" in data
    assert "byGroup" in data

    mock_common.assert_called_once_with(1914, 1918, [], [], [])

@patch("route.get_common_offences")
@patch("route.get_offence_distribution")
@patch("route.get_trends_over_time")
@patch("route.get_breakdown_by_group")
def test_trends_with_filters(mock_group, mock_time, mock_dist, mock_common, client):
    mock_common.return_value = []
    mock_dist.return_value = []
    mock_time.return_value = []
    mock_group.return_value = []

    resp = client.post("/api/trends",
        data=json.dumps({
            "yearStart": 1915,
            "yearEnd": 1917,
            "ranks": ["Private"],
            "units": ["Infantry"],
            "offenceCodes": ["12"]
        }),
        content_type="application/json")

    assert resp.status_code == 200
    mock_common.assert_called_once_with(1915, 1917, ["Private"], ["Infantry"], ["12"])


@patch("route.get_common_offences")
@patch("route.get_offence_distribution")
@patch("route.get_trends_over_time")
@patch("route.get_breakdown_by_group")
def test_trends_response_structure(mock_group, mock_time, mock_dist, mock_common, client):
    mock_common.return_value = [
        {"name":"12 - Desertion","value":100},
        {"name":"19 - Drunkenness","value":200}
    ]
    mock_dist.return_value = [
        {"name":"12 - Desertion","value":30.5}
    ]
    mock_time.return_value = [
        {"year":"1914","12 - Desertion":20},
        {"year":"1915","12 - Desertion":80}
    ]
    mock_group.return_value = [{"group":"Private","12 - Desertion":90}]

    resp = client.post("/api/trends",
        data=json.dumps({"yearStart":1914,"yearEnd":1918}),
        content_type="application/json")

    data = resp.get_json()
    assert len(data["commonOffences"]) == 2
    assert data["commonOffences"][0]["name"] == "12 - Desertion"
    assert isinstance(data["byGroup"]["rank"], list)
    assert isinstance(data["byGroup"]["unit"], list)
    assert isinstance(data["byGroup"]["occupation"], list)
    assert isinstance(data["byGroup"]["birthplace"], list)


@patch("route.get_common_offences")
@patch("route.get_offence_distribution")
@patch("route.get_trends_over_time")
@patch("route.get_breakdown_by_group")
def test_trends_empty_results(mock_group, mock_time, mock_dist, mock_common, client):
    mock_common.return_value = []
    mock_dist.return_value = []
    mock_time.return_value = []
    mock_group.return_value = []

    resp = client.post("/api/trends",
        data=json.dumps({"yearStart":1914,"yearEnd":1914,"ranks":["General"]}),
        content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["commonOffences"] == []
    assert data["trendsOverTime"] == []
