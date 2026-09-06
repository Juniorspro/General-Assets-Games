import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useEffect, useRef, useState } from 'react';

import type { Input } from '../runtime/runtime-3d';

export interface MobileControlHudActionButton {
  label?: string;
  ariaLabel?: string;
  onPress?: () => void;
  onRelease?: () => void;
}

export interface MobileControlHudLayout {
  joystickSide?: 'left' | 'right';
  actionSide?: 'left' | 'right';
  joystickRadius?: number;
  bottomInset?: number;
  sideInset?: number;
  actionButtonSize?: number;
  actionButtonGap?: number;
}

export interface MobileControlHudProps {
  input: Input;
  primaryAction?: MobileControlHudActionButton;
  extraButtons?: MobileControlHudActionButton[];
  layout?: MobileControlHudLayout;
}

type HudPointerEvent<T extends HTMLElement = HTMLElement> = ReactPointerEvent<T>;

type Point = { x: number; y: number };

const DEFAULT_LAYOUT: Required<MobileControlHudLayout> = {
  joystickSide: 'left',
  actionSide: 'right',
  joystickRadius: 58,
  bottomInset: 28,
  sideInset: 24,
  actionButtonSize: 64,
  actionButtonGap: 12,
};

function stopHudPointerEvent(event: HudPointerEvent): void {
  // 所有操控 HUD 交互区都必须阻断冒泡，避免触发画布上的 world drag 视角控制。
  event.stopPropagation();
  event.preventDefault();
}

function stopHudClickEvent(event: ReactMouseEvent<HTMLElement>): void {
  event.stopPropagation();
  event.preventDefault();
}

function clampJoystickVector(deltaX: number, deltaY: number, radius: number): Point {
  const safeRadius = Math.max(1, radius);
  const normalizedX = deltaX / safeRadius;
  const normalizedY = deltaY / safeRadius;
  const length = Math.hypot(normalizedX, normalizedY);

  if (length <= 1) {
    return { x: normalizedX, y: normalizedY };
  }

  return { x: normalizedX / length, y: normalizedY / length };
}

function mergeLayout(layout?: MobileControlHudLayout): Required<MobileControlHudLayout> {
  return { ...DEFAULT_LAYOUT, ...layout };
}

function releasePointerCapture(element: HTMLElement, pointerId: number): void {
  if (element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
}

function HudActionButton({
  button,
  size,
  isPrimary = false,
  input,
}: {
  button: MobileControlHudActionButton;
  size: number;
  isPrimary?: boolean;
  input: Input;
}) {
  const activePointerIdRef = useRef<number | null>(null);

  const clearButtonState = (): void => {
    activePointerIdRef.current = null;
    // 主按钮隐藏或卸载时也要释放 held；额外按钮不写 setActionHeld。
    if (isPrimary) {
      input.setActionHeld(false);
    }
  };

  useEffect(() => {
    const clearWhenHidden = (): void => {
      if (document.visibilityState === 'hidden') {
        clearButtonState();
      }
    };

    document.addEventListener('visibilitychange', clearWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', clearWhenHidden);
      clearButtonState();
    };
  }, [input, isPrimary]);

  const pressButton = (event: HudPointerEvent<HTMLButtonElement>): void => {
    stopHudPointerEvent(event);
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    // 主按钮是唯一写入 setActionHeld 的按钮；玩法语义由调用方或系统读取 actionHeld 后自行解释。
    if (isPrimary) {
      input.setActionHeld(true);
    }
    button.onPress?.();
  };

  const releaseButton = (event: HudPointerEvent<HTMLButtonElement>): void => {
    stopHudPointerEvent(event);
    if (activePointerIdRef.current !== event.pointerId) return;

    releasePointerCapture(event.currentTarget, event.pointerId);
    activePointerIdRef.current = null;

    // 额外按钮只触发回调，绝不写 setActionHeld，避免越界扩展 Input 多 held 状态。
    if (isPrimary) {
      input.setActionHeld(false);
    }
    button.onRelease?.();
  };

  const stopPointerOnly = (event: HudPointerEvent<HTMLButtonElement>): void => {
    stopHudPointerEvent(event);
  };

  const buttonStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.42)',
    background: 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.34), rgba(10, 18, 28, 0.72))',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.34), inset 0 0 18px rgba(255, 255, 255, 0.12)',
    color: '#f8fbff',
    font: '600 13px/1.15 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    letterSpacing: '0.04em',
    pointerEvents: 'auto',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <button
      type="button"
      aria-label={button.ariaLabel ?? button.label ?? (isPrimary ? '操作按钮' : '附加操作按钮')}
      style={buttonStyle}
      onPointerDown={pressButton}
      onPointerMove={stopPointerOnly}
      onPointerUp={releaseButton}
      onPointerCancel={releaseButton}
      onPointerLeave={releaseButton}
      onLostPointerCapture={releaseButton}
      onClick={stopHudClickEvent}
    >
      {/* 不引入静态品牌/标题文案；仅在调用方传入 label 时显示按钮文案。 */}
      {button.label ?? null}
    </button>
  );
}

