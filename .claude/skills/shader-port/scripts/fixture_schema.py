#!/usr/bin/env python3
"""Helpers for the shader-port fixture schema."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


SCHEMA_PATH = Path(__file__).resolve().parent.parent / "assets" / "fixture-schema.json"


def _require_object(value: object, label: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def _require_string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{label} must be a non-empty list")

    result: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"{label}[{index}] must be a non-empty string")
        result.append(item)
    return result


def _require_string_map(value: object, label: str) -> dict[str, str]:
    raw = _require_object(value, label)
    result: dict[str, str] = {}
    for key, item in raw.items():
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"{label}.{key} must be a non-empty string")
        result[str(key)] = item
    return result


def _require_nested_string_map(value: object, label: str) -> dict[str, dict[str, str]]:
    raw = _require_object(value, label)
    result: dict[str, dict[str, str]] = {}
    for key, item in raw.items():
        result[str(key)] = _require_string_map(item, f"{label}.{key}")
    return result


@lru_cache(maxsize=1)
def load_fixture_schema() -> dict[str, object]:
    data = json.loads(SCHEMA_PATH.read_text())
    if not isinstance(data, dict):
        raise ValueError("shader-port fixture schema must be a top-level object")
    return data


def fixture_option_lists() -> dict[str, list[str]]:
    schema = load_fixture_schema()
    options = _require_object(schema.get("option_lists"), "option_lists")
    return {
        key: _require_string_list(value, f"option_lists.{key}")
        for key, value in options.items()
    }


def fixture_report_lists() -> dict[str, list[str]]:
    schema = load_fixture_schema()
    report = _require_object(schema.get("report"), "report")
    return {
        key: _require_string_list(value, f"report.{key}")
        for key, value in report.items()
    }


def route_to_status_map() -> dict[str, str]:
    schema = load_fixture_schema()
    return _require_string_map(schema.get("route_to_status"), "route_to_status")


def primary_contract_to_backend_promises_map() -> dict[str, dict[str, str]]:
    schema = load_fixture_schema()
    return _require_nested_string_map(
        schema.get("primary_contract_to_backend_promises"),
        "primary_contract_to_backend_promises",
    )
