import { ObjectDict } from './ObjectDict';
import { Index } from './runtime-typecast';

import type { InstanceAttribute } from './factory.type';
/*
Helper methods that are likely to be used by any applicaton using API.
*/

export function buildNestedUserDefined(flatUserDefined: ObjectDict): ObjectDict<ObjectDict> {
  // User defined params need to be nested before sending to the server, this achieves that
  // TODO: Use this in agent3
  return Object.entries(flatUserDefined).reduce((prev, [key, value]) => {
    const searchResults = /^(\d+)_.+?/g.exec(key);
    if (!searchResults) {
      return prev;
    }
    const componentId = searchResults[1];
    return {
      ...prev,
      [componentId]: {
        ...(prev[componentId] || {}),
        [key]: value,
      },
    };
  }, {} as ObjectDict<ObjectDict>);
}

export function validateAndAddAttribute(
  attributeValue: string,
  instanceAttributes: InstanceAttribute[],
  attributeDef: { idAttribute: Index; format: string },
): void {
  // eslint-disable-next-line @typescript-eslint/camelcase
  const { format, idAttribute: id_attribute } = attributeDef;
  const valueRE = new RegExp(format, 'g');
  attributeValue &&
    valueRE.test(attributeValue) &&
    instanceAttributes.push({
      id_attribute,
      value: attributeValue,
    });
}
