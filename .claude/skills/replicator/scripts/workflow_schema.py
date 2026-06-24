#!/usr/bin/env python3
"""Helpers for the replicator workflow schema."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


SCHEMA_PATH = Path(__file__).resolve().parent.parent / "assets" / "workflow-schema.json"


def _require_object(value: object, label: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def _require_string_map(value: object, label: str) -> dict[str, str]:
    raw = _require_object(value, label)
    result: dict[str, str] = {}
    for key, item in raw.items():
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"{label}.{key} must be a non-empty string")
        result[str(key)] = item
    return result


def _require_string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{label} must be a non-empty list")

    result: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"{label}[{index}] must be a non-empty string")
        result.append(item)
    return result


@lru_cache(maxsize=1)
def load_workflow_schema() -> dict[str, object]:
    data = json.loads(SCHEMA_PATH.read_text())
    if not isinstance(data, dict):
        raise ValueError("workflow schema must be a top-level object")
    return data


def workflow_defaults() -> dict[str, str]:
    schema = load_workflow_schema()
    return _require_string_map(schema.get("defaults"), "defaults")


def workflow_option_lists() -> dict[str, list[str]]:
    schema = load_workflow_schema()
    options = _require_object(schema.get("option_lists"), "option_lists")
    return {
        key: _require_string_list(value, f"option_lists.{key}")
        for key, value in options.items()
    }


def workflow_list(path: str) -> list[str]:
    current: object = load_workflow_schema()
    for segment in path.split("."):
        current = _require_object(current, path).get(segment)
    return _require_string_list(current, path)


def format_option_list(values: list[str]) -> str:
    return "/".join(values)
