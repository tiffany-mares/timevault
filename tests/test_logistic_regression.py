import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__),'..','src','backend','database'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__),'..','src','backend','signin'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__),'..','src','backend'))

import pytest
from unittest.mock import patch, MagicMock
import json

@pytest.fixture
def client():
    from route import app
    app.config['TESTING']=True
    return app.test_client()

def _fake_lr_result():
    return {
        "features_used":["Rank","Occupation"],
        "coefficients":[
            {"feature":"Rank_Private","value":0.82},
            {"feature":"Rank_Corporal","value":-0.31},
            {"feature":"Occupation_Labourer","value":0.55},
        ],
        "metrics":{
            "precision":0.65,
            "recall":0.38,
            "accuracy":0.97,
            "auc":0.73
        },
        "model_details":{
            "encoding":"one-hot",
            "train_size":45000,
            "test_size":12000,
            "reference_categories":{"Rank":"Sergeant"}
        }
    }


@patch("route.importlib")
def test_lr_endpoint_no_features(mock_importlib, client):
    mock_module = MagicMock()
    mock_module.run.return_value = _fake_lr_result()
    mock_spec = MagicMock()
    mock_importlib.util.spec_from_file_location.return_value = mock_spec
    mock_importlib.util.module_from_spec.return_value = mock_module

    resp = client.post("/api/run-logistic-regression",
                       data=json.dumps({}), content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "coefficients" in data
    assert "metrics" in data
    assert isinstance(data["metrics"]["auc"], float)

@patch("route.importlib")
def test_lr_with_selected_features(mock_importlib, client):
    mock_module = MagicMock()
    mock_module.run.return_value = _fake_lr_result()
    mock_spec = MagicMock()
    mock_importlib.util.spec_from_file_location.return_value = mock_spec
    mock_importlib.util.module_from_spec.return_value = mock_module

    resp = client.post("/api/run-logistic-regression",
        data=json.dumps({"features": ["Rank", "Enlistment Year"]}),
        content_type="application/json")
    assert resp.status_code == 200


def test_lr_invalid_feature(client):
    resp = client.post("/api/run-logistic-regression",
        data=json.dumps({"features": ["NotAFeature"]}),
        content_type="application/json")
    assert resp.status_code == 400

def test_lr_empty_features(client):
    resp = client.post("/api/run-logistic-regression",
        data=json.dumps({"features":[]}),
        content_type="application/json")
    assert resp.status_code == 400

def test_lr_features_wrong_type(client):
    resp = client.post("/api/run-logistic-regression",
                       data=json.dumps({"features":"Rank"}),
                       content_type="application/json")
    assert resp.status_code == 400


def test_lr_coefficients_structure():
    result = _fake_lr_result()
    for coeff in result["coefficients"]:
        assert "feature" in coeff
        assert "value" in coeff
        assert isinstance(coeff["value"], (int,float))

def test_lr_metrics_range():
    metrics = _fake_lr_result()["metrics"]
    for key in ["precision","recall","accuracy","auc"]:
        assert 0 <= metrics[key] <= 1


def test_lr_all_valid_features_accepted(client):
    valid_features = ["Rank","Unit Type","Birthplace","Occupation",
                      "Marital Status","Enlistment Year","Birth Year"]
    for feat in valid_features:
        resp = client.post("/api/run-logistic-regression",
            data=json.dumps({"features":[feat]}),
            content_type="application/json")
        assert resp.status_code != 400 or "Invalid" not in resp.get_json().get("error","")
