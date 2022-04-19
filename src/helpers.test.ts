import assert from 'assert';
import type { InstanceAttribute } from './factory.type';
import { buildNestedUserDefined, validateAndAddAttribute } from './helpers';

describe('buildNestedUserDefined', () => {
  it('nests correctly', () => {
    const userDefinedParams = {
      '1_1_min_qscore': '8',
      '1_2_detect_barcode': 'Auto',
      '1_3_split': 'no',
    };

    assert.deepStrictEqual(buildNestedUserDefined(userDefinedParams), {
      1: {
        '1_1_min_qscore': '8',
        '1_2_detect_barcode': 'Auto',
        '1_3_split': 'no',
      },
    });
  });
});

describe('validateAndAddAttribute', () => {
  it('builds instance attributes', () => {
    const flowcell = 'FAL69641';
    const instanceAttributes: InstanceAttribute[] = [];
    const flowCellAttribute = {
      idAttribute: '5',
      name: 'flowcell',
      format: '^[\\w+-.#%\\[\\]()<>:]{1,254}$',
    };

    validateAndAddAttribute(flowcell, instanceAttributes, flowCellAttribute);
    assert.deepStrictEqual(instanceAttributes, [
      {
        id_attribute: '5',
        value: flowcell,
      },
    ]);
  });
});
