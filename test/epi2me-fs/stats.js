import assert from 'assert';
// import { BehaviorSubject } from 'rxjs';
// import { map, withLatestFrom } from 'rxjs/operators';
import EPI2ME from '../../src/epi2me-fs';

describe('epi2me.stats', () => {
  it('should stat', () => {
    const client = new EPI2ME({});

    assert.doesNotThrow(() => {
      client.stats();
    });
  });

  it('should stat a null value', () => {
    const client = new EPI2ME({});
    client.states = { fake: {} };
    assert.doesNotThrow(() => {
      // const stat =
      client.stats('fake');
      //      assert.deepEqual(stat, { queueLength: { files: 0 } });
    });
  });

  it('should stat a regular value', () => {
    const client = new EPI2ME({});
    client.states = { fake: { queueLength: { files: 10 } } };
    assert.doesNotThrow(() => {
      const stat = client.stats('fake');
      assert.deepEqual(stat, { queueLength: { files: 10 } });
    });
  });

  it('should stat special upload behaviour', () => {
    const client = new EPI2ME({});
    client.states = { upload: { total: {}, success: {} } };
    assert.doesNotThrow(() => {
      const stat = client.stats('upload');
      assert.deepEqual(stat, { total: {}, success: {} });
    });
  });

  it('should stat special upload behaviour with upload queue', () => {
    const client = new EPI2ME({});
    client.states = {
      upload: { total: {}, success: { files: 7 } },
    };

    assert.doesNotThrow(() => {
      const stat = client.stats('upload');
      assert.deepEqual(stat, { total: {}, success: { files: 7 } });
    });
  });

  it('live states', () => {
    const client = new EPI2ME({});
    let theState;
    const sub = client.liveStates$.subscribe((state) => {
      theState = state;
    });
    client.uploadState('progress', 'incr', {
      total: 100,
    });
    assert.equal(theState.upload.progress.total, 100);
    client.uploadState('progress', 'incr', {
      total: 200,
    });
    assert.equal(theState.upload.progress.total, 300);
    sub.unsubscribe();
  });
  it('running states', () => {
    const client = new EPI2ME({});
    let theState;
    // client.startSubscription();
    client.uploadState$.next(true);
    client.analyseState$.next(true);
    // Subscribe here because this is what actually happens
    const sub = client.runningStates$.subscribe((state) => {
      theState = state;
    });
    assert.deepEqual(theState, [true, true, false]);
    client.reportState$.next(true);
    assert.deepEqual(theState, [true, true, true]);
    sub.unsubscribe();
    // client.stopSubscription();
  });
  // it('does', () => {
  //   let theState;
  //   const userAnalysis$ = new BehaviorSubject([]);
  //   const runningInstance = new EPI2ME({});
  //   const mergedSub = runningInstance.runningStates$.pipe(
  //     // withLatestFrom provides the last value from another observable
  //     withLatestFrom(userAnalysis$),
  //     map(([updatedState, existingAnalysis]) => {
  //       // Perform merge
  //       console.log('UPDATED STATE: ', updatedState);
  //       theState = updatedState;
  //       return existingAnalysis.map(analysis => {
  //         if (analysis.idWorkflowInstance.toString() === runningInstance.config.instance.id_workflow_instance) {
  //           // Set instance status
  //           analysis.status = [updatedState.uploading, updatedState.analysing, updatedState.telemetry];
  //         }
  //         return analysis;
  //       });
  //     }),
  //   );
  //   const runningSub = mergedSub.subscribe(
  //     // Push out new array
  //     {
  //       next: updatedArray => {
  //         console.log(updatedArray);
  //         // this.userAnalysis$.next(updatedArray);
  //       },
  //     },
  //   );
  //   runningInstance.runningStates$.next({ uploading: true });
  //   runningInstance.runningStates$.next({ analysing: true });
  //   assert.deepEqual(theState, { uploading: true, analysing: true, telemetry: false });
  // });
});
