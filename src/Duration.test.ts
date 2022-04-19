import { Duration } from './Duration';
import sinon from 'sinon';
import { TemporalUnit } from './Duration.type';
import { isSinonStub } from './isStub';

function randomInteger(n: number) {
  return Math.floor(n * Math.random());
}

describe('duration', () => {
  afterEach(() => {
    const now = Date.now;
    if (isSinonStub(now)) {
      now.restore();
    }
  });
  it('Duration.Hours', () => {
    const value = randomInteger(1000);
    expect(Duration.Hours(value)).toEqual({
      value,
      units: 3,
    });
  });
  it('Duration.Minutes', () => {
    const value = randomInteger(1000);
    expect(Duration.Minutes(value)).toEqual({
      value,
      units: 2,
    });
  });
  it('Duration.Seconds', () => {
    const value = randomInteger(1000);
    expect(Duration.Seconds(value)).toEqual({
      value,
      units: 1,
    });
  });
  it('Duration.Milliseconds', () => {
    const value = randomInteger(1000);
    expect(Duration.Milliseconds(value)).toEqual({
      value,
      units: 0,
    });
  });
  it('Duration.ZERO', () => {
    expect(Duration.ZERO).toEqual({
      value: 0,
      units: TemporalUnit.HOURS,
    });
  });
  it('Duration.FromDate(string)', () => {
    const now = new Date();
    expect(Duration.FromDate(now.toISOString())).toEqual({
      value: now.getTime(),
      units: 0,
    });
  });
  it('Duration.FromDate(date)', () => {
    const now = new Date();
    expect(Duration.FromDate(now)).toEqual({
      value: now.getTime(),
      units: 0,
    });
  });
  it('Duration.Delta', async () => {
    let counter = 0;
    sinon.stub(Date, 'now').callsFake((): number => (counter += 100));

    const getDelta = Duration.Delta();
    expect(getDelta()).toEqual({
      value: 100,
      units: 0,
    });
    expect(getDelta()).toEqual({
      value: 200,
      units: 0,
    });
  });
  it('duration.milliseconds', () => {
    expect(Duration.Hours(1).milliseconds).toEqual(3600000);
    expect(Duration.Minutes(1).milliseconds).toEqual(60000);
    expect(Duration.Seconds(1).milliseconds).toEqual(1000);
    expect(Duration.Milliseconds(1).milliseconds).toEqual(1);
  });
  it('duration.seconds', () => {
    expect(Duration.Hours(1).seconds).toEqual(3600);
    expect(Duration.Minutes(1).seconds).toEqual(60);
    expect(Duration.Seconds(1).seconds).toEqual(1);
    expect(Duration.Milliseconds(1000).seconds).toEqual(1);
  });
  it('duration.minutes', () => {
    expect(Duration.Hours(1).minutes).toEqual(60);
    expect(Duration.Minutes(1).minutes).toEqual(1);
    expect(Duration.Seconds(60).minutes).toEqual(1);
    expect(Duration.Milliseconds(60000).minutes).toEqual(1);
  });
  it('duration.hours', () => {
    expect(Duration.Hours(1).hours).toEqual(1);
    expect(Duration.Minutes(60).hours).toEqual(1);
    expect(Duration.Seconds(3600).hours).toEqual(1);
    expect(Duration.Milliseconds(3600000).hours).toEqual(1);
  });
  it('duration.toDate', () => {
    const a = new Date();
    const now = Duration.Milliseconds(a.getTime());
    expect(now.toDate().getTime()).toEqual(a.getTime());
    a.setTime(a.getTime() + 3421);
    expect(now.toDate(3421).getTime()).toEqual(a.getTime());
  });
  it('duration.as', () => {
    const now = Duration.Milliseconds(Date.now());

    expect(now.as(TemporalUnit.MILLISECONDS)).toEqual(now.milliseconds);
    expect(now.as(TemporalUnit.SECONDS)).toEqual(now.seconds);
    expect(now.as(TemporalUnit.MINUTES)).toEqual(now.minutes);
    expect(now.as(TemporalUnit.HOURS)).toEqual(now.hours);
  });
  it('duration.clamp', () => {
    expect(Duration.Seconds(10).clamp(Duration.ZERO)).toEqual({
      units: TemporalUnit.SECONDS,
      value: 10,
    });
    expect(Duration.Minutes(1).clamp(Duration.ZERO, Duration.Seconds(5))).toEqual({
      units: TemporalUnit.SECONDS,
      value: 5,
    });
    expect(Duration.Seconds(10).clamp(null, Duration.Seconds(5))).toEqual({
      units: TemporalUnit.SECONDS,
      value: 5,
    });

    expect(Duration.Seconds(-10).clamp(Duration.ZERO)).toEqual({
      units: TemporalUnit.SECONDS,
      value: 0,
    });
    expect(Duration.Minutes(-1).clamp(Duration.ZERO, Duration.Seconds(5))).toEqual({
      units: TemporalUnit.SECONDS,
      value: 0,
    });
    expect(Duration.Seconds(10).clamp(null, Duration.Seconds(5))).toEqual({
      units: TemporalUnit.SECONDS,
      value: 5,
    });
  });
  it('duration.multiply', () => {
    expect(Duration.Seconds(20).multiply(3)).toEqual({
      units: TemporalUnit.SECONDS,
      value: 60,
    });
    expect(Duration.Hours(0.5).multiply(-2)).toEqual({
      units: TemporalUnit.HOURS,
      value: -1,
    });
  });
  it('duration.subtract', () => {
    expect(Duration.Seconds(1).subtract(Duration.Milliseconds(1))).toEqual({
      units: TemporalUnit.MILLISECONDS,
      value: 999,
    });
    expect(Duration.Seconds(2).subtract(Duration.Minutes(-1))).toEqual({
      units: TemporalUnit.SECONDS,
      value: 62,
    });
  });
  it('duration.add', () => {
    expect(Duration.Seconds(1).add(Duration.Milliseconds(1))).toEqual({
      units: TemporalUnit.MILLISECONDS,
      value: 1001,
    });
    expect(Duration.Seconds(2).add(Duration.Minutes(-1))).toEqual({
      units: TemporalUnit.SECONDS,
      value: -58,
    });
  });
});
