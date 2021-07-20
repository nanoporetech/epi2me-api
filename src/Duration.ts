import type { Nullish, Optional } from 'ts-runtime-typecheck';
import { TemporalUnit } from './Duration.type';

export class Duration<T extends TemporalUnit = TemporalUnit> {
  private constructor(readonly units: T, readonly value: number) {}

  add(other: Duration): Duration {
    const commonUnit: TemporalUnit = Math.min(this.units, other.units);
    const a = this.as(commonUnit);
    const b = other.as(commonUnit);
    return new Duration(commonUnit, a + b);
  }

  subtract(other: Duration): Duration {
    const commonUnit: TemporalUnit = Math.min(this.units, other.units);
    const a = this.as(commonUnit);
    const b = other.as(commonUnit);
    return new Duration(commonUnit, a - b);
  }

  multiply(factor: number): Duration<T> {
    return new Duration(this.units, this.value * factor);
  }

  clamp(min: Duration): Duration;
  clamp(min: Nullish, max: Duration): Duration;
  clamp(min: Duration, max: Duration): Duration;
  clamp(min: Optional<Duration>, max?: Duration): Duration {
    let commonUnit: TemporalUnit = this.units;
    if (min) {
      commonUnit = Math.min(commonUnit, min.units);
    }
    if (max) {
      commonUnit = Math.min(commonUnit, max.units);
    }
    const a = this.as(commonUnit);
    const b = min ? min.as(commonUnit) : a;
    const c = max ? max.as(commonUnit) : Math.max(a, b);

    return new Duration(commonUnit, Math.min(Math.max(a, b), c));
  }

  as(units: TemporalUnit): number {
    switch (units) {
      case TemporalUnit.MILLISECONDS:
        return this.milliseconds;
      case TemporalUnit.SECONDS:
        return this.seconds;
      case TemporalUnit.MINUTES:
        return this.minutes;
      case TemporalUnit.HOURS:
        return this.hours;
    }
  }

  toDate(epoch = 0): Date {
    return new Date(this.milliseconds + epoch);
  }

  get milliseconds(): number {
    const { value, units } = this;
    switch (units as TemporalUnit) {
      case TemporalUnit.MILLISECONDS:
        return value;
      case TemporalUnit.SECONDS:
        return value * 1000;
      case TemporalUnit.MINUTES:
        return value * 60000;
      case TemporalUnit.HOURS:
        return value * 3600000;
    }
  }

  get seconds(): number {
    const { value, units } = this;
    switch (units as TemporalUnit) {
      case TemporalUnit.MILLISECONDS:
        return value / 1000;
      case TemporalUnit.SECONDS:
        return value;
      case TemporalUnit.MINUTES:
        return value * 60;
      case TemporalUnit.HOURS:
        return value * 3600;
    }
  }

  get minutes(): number {
    const { value, units } = this;
    switch (units as TemporalUnit) {
      case TemporalUnit.MILLISECONDS:
        return value / 60000;
      case TemporalUnit.SECONDS:
        return value / 60;
      case TemporalUnit.MINUTES:
        return value;
      case TemporalUnit.HOURS:
        return value * 60;
    }
  }

  get hours(): number {
    const { value, units } = this;
    switch (units as TemporalUnit) {
      case TemporalUnit.MILLISECONDS:
        return value / 3600000;
      case TemporalUnit.SECONDS:
        return value / 3600;
      case TemporalUnit.MINUTES:
        return value / 60;
      case TemporalUnit.HOURS:
        return value;
    }
  }

  static Delta(): () => Duration<TemporalUnit.MILLISECONDS> {
    const start = Date.now();
    return () => {
      const delta = Date.now() - start;
      return Duration.Milliseconds(delta);
    };
  }

  static Hours(value: number): Duration<TemporalUnit.HOURS> {
    return new Duration(TemporalUnit.HOURS, value);
  }

  static Minutes(value: number): Duration<TemporalUnit.MINUTES> {
    return new Duration(TemporalUnit.MINUTES, value);
  }

  static Seconds(value: number): Duration<TemporalUnit.SECONDS> {
    return new Duration(TemporalUnit.SECONDS, value);
  }

  static Milliseconds(value: number): Duration<TemporalUnit.MILLISECONDS> {
    return new Duration(TemporalUnit.MILLISECONDS, value);
  }

  static FromDate(value: Date | string): Duration<TemporalUnit.MILLISECONDS> {
    const date = value instanceof Date ? value : new Date(value);
    return new Duration(TemporalUnit.MILLISECONDS, date.getTime());
  }

  // NOTE we use the largest possible unit here, as most operations choose the
  // highest common unit ( effectively causing it to choose a smaller unit )
  // so this will preserve higher units when used in operations
  static ZERO = Duration.Hours(0);
}
