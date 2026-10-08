"use client";

import { Component, createRef, type ReactNode } from "react";

type Positions = Map<string, number>;

const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_OUT_QUART = "cubic-bezier(0.25, 1, 0.5, 1)";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * An <ol> whose items settle in as they arrive and glide when the order changes (FLIP).
 * Results are sorted best-first, so a newly checked trial often lands mid-list: the cards below
 * slide down to make room instead of jumping. Children must be <li data-key="..."> elements.
 * A class component because getSnapshotBeforeUpdate is React's moment to read the old layout.
 */
export class ArrivingList extends Component<{ children: ReactNode; className?: string; label: string }> {
  private list = createRef<HTMLOListElement>();

  private measure(): Positions {
    const positions: Positions = new Map();
    for (const el of Array.from(this.list.current?.children ?? []) as HTMLElement[]) {
      if (el.dataset.key) positions.set(el.dataset.key, el.offsetTop);
    }
    return positions;
  }

  componentDidMount() {
    this.animate(new Map());
  }

  getSnapshotBeforeUpdate(): Positions {
    return this.measure();
  }

  componentDidUpdate(_: unknown, __: unknown, before: Positions) {
    this.animate(before);
  }

  private animate(before: Positions) {
    if (reducedMotion() || !this.list.current) return;
    let arriving = 0;
    for (const el of Array.from(this.list.current.children) as HTMLElement[]) {
      const key = el.dataset.key;
      if (!key) continue;
      const was = before.get(key);
      if (was === undefined) {
        // New here: rise a few pixels into place, a short stagger when several land together.
        el.animate(
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 340, easing: EASE_OUT_EXPO, delay: Math.min(arriving++, 5) * 55, fill: "backwards" },
        );
      } else if (Math.abs(was - el.offsetTop) > 1) {
        el.animate([{ transform: `translateY(${was - el.offsetTop}px)` }, { transform: "none" }], {
          duration: 380,
          easing: EASE_OUT_QUART,
        });
      }
    }
  }

  render() {
    return (
      <ol ref={this.list} className={`relative ${this.props.className ?? ""}`} aria-label={this.props.label}>
        {this.props.children}
      </ol>
    );
  }
}
