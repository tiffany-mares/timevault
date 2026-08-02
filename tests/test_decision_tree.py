import sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend','database'))
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend','signin'))
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','src','backend'))

import pytest
from unittest.mock import patch,MagicMock
import json


@pytest.fixture
def client():
    from route import app
    app.config['TESTING'] = True
    return app.test_client()


def _fake_dt_result():
    return {
        "tree_lines": ["If Rank = Private:", "  Court Martial: 2.1%"],
        "tree_structure": {"feature":"Rank","threshold":0.5,"left":None,"right":None},
        "baseline_rate": 0.016,
        "findings": ["Rank is the most important feature"],
        "encoding_guide": None,
        "metrics": {"precision":68,"recall":42,"accuracy":97},
        "model_info": {
            "train_size": 45000,
            "test_size": 12000,
            "max_depth": 4,
            "total_leaves": 16,
            "class_weight": "balanced",
            "features": ["Rank","Occupation"]
        }
    }


@patch("route.importlib")
def test_dt_endpoint_no_features(mock_importlib, client):
    mock_module = MagicMock()
    mock_module.run_decision_tree.return_value = _fake_dt_result()

    mock_spec = MagicMock()
    mock_importlib.util.spec_from_file_location.return_value = mock_spec
    mock_importlib.util.module_from_spec.return_value = mock_module

    resp = client.post("/api/run-decision-tree",
        data=json.dumps({}),
        content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "tree_lines" in data
    assert "metrics" in data
    assert "findings" in data
    assert isinstance(data["baseline_rate"],float)

@patch("route.importlib")
def test_dt_endpoint_with_features(mock_importlib,client):
    mock_module = MagicMock()
    mock_module.run_decision_tree.return_value = _fake_dt_result()
    mock_spec = MagicMock()
    mock_importlib.util.spec_from_file_location.return_value = mock_spec
    mock_importlib.util.module_from_spec.return_value = mock_module

    resp = client.post("/api/run-decision-tree",
        data=json.dumps({"features":["Rank","Occupation"]}),
        content_type="application/json")
    assert resp.status_code == 200


def test_dt_invalid_features(client):
    resp = client.post("/api/run-decision-tree",
        data=json.dumps({"features":["InvalidFeature"]}),
        content_type="application/json")
    assert resp.status_code == 400
    assert "Invalid" in resp.get_json()["error"]

def test_dt_empty_features_list(client):
    resp = client.post("/api/run-decision-tree",
        data=json.dumps({"features":[]}),
        content_type="application/json")
    assert resp.status_code == 400

def test_dt_features_not_list(client):
    resp = client.post("/api/run-decision-tree",
        data=json.dumps({"features":"Rank"}),
        content_type="application/json")
    assert resp.status_code == 400


def test_dt_all_valid_features(client):
    valid = ["Rank","Birthplace","Occupation",
             "Marital Status","Enlistment Year","Birth Year"]
    for f in valid:
        resp = client.post("/api/run-decision-tree",
            data=json.dumps({"features":[f]}),
            content_type="application/json")
        assert resp.status_code == 200, f"{f} -> {resp.status_code}: {resp.get_data(as_text=True)[:200]}"
        assert "tree_lines" in resp.get_json()


def test_dt_unit_type_rejected(client):
    # Unit Type is not a supported decision-tree feature; must be cleanly
    # rejected (400), never a 500 crash.
    resp = client.post("/api/run-decision-tree",
        data=json.dumps({"features":["Unit Type"]}),
        content_type="application/json")
    assert resp.status_code == 400
    assert "Invalid" in resp.get_json()["error"]
