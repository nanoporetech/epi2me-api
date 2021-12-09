import { expect } from 'chai';
import { Duration } from '../src/Duration';
import sinon from 'sinon';
import { TemporalUnit } from '../src/Duration.type';

function randomInteger(n: number) {
  return Math.floor(n * Math.random());
}

describe('duration', () => {
  it('Duration.Hours', () => {
    const value = randomInteger(1000);
    expect(Duration.Hours(value)).to.deep.equal({
      value,
      units: 3,
    });
  });
  it('Duration.Minutes', () => {
    const value = randomInteger(1000);
    expect(Duration.Minutes(value)).to.deep.equal({
      value,
      units: 2,
    });
  });
  it('Duration.Seconds', () => {
    const value = randomInteger(1000);
    expect(Duration.Seconds(value)).to.deep.equal({
      value,
      units: 1,
    });
  });
  it('Duration.Milliseconds', () => {
    const value = randomInteger(1000);
    expect(Duration.Milliseconds(value)).to.deep.equal({
      value,
      units: 0,
    });
  });
  it('Duration.ZERO', () => {
    expect(Duration.ZERO).to.deep.equal({
      value: 0,
      units: TemporalUnit.HOURS,
    });
  });
  it('Duration.FromDate(string)', () => {
    const now = new Date();
    expect(Duration.FromDate(now.toISOString())).to.deep.equal({
      value: now.getTime(),
      units: 0,
    });
  });
  it('Duration.FromDate(date)', () => {
    const now = new Date();
    expect(Duration.FromDate(now)).to.deep.equal({
      value: now.getTime(),
      units: 0,
    });
  });
  it('Duration.Delta', async () => {
    let counter = 0;
    const releaseStub = sinon.stub(Date, 'now').callsFake((): number => (counter += 100));
    after(() => releaseStub());

    const getDelta = Duration.Delta();
    expect(getDelta()).to.deep.eq({
      value: 100,
      units: 0,
    });
    expect(getDelta()).to.deep.eq({
      value: 200,
      units: 0,
    });
  });
  it('duration.milliseconds', () => {
    expect(Duration.Hours(1).milliseconds).to.equal(3600000);
    expect(Duration.Minutes(1).milliseconds).to.equal(60000);
    expect(Duration.Seconds(1).milliseconds).to.equal(1000);
    expect(Duration.Milliseconds(1).milliseconds).to.equal(1);
  });
  it('duration.seconds', () => {
    expect(Duration.Hours(1).seconds).to.equal(3600);
    expect(Duration.Minutes(1).seconds).to.equal(60);
    expect(Duration.Seconds(1).seconds).to.equal(1);
    expect(Duration.Milliseconds(1000).seconds).to.equal(1);
  });
  it('duration.minutes', () => {
    expect(Duration.Hours(1).minutes).to.equal(60);
    expect(Duration.Minutes(1).minutes).to.equal(1);
    expect(Duration.Seconds(60).minutes).to.equal(1);
    expect(Duration.Milliseconds(60000).minutes).to.equal(1);
  });
  it('duration.hours', () => {
    expect(Duration.Hours(1).hours).to.equal(1);
    expect(Duration.Minutes(60).hours).to.equal(1);
    expect(Duration.Seconds(3600).hours).to.equal(1);
    expect(Duration.Milliseconds(3600000).hours).to.equal(1);
  });
  it('duration.toDate', () => {
    const a = new Date();
    const now = Duration.Milliseconds(a.getTime());
    expect(now.toDate().getTime()).to.equal(a.getTime());
    a.setTime(a.getTime() + 3421);
    expect(now.toDate(3421).getTime()).to.equal(a.getTime());
  });
  it('duration.as', () => {
    const now = Duration.Milliseconds(Date.now());

    expect(now.as(TemporalUnit.MILLISECONDS)).to.equal(now.milliseconds);
    expect(now.as(TemporalUnit.SECONDS)).to.equal(now.seconds);
    expect(now.as(TemporalUnit.MINUTES)).to.equal(now.minutes);
    expect(now.as(TemporalUnit.HOURS)).to.equal(now.hours);
  });
  it('duration.clamp', () => {
    expect(Duration.Seconds(10).clamp(Duration.ZERO)).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 10,
    });
    expect(Duration.Minutes(1).clamp(Duration.ZERO, Duration.Seconds(5))).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 5,
    });
    expect(Duration.Seconds(10).clamp(null, Duration.Seconds(5))).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 5,
    });

    expect(Duration.Seconds(-10).clamp(Duration.ZERO)).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 0,
    });
    expect(Duration.Minutes(-1).clamp(Duration.ZERO, Duration.Seconds(5))).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 0,
    });
    expect(Duration.Seconds(10).clamp(null, Duration.Seconds(5))).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 5,
    });
  });
  it('duration.multiply', () => {
    expect(Duration.Seconds(20).multiply(3)).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 60,
    });
    expect(Duration.Hours(0.5).multiply(-2)).to.deep.equal({
      units: TemporalUnit.HOURS,
      value: -1,
    });
  });
  it('duration.subtract', () => {
    expect(Duration.Seconds(1).subtract(Duration.Milliseconds(1))).to.deep.equal({
      units: TemporalUnit.MILLISECONDS,
      value: 999,
    });
    expect(Duration.Seconds(2).subtract(Duration.Minutes(-1))).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: 62,
    });
  });
  it('duration.add', () => {
    expect(Duration.Seconds(1).add(Duration.Milliseconds(1))).to.deep.equal({
      units: TemporalUnit.MILLISECONDS,
      value: 1001,
    });
    expect(Duration.Seconds(2).add(Duration.Minutes(-1))).to.deep.equal({
      units: TemporalUnit.SECONDS,
      value: -58,
    });
  });
});
