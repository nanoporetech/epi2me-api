import assert from 'assert';
import { validateAndAddAttribute } from '../../src/helpers';

describe('validateAndAddAttribute', () => {
  it('builds instance attributes', () => {
    const flowcell = 'FAL69641';
    // eslint-disable-next-line @typescript-eslint/camelcase
    const instance_attributes = [];
    const flowCellAttribute = {
      idAttribute: '5',
      name: 'flowcell',
      format: '^[\\w+-.#%\\[\\]()<>:]{1,254}$',
    };

    validateAndAddAttribute(flowcell, instance_attributes, flowCellAttribute);
    assert.deepStrictEqual(instance_attributes, [
      {
        id_attribute: '5',
        value: flowcell,
      },
    ]);
  });
});
