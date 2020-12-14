import assert from 'assert';
import { validateAndAddAttribute } from '../../src/helpers';

describe('validateAndAddAttribute', () => {
  it('builds instance attributes', () => {
    const flowcell = 'FAL69641';
    const instanceAttributes = [];
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
