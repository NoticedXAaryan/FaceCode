"""Robot Framework library wrapping FaceTag Node logic modules."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from robot.api.deco import keyword, library


ROOT = Path(__file__).resolve().parents[2]


def _as_json(value):
    if value is None:
        return "null"
    if isinstance(value, (dict, list, int, float, bool)):
        return json.dumps(value)
    text = str(value).strip()
    if text in ("", "None", "null", "NONE"):
        return "null"
    return text


@library(scope="GLOBAL", auto_keywords=False)
class FaceTagLogic:
    """Call FaceTag CommonJS logic from Robot keywords."""

    def _node_eval(self, expression: str):
        script = f"""
const username = require('./logic/username');
const profile = require('./logic/profile');
const onboarding = require('./logic/onboarding');
const result = ({expression});
process.stdout.write(JSON.stringify(result));
"""
        proc = subprocess.run(
            ["node", "-e", script],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            raise AssertionError(proc.stderr.strip() or proc.stdout.strip() or "node failed")
        return json.loads(proc.stdout)

    @keyword("Normalize Username")
    def normalize_username(self, value: str) -> str:
        return self._node_eval(f"username.normalizeUsername({json.dumps(value)})")

    @keyword("Validate Username")
    def validate_username(self, value: str):
        return self._node_eval(f"username.validateUsername({json.dumps(value)})")

    @keyword("Username Should Be Valid")
    def username_should_be_valid(self, value: str) -> str:
        result = self.validate_username(value)
        if not result.get("ok"):
            raise AssertionError(result.get("error") or f"invalid username: {value}")
        return result["username"]

    @keyword("Username Should Be Invalid")
    def username_should_be_invalid(self, value: str):
        result = self.validate_username(value)
        if result.get("ok"):
            raise AssertionError(f"expected invalid username, got {result}")
        return result

    @keyword("Merge Profile")
    def merge_profile(self, existing, patch, email: str):
        return self._node_eval(
            f"profile.mergeProfile({_as_json(existing)}, {_as_json(patch)}, {json.dumps(email)})"
        )

    @keyword("Profile Completion")
    def profile_completion(self, profile) -> bool:
        return bool(self._node_eval(f"profile.hasCompletedProfile({_as_json(profile)})"))

    @keyword("Onboarding Route For")
    def onboarding_route_for(self, has_face: str, has_profile: str) -> str:
        status = {
            "hasFace": str(has_face).lower() in ("true", "1", "yes"),
            "hasProfile": str(has_profile).lower() in ("true", "1", "yes"),
        }
        return self._node_eval(f"onboarding.routeForStatus({json.dumps(status)})")

    @keyword("Analyze Synthetic Face")
    def analyze_synthetic_face(self, kind: str = "face"):
        proc = subprocess.run(
            ["node", str(ROOT / "robot/tools/analyze_face.mjs"), kind],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            raise AssertionError(proc.stderr.strip() or proc.stdout.strip() or "face analysis failed")
        return json.loads(proc.stdout)

    @keyword("Run Node Test File")
    def run_node_test_file(self, relative_path: str):
        path = ROOT / relative_path
        proc = subprocess.run(
            ["node", "--test", str(path)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            raise AssertionError(proc.stdout + "\n" + proc.stderr)
        return proc.stdout

    @keyword("Project Root")
    def project_root(self) -> str:
        return str(ROOT)

    @keyword("Env Or Default")
    def env_or_default(self, name: str, default: str = "") -> str:
        return os.environ.get(name, default)
