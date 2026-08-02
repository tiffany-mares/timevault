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


def _fake_nb_result():
    return {
        "model":"naive_bayes",
        "mode":"pattern_discovery",
        "total_records": 11247,
        "features_used":["rank","unit_type","enlistment_year"],
        "classes":{
            "Absence/Desertion":{
                "prior":0.35,"count":3900,
                "features":{
                    "rank":{
                        "significant":["Private"],
                        "top_values":[{"value":"Private","probability":0.91,"lift":1.05}],
                        "overrepresented":[{"value":"Private","lift":1.05}],
                        "underrepresented":[{"value":"Captain","lift":0.2}],
                        "full_distribution":[{"value":"Private","probability":0.91}]
                    }
                }
            },
            "Drunkenness":{
                "prior":0.28,"count":3100,
                "features":{
                    "rank":{
                        "significant":["Private","Corporal"],
                        "top_values":[{"value":"Private","probability":0.88,"lift":1.02}],
                        "overrepresented":[],
                        "underrepresented":[],
                        "full_distribution":[{"value":"Private","probability":0.88}]
                    }
                }
            }
        }
    }


@patch("route.importlib")
def test_nb_endpoint_no_features(mock_importlib,client):
    mock_module = MagicMock()
    mock_module.run.return_value = _fake_nb_result()
    mock_spec = MagicMock()
    mock_importlib.util.spec_from_file_location.return_value = mock_spec
    mock_importlib.util.module_from_spec.return_value = mock_module

    resp = client.post("/api/run-naive-bayes",
        data=json.dumps({}),content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["model"] == "naive_bayes"
    assert "classes" in data
    assert data["total_records"] > 0

@patch("route.importlib")
def test_nb_with_features(mock_importlib, client):
    mock_module = MagicMock()
    mock_module.run.return_value = _fake_nb_result()
    mock_spec = MagicMock()
    mock_importlib.util.spec_from_file_location.return_value = mock_spec
    mock_importlib.util.module_from_spec.return_value = mock_module

    resp = client.post("/api/run-naive-bayes",
        data=json.dumps({"features":["Rank","Unit Type"]}),
        content_type="application/json")
    assert resp.status_code == 200


def test_nb_invalid_feature(client):
    resp = client.post("/api/run-naive-bayes",
        data=json.dumps({"features":["Occupation"]}),
        content_type="application/json")
    assert resp.status_code == 400

def test_nb_empty_features(client):
    resp = client.post("/api/run-naive-bayes",
                       data=json.dumps({"features":[]}),
                       content_type="application/json")
    assert resp.status_code == 400

def test_nb_features_not_list(client):
    resp = client.post("/api/run-naive-bayes",
        data=json.dumps({"features":"Rank"}),
        content_type="application/json")
    assert resp.status_code == 400


def test_nb_only_allows_three_features(client):
    allowed = ["Rank","Unit Type","Enlistment Year"]
    not_allowed = ["Birthplace","Occupation","Marital Status","Birth Year"]

    for f in allowed:
        resp = client.post("/api/run-naive-bayes",
            data=json.dumps({"features":[f]}),
            content_type="application/json")
        assert resp.status_code != 400, f"should allow {f}"

    for f in not_allowed:
        resp = client.post("/api/run-naive-bayes",
            data=json.dumps({"features": [f]}),
            content_type="application/json")
        assert resp.status_code == 400, f"should reject {f}"


def test_nb_result_structure():
    result = _fake_nb_result()
    assert "classes" in result
    for class_name, class_data in result["classes"].items():
        assert "prior" in class_data
        assert "count" in class_data
        assert isinstance(class_data["prior"], float)
        assert 0 <= class_data["prior"] <= 1
        assert "features" in class_data

def test_nb_lift_values():
    result = _fake_nb_result()
    for cls_name,cls in result["classes"].items():
        for feat_name,feat in cls["features"].items():
            for tv in feat["top_values"]:
                assert "lift" in tv
                assert tv["lift"] >= 0
