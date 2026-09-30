"""Smoke and integrity tests for Finathon CI/CD pipeline."""

import glob
import os
import re
import subprocess
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
    yaml_files = sorted(glob.glob(os.path.join(workflow_dir, "*.yml")) + glob.glob(os.path.join(workflow_dir, "*.yaml")))

    assert len(yaml_files) >= 3, f"Expected at least 3 workflow files (ci, cd, codeql), found {len(yaml_files)}"

    for yf in yaml_files:
        with open(yf, "r", encoding="utf-8") as f:
            content = yaml.safe_load(f)
            assert content is not None, f"Workflow file {yf} parsed to empty content"
            assert "name" in content, f"Workflow file {yf} missing 'name' key"
            assert "jobs" in content, f"Workflow file {yf} missing 'jobs' key"
            assert ("on" in content or True in content), f"Workflow file {yf} missing trigger 'on' key"


def test_gitleaks_configuration_present():
    """Verify .gitleaks.toml configuration exists and contains required rules."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    gitleaks_path = os.path.join(repo_root, ".gitleaks.toml")
    assert os.path.isfile(gitleaks_path), ".gitleaks.toml must exist in repo root"

    with open(gitleaks_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "nova-api-key" in content, "Missing nova-api-key rule in .gitleaks.toml"
    assert "razorpay-key-id" in content, "Missing razorpay-key-id rule in .gitleaks.toml"
    assert "allowlist" in content, "Missing allowlist in .gitleaks.toml"


def test_no_sensitive_files_tracked():
    """Verify that credentials or sensitive files are not accidentally committed across repository."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Query git ls-files if inside a git repository
    try:
        proc = subprocess.run(
            ["git", "ls-files"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True
        )
        tracked_files = proc.stdout.strip().splitlines()
    except Exception:
        tracked_files = []

    # Regex for sensitive filenames, excluding benign examples (.env.example, .env.sample, .env.template)
    forbidden_pattern = re.compile(r"(^|/)(\.env(\..+)?|.*\.pem|.*\.key|.*id_rsa.*|.*credentials\.json)$")
    template_pattern = re.compile(r"\.env\.(example|sample|template)$")

    for f in tracked_files:
        if template_pattern.search(f):
            continue
        assert not forbidden_pattern.search(f), f"Sensitive file tracked in git: {f}"


def test_dockerfile_security_and_health():
    """Verify Dockerfile enforces non-root user execution and health check."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dockerfile_path = os.path.join(repo_root, "Dockerfile")
    assert os.path.isfile(dockerfile_path), "Dockerfile must exist in repo root"

    with open(dockerfile_path, "r", encoding="utf-8") as f:
        dockerfile = f.read()

    assert "USER " in dockerfile, "Dockerfile must declare a non-root USER"
    assert "HEALTHCHECK " in dockerfile, "Dockerfile must declare a HEALTHCHECK directive"