export function MobileControlHud({
  input,
  primaryAction = {},
  extraButtons = [],
  layout,
}: MobileControlHudProps) {
  const {
    joystickSide,
    actionSide,
    joystickRadius,
    bottomInset,
    sideInset,
    actionButtonSize,
    actionButtonGap,
  } = mergeLayout(layout);
  const activeJoystickPointerIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<Point>({ x: 0, y: 0 });
  const [joystickVector, setJoystickVector] = useState<Point>({ x: 0, y: 0 });

  const resetJoystick = (): void => {
    activeJoystickPointerIdRef.current = null;
    setJoystickVector({ x: 0, y: 0 });
    input.setMobileMove(0, 0);
  };

  const updateJoystick = (event: HudPointerEvent<HTMLDivElement>): void => {
    const nextVector = clampJoystickVector(
      event.clientX - joystickCenterRef.current.x,
      event.clientY - joystickCenterRef.current.y,
      joystickRadius,
    );
    setJoystickVector(nextVector);
    // 摇杆固定写入 setMobileMove，保持 y-down 输入约定：上推为负 y，下推为正 y。
    input.setMobileMove(nextVector.x, nextVector.y);
  };

  const pressJoystick = (event: HudPointerEvent<HTMLDivElement>): void => {
    stopHudPointerEvent(event);
    if (activeJoystickPointerIdRef.current !== null) return;

    const rect = event.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + (rect.width / 2),
      y: rect.top + (rect.height / 2),
    };
    activeJoystickPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event);
  };

  const moveJoystick = (event: HudPointerEvent<HTMLDivElement>): void => {
    stopHudPointerEvent(event);
    if (activeJoystickPointerIdRef.current !== event.pointerId) return;
    updateJoystick(event);
  };

  const releaseJoystick = (event: HudPointerEvent<HTMLDivElement>): void => {
    stopHudPointerEvent(event);
    if (activeJoystickPointerIdRef.current !== event.pointerId) return;

    releasePointerCapture(event.currentTarget, event.pointerId);
    resetJoystick();
  };

  useEffect(() => {
    const resetInputState = (): void => {
      input.setMobileMove(0, 0);
      input.setActionHeld(false);
      activeJoystickPointerIdRef.current = null;
      setJoystickVector({ x: 0, y: 0 });
    };

    const resetWhenHidden = (): void => {
      if (document.visibilityState === 'hidden') {
        resetInputState();
      }
    };

    document.addEventListener('visibilitychange', resetWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', resetWhenHidden);
      // 卸载时复位移动与主按钮 held，防止页面切换后输入状态粘连。
      input.setMobileMove(0, 0);
      input.setActionHeld(false);
    };
  }, [input]);

  const joystickContainerStyle: CSSProperties = {
    position: 'absolute',
    bottom: bottomInset,
    [joystickSide]: sideInset,
    width: joystickRadius * 2,
    height: joystickRadius * 2,
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.32)',
    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.16), rgba(8, 16, 26, 0.48))',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28), inset 0 0 24px rgba(255, 255, 255, 0.08)',
    pointerEvents: 'auto',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const knobSize = Math.max(34, joystickRadius * 0.72);
  const knobTravel = Math.max(0, joystickRadius - (knobSize / 2));
  const joystickKnobStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: knobSize,
    height: knobSize,
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.58)',
    background: 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.62), rgba(88, 199, 255, 0.5), rgba(10, 22, 34, 0.72))',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.32), inset 0 0 16px rgba(255, 255, 255, 0.18)',
    transform: `translate(calc(-50% + ${joystickVector.x * knobTravel}px), calc(-50% + ${joystickVector.y * knobTravel}px))`,
    pointerEvents: 'none',
  };

  const actionStackStyle: CSSProperties = {
    position: 'absolute',
    bottom: bottomInset,
    [actionSide]: sideInset,
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: actionButtonGap,
    alignItems: 'center',
    pointerEvents: 'none',
  };

  return (
    <div
      aria-hidden={false}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}
    >
      <div
        role="application"
        aria-label="移动摇杆"
        style={joystickContainerStyle}
        onPointerDown={pressJoystick}
        onPointerMove={moveJoystick}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
        onLostPointerCapture={releaseJoystick}
        onClick={stopHudClickEvent}
      >
        <div style={joystickKnobStyle} />
      </div>

      <div style={actionStackStyle}>
        <HudActionButton button={primaryAction} size={actionButtonSize} isPrimary input={input} />
        {extraButtons.map((button, buttonIndex) => (
          <HudActionButton
            key={`${button.ariaLabel ?? button.label ?? 'extra'}-${buttonIndex}`}
            button={button}
            size={Math.max(44, actionButtonSize * 0.78)}
            input={input}
          />
        ))}
      </div>
    </div>
  );
}
