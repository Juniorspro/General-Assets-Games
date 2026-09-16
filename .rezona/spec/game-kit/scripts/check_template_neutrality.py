#!/usr/bin/env python3
"""Check template starter files for strong gameplay defaults.

This is a lightweight repository check for template optimization work. It does
not validate generated games; it only guards starter templates against shipping
visible arcade-style defaults such as scoreboards, generic failure copy, and
enemy/pickup examples.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

VALID_MODES = ("2d", "ar", "vr", "3d")
TEMPLATES_ROOT = Path(__file__).resolve().parents[1] / "templates"
PLUGIN_ROOT = TEMPLATES_ROOT.parent

GLOBAL_RULES = {
    "skills/game-kit/SKILL.md": [
        (
            re.compile(r"green\s+`build_game`\s+is\s+NOT\s+done", re.IGNORECASE),
            "game-kit done contract should not be build-only; validate_workspace must be a required gate",
        ),
        (
            re.compile(r"ONLY\s+sanctioned\s+way\s+to\s+build", re.IGNORECASE),
            "build_game should not be described as the only completion gate",
        ),
    ],
    "skills/game-kit/references/rendering/render-3d.md": [
        (
            re.compile(r"\bowns\s+the\s+player\b", re.IGNORECASE),
            "3D reference should not frame the default subject as a player",
        ),
        (
            re.compile(r"\bcollectibles?/rewards?/hazards?\b", re.IGNORECASE),
            "3D reference should not frame repeated objects as collectibles/rewards/hazards",
        ),
    ],
    "scripts/seed_template.py": [
        (
            re.compile(r"Win\s*/\s*Lose", re.IGNORECASE),
            "starter brief should not default to win/lose framing",
        ),
        (
            re.compile(r"\bfailure conditions\b", re.IGNORECASE),
            "starter brief should not default to failure conditions",
        ),
        (
            re.compile(r"\bscoring\b", re.IGNORECASE),
            "starter brief should not default to scoring",
        ),
    ],
}

COMMON_2D_RULES = {
    "src/game/controller.ts": [
        (
            re.compile(r"\bplayer\b", re.IGNORECASE),
            "controller examples should avoid player-specific defaults",
        ),
        (
            re.compile(r"\bhp\b", re.IGNORECASE),
            "controller examples should avoid combat-health defaults",
        ),
        (
            re.compile(r"\btick(?:Spawn|Movement|Collision)\b"),
            "controller should not wire optional scaffold systems by default",
        ),
    ],
    "src/game/ui/Hud.tsx": [
        (
            re.compile(r"\bscore\b", re.IGNORECASE),
            "HUD should not default to score copy/state",
        ),
        (
            re.compile(r"Game\s+Over", re.IGNORECASE),
            "HUD should not default to Game Over copy",
        ),
        (
            re.compile(r"\bRestart\b", re.IGNORECASE),
            "HUD should not default to restart copy",
        ),
    ],
}

MODE_RULES = {
    "2d": {
        "src/game/state.ts": [
            (
                re.compile(r"\bscore\s*:"),
                "state should not define a default score field",
            ),
            (
                re.compile(r"\bplayer\b", re.IGNORECASE),
                "state examples should avoid player-specific defaults",
            ),
            (
                re.compile(r"\bbullets?\b", re.IGNORECASE),
                "state examples should avoid bullet examples",
            ),
            (
                re.compile(r"\benemies\b", re.IGNORECASE),
                "state examples should avoid enemy examples",
            ),
        ],
        "src/game/systems/render.ts": [
            (
                re.compile(r"\bbullets?\b", re.IGNORECASE),
                "render examples should avoid bullet examples",
            ),
        ],
        **COMMON_2D_RULES,
    },
    "ar": {
        **COMMON_2D_RULES,
        "src/game/state.ts": [
            (
                re.compile(r"\bscore\s*:"),
                "state should not define a default score field",
            ),
            (
                re.compile(r"\bbubbles?\b", re.IGNORECASE),
                "state examples should avoid bubble-game defaults",
            ),
            (
                re.compile(r"\bpinch(ed)?\b", re.IGNORECASE),
                "state examples should avoid fixed pinch-game defaults",
            ),
        ],
        "src/game/systems/render.ts": [
            (
                re.compile(r"\bbubbles?\b", re.IGNORECASE),
                "render examples should avoid bubble-game defaults",
            ),
            (
                re.compile(r"\bscore\b", re.IGNORECASE),
                "render examples should avoid score defaults",
            ),
        ],
        "src/App.tsx": [
            (
                re.compile(r"\bscore\b", re.IGNORECASE),
                "App shell comments should avoid score defaults",
            ),
            (
                re.compile(r"game[- ]over", re.IGNORECASE),
                "App shell comments should avoid game-over defaults",
            ),
        ],
    },
    "vr": {
        **COMMON_2D_RULES,
        "src/game/state.ts": [
            (
                re.compile(r"\bscore\s*:"),
                "state should not define a default score field",
            ),
            (
                re.compile(r"\btargets?\b", re.IGNORECASE),
                "state examples should avoid target-game defaults",
            ),
        ],
        "src/game/ui/Scene.tsx": [
            (
                re.compile(r"\bscore\b", re.IGNORECASE),
                "scene examples should avoid score defaults",
            ),
            (
                re.compile(r"\btargets?\b", re.IGNORECASE),
                "scene examples should avoid target-game defaults",
            ),
        ],
        "src/App.tsx": [
            (
                re.compile(r"\bscore\b", re.IGNORECASE),
                "App shell comments should avoid score defaults",
            ),
            (
                re.compile(r"game[- ]over", re.IGNORECASE),
                "App shell comments should avoid game-over defaults",
            ),
        ],
    },
    "3d": {
        "src/App.tsx": [
            (
                re.compile(r"\bMobileControlHud\b"),
                "3D starter should not mount visible mobile controls by default",
            ),
            (
                re.compile(r"\bsetActionHeld\b"),
                "3D starter should not default to visible action-button wiring",
            ),
        ],
        "src/three/game.ts": [
            (
                re.compile(r"收集|collected|collection", re.IGNORECASE),
                "3D runtime should not default to collection copy/state",
            ),
            (
                re.compile(r"重新开始|restart", re.IGNORECASE),
                "3D runtime should not default to restart copy",
            ),
            (
                re.compile(r"\bactionHeld\b"),
                "3D runtime should not default to action-button paths",
            ),
            (
                re.compile(r"\b(player|hero|character)\b", re.IGNORECASE),
                "3D starter should keep a neutral subject, not a player/hero/character",
            ),
            (
                re.compile(r"\b(collectible|pickup|reward|hazard)", re.IGNORECASE),
                "3D starter should avoid collectible/pickup/reward/hazard defaults",
            ),
        ],
        "src/game/schema.ts": [
            (
                re.compile(r"\bmoveSpeed\b"),
                "3D schema should not default to locomotion tuning",
            ),
        ],
    },
}


def check_mode(mode: str) -> list[str]:
    template = TEMPLATES_ROOT / mode
    errors: list[str] = []
    if not template.is_dir():
        return [f"template not found: {template}"]

    for rel, rules in MODE_RULES[mode].items():
        path = template / rel
        if not path.is_file():
            errors.append(f"{mode}/{rel}: file not found")
            continue
        text = path.read_text(encoding="utf-8")
        for pattern, message in rules:
            match = pattern.search(text)
            if match:
                line = text[: match.start()].count("\n") + 1
                errors.append(f"{mode}/{rel}:{line}: {message}")
    return errors


def check_global_rules() -> list[str]:
    errors: list[str] = []
    for rel, rules in GLOBAL_RULES.items():
        path = PLUGIN_ROOT / rel
        if not path.is_file():
            errors.append(f"{rel}: file not found")
            continue
        text = path.read_text(encoding="utf-8")
        for pattern, message in rules:
            match = pattern.search(text)
            if match:
                line = text[: match.start()].count("\n") + 1
                errors.append(f"{rel}:{line}: {message}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Check template neutrality.")
    # No default: a bare invocation must check EVERY mode, mirroring
    # check_template_capabilities.py. Defaulting to one mode silently green-lights
    # AR/VR/3D regressions in the rules below.
    parser.add_argument("--mode", choices=VALID_MODES)
    args = parser.parse_args()

    modes = [args.mode] if args.mode else list(VALID_MODES)
    errors = check_global_rules()
    for mode in modes:
        errors.extend(check_mode(mode))
    if errors:
        print("template neutrality check failed:")
        print("\n".join(f"- {error}" for error in errors))
        sys.exit(1)
    print(f"template neutrality check passed for {', '.join(modes)}")


if __name__ == "__main__":
    main()
