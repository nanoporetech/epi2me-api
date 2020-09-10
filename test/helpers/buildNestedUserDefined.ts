import assert from 'assert';
import { buildNestedUserDefined } from '../../src/helpers';

describe('buildNestedUserDefined', () => {
  it('nests correctly', () => {
    const userDefinedParams = {
      '1_1_min_qscore': '8',
      '1_2_detect_barcode': 'Auto',
      '1_3_split': 'no',
    };

    assert.deepEqual(buildNestedUserDefined(userDefinedParams), {
      1: {
        '1_1_min_qscore': '8',
        '1_2_detect_barcode': 'Auto',
        '1_3_split': 'no',
      },
    });
  });
});
