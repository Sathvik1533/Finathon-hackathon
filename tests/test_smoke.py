"""Smoke and integrity tests for Finathon CI/CD pipeline."""

import glob
import os
import yaml
from fastapi.testclient import TestClient
from src import __version__
from src.app import app


def test_app_version():
    """Verify application version is defined and non-empty."""
    assert __version__ is not None
    assert len(__version__) > 0


def test_root_endpoint():
    """Verify root endpoint responds with 200 OK and expected payload."""
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Finathon Hackathon API"
    assert data["status"] == "online"
    assert data["version"] == __version__


def test_health_check_endpoint():
    """Verify health endpoint responds with 200 OK and healthy status."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["ready"] is True
    assert data["version"] == __version__


def test_github_workflows_yaml_syntax():
    """Verify all GitHub Actions workflow YAML files are strictly valid syntax."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    workflow_dir = os.path.join(repo_root, ".github", "workflows")
    yaml_files = glob.glob(os.path.join(workflow_dir, "*.yml")) + glob.glob(os.path.join(workflow_dir, "*.yaml"))

    assert len(yaml_files) >= 2, f"Expected at least 2 workflow files, found {len(yaml_files)}"

    for yf in yaml_files:
        with open(yf, "r", encoding="utf-8") as f:
            content = yaml.safe_load(f)
            assert content is not None, f"Workflow file {yf} parsed to empty content"
            assert "name" in content, f"Workflow file {yf} missing 'name' key"
            assert "jobs" in content, f"Workflow file {yf} missing 'jobs' key"


def test_no_sensitive_files_tracked():
    """Verify that credentials or sensitive files are not accidentally committed."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    forbidden_files = [".env", ".env.local", "credentials.json", "id_rsa"]
    for forbidden in forbidden_files:
        full_path = os.path.join(repo_root, forbidden)
        assert not os.path.exists(full_path), f"Sensitive file {forbidden} should not exist in repository root!"
